import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { locations, b2cZones, b2cPricing, couriers } from "../db/schema.js";
import { determineB2CZone } from "../utils/determineB2CZone.js";
import { checkServiceability } from "./serviceability.js";
import logger from "../config/logger.js";
import { brandFor } from "../config/courierBrands.js";
import { AppError } from "../utils/AppError.js";

const TAG = "[CourierAvailability]";

export class CourierAvailabilityError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "CourierAvailabilityError";
  }
}

export interface AvailableCourierParams {
  origin: string;
  destination: string;
  weight: number; // in grams
  length?: number; // cm
  breadth?: number; // cm
  height?: number; // cm
  paymentType: "prepaid" | "cod";
  orderAmount?: number;
  orderType?: "B2B" | "B2C";
  plan?: string;
}

export interface CourierRate {
  forward: number;
  rto: number;
  codCharges: number;
  otherCharges: number;
  freightCharge: number;
  totalCharge: number;
}

export interface AvailableCourier {
  courierId: string;
  name: string;
  /** `service_providers.id` of the account that will fulfil this rate. */
  serviceProviderId: string;
  /** Integration slug (e.g. "xpressbees"). */
  serviceProvider: string;
  /** Account display name (e.g. "Expressbees-2"). */
  serviceProviderDisplayName: string;
  logo: string | null;
  mode: "air" | "surface";
  zone: { code: string; name: string };
  chargeableWeight: number; // grams
  minWeight: number; // grams (slab size)
  rate: CourierRate;
  tag?: "economy" | "fastest";
}

function calculateChargeableWeight(
  actualWeightG: number,
  length?: number,
  breadth?: number,
  height?: number,
): number {
  const volumetricG =
    length && breadth && height ? (length * breadth * height) / 5 : 0;
  return Math.max(actualWeightG, volumetricG);
}

function findSlabIndex(
  chargeableWeightG: number,
  slabs: { minWeight: number; maxWeight: number | null }[],
): number {
  return slabs.findIndex(
    (s) =>
      chargeableWeightG >= s.minWeight &&
      (s.maxWeight === null || chargeableWeightG <= s.maxWeight),
  );
}

function calculateCodCharges(
  paymentType: "prepaid" | "cod",
  codChargesFlat: number,
  codPercent: number,
  orderAmount: number,
): number {
  if (paymentType !== "cod") return 0;
  return codChargesFlat + (codPercent / 100) * orderAmount;
}

export async function fetchAvailableCouriers(
  params: AvailableCourierParams,
): Promise<AvailableCourier[]> {
  const start = Date.now();
  const {
    origin,
    destination,
    weight,
    length,
    breadth,
    height,
    paymentType,
    orderAmount = 0,
    plan = "basic",
  } = params;

  logger.info(
    `${TAG} Fetching couriers — ${origin} → ${destination} (${weight}g, ${paymentType}${orderAmount ? `, ₹${orderAmount}` : ""})`,
  );

  // 1. Look up origin and destination locations
  const [originLoc, destLoc] = await Promise.all([
    db.query.locations.findFirst({
      where: and(eq(locations.pincode, origin), eq(locations.isActive, true)),
    }),
    db.query.locations.findFirst({
      where: and(eq(locations.pincode, destination), eq(locations.isActive, true)),
    }),
  ]);

  if (!originLoc) {
    logger.warn(`${TAG} Origin pincode ${origin} not found in coverage`);
    throw new CourierAvailabilityError(400, `Origin pincode ${origin} not found in our coverage`);
  }
  if (!destLoc) {
    logger.warn(`${TAG} Destination pincode ${destination} not found in coverage`);
    throw new CourierAvailabilityError(400, `Destination pincode ${destination} not found in our coverage`);
  }

  // 2. Determine zone — adapt rows to the shape determineB2CZone expects.
  const zoneInput = (loc: { city: string | null; state: string | null; tags: string[] | null }) => ({
    city: loc.city ?? "",
    state: loc.state ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tags: (loc.tags ?? []) as any,
  });
  const zoneCode = determineB2CZone(zoneInput(originLoc), zoneInput(destLoc));
  const zone = await db.query.b2cZones.findFirst({
    where: and(eq(b2cZones.code, zoneCode), eq(b2cZones.isActive, true)),
  });

  if (!zone) {
    logger.warn(`${TAG} Zone ${zoneCode} is not active`);
    throw new CourierAvailabilityError(400, `Zone ${zoneCode} is not active`);
  }

  logger.info(`${TAG} Zone resolved — ${zoneCode} (${zone.name})`);

  // 3. Serviceability per account
  const { byAccountId, accounts } = await checkServiceability({
    origin,
    destination,
    weight,
    length,
    breadth,
    height,
    paymentType,
    orderAmount,
  });

  // 4. Build per-account lookup maps for the accounts that passed
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  // For aggregator-style providers that return a serviceableCouriers list,
  // capture which courier names are allowed per account.
  const serviceableCouriersByAccount = new Map<string, Set<string>>();
  const serviceableCourierIdsByAccount = new Map<string, Set<string>>();
  const serviceableAccountIds = new Set<string>();

  for (const account of accounts) {
    const result = byAccountId.get(account.id);
    if (!result || !result.serviceable) continue;
    serviceableAccountIds.add(account.id);
    if (result.serviceableCouriers?.length) {
      serviceableCouriersByAccount.set(
        account.id,
        new Set(result.serviceableCouriers.map((n) => n.toLowerCase())),
      );
    }
    if (result.serviceableCourierIds?.length) {
      serviceableCourierIdsByAccount.set(
        account.id,
        new Set(result.serviceableCourierIds.map((id) => String(id).toLowerCase())),
      );
    }
  }

  logger.info(
    `${TAG} Serviceable accounts: ${
      [...serviceableAccountIds].map((id) => accountById.get(id)?.name ?? id).join(", ") || "none"
    }`,
  );

  // 5. Calculate chargeable weight
  const chargeableWeight = calculateChargeableWeight(weight, length, breadth, height);
  logger.info(`${TAG} Chargeable weight: ${Math.ceil(chargeableWeight)}g (actual: ${weight}g)`);

  // Filter by businessType jsonb array when orderType is specified.
  const businessTypeKey = params.orderType ? params.orderType.toLowerCase() : undefined;

  // Pull every enabled courier so we can match against accounts via metaData.
  const courierConditions = [eq(couriers.isEnabled, true)];
  if (businessTypeKey) {
    courierConditions.push(
      sql`${couriers.businessType} ? ${businessTypeKey}` as unknown as ReturnType<typeof eq>,
    );
  }

  const allCourierRows = await db
    .select({
      id: couriers.id,
      name: couriers.name,
      serviceProvider: couriers.serviceProvider,
      logo: couriers.logo,
      metaData: couriers.metaData,
    })
    .from(couriers)
    .where(and(...courierConditions));

  // 6. Bind each courier to its specific account (via metaData.serviceProviderId).
  // Couriers without a binding are skipped with a warning — admin needs to set it.
  type BoundCourier = {
    id: string;
    name: string;
    serviceProvider: string;
    logo: string | null;
    accountId: string;
  };

  const boundCouriers: BoundCourier[] = [];
  for (const c of allCourierRows) {
    const meta = (c.metaData ?? {}) as Record<string, unknown>;
    const boundAccountId = typeof meta.serviceProviderId === "string" ? meta.serviceProviderId : null;

    if (!boundAccountId) {
      logger.warn(
        `${TAG} Courier "${c.name}" (slug=${c.serviceProvider}) has no metaData.serviceProviderId — skipping. Edit the courier in admin to bind it to a service-provider account.`,
      );
      continue;
    }

    const account = accountById.get(boundAccountId);
    if (!account) {
      logger.warn(
        `${TAG} Courier "${c.name}" bound to inactive/missing account ${boundAccountId} — skipping.`,
      );
      continue;
    }

    if (!serviceableAccountIds.has(boundAccountId)) {
      continue; // account not serviceable for this route
    }

    // For aggregator providers, also enforce per-courier-name filter.
    const allowedNames = serviceableCouriersByAccount.get(boundAccountId);
    const allowedIds = serviceableCourierIdsByAccount.get(boundAccountId);
    const dreamzCourierId =
      typeof meta.dreamzCourierId === "string" ? meta.dreamzCourierId.toLowerCase() : null;
    if (allowedIds && dreamzCourierId && !allowedIds.has(dreamzCourierId)) {
      logger.warn(
        `${TAG} ${c.name} (${account.name}) dropped — Dreamz courier ID ${dreamzCourierId} not in aggregator's serviceable ID list`,
      );
      continue;
    }
    if (!allowedIds && allowedNames && !allowedNames.has(c.name.toLowerCase())) {
      logger.warn(
        `${TAG} ${c.name} (${account.name}) dropped — not in aggregator's serviceable list [${[...allowedNames].join(", ")}]`,
      );
      continue;
    }

    boundCouriers.push({
      id: c.id,
      name: c.name,
      serviceProvider: c.serviceProvider,
      logo: c.logo,
      accountId: boundAccountId,
    });
  }

  logger.info(
    `${TAG} Couriers passing account filter: ${boundCouriers.length} [${boundCouriers.map((c) => `${c.name}@${accountById.get(c.accountId)?.name}`).join(", ") || "—"}]`,
  );

  if (boundCouriers.length === 0) {
    logger.warn(`${TAG} No couriers passed pre-pricing filters — pricing lookup will be empty`);
  }

  // 7. Pricing lookup — zone match happens in-memory since zoneRates is jsonb.
  const pricingDocs = boundCouriers.length > 0
    ? await db
        .select()
        .from(b2cPricing)
        .where(
          and(
            inArray(b2cPricing.courierId, boundCouriers.map((c) => c.id)),
            eq(b2cPricing.plan, plan),
          ),
        )
    : [];

  logger.info(
    `${TAG} Found ${pricingDocs.length} pricing entries for zone ${zoneCode} (plan=${plan}, couriers=${boundCouriers.length})`,
  );

  // 8. Build results
  const courierMap = new Map(boundCouriers.map((c) => [c.id, c]));
  const results: AvailableCourier[] = [];

  for (const pricing of pricingDocs) {
    const courier = courierMap.get(pricing.courierId);
    if (!courier) continue;
    const account = accountById.get(courier.accountId);
    if (!account) continue;

    const zoneRates = pricing.zoneRates ?? [];
    const zoneRate = zoneRates.find((zr) => zr.zone === zone.id || zr.zone === zone.code);
    if (!zoneRate) continue;

    const weightSlabs = pricing.weightSlabs ?? [];
    const slabIdx = findSlabIndex(chargeableWeight, weightSlabs);
    if (slabIdx === -1) {
      logger.warn(
        `${TAG} Skipping ${courier.name} — chargeable weight ${chargeableWeight}g out of slab range`,
      );
      continue;
    }
    const slab = weightSlabs[slabIdx];
    const slabRate = zoneRate.slabRates?.[slabIdx];
    if (!slabRate) {
      logger.warn(
        `${TAG} Skipping ${courier.name} — slab rate missing for slab ${slabIdx + 1}`,
      );
      continue;
    }

    const freightCharge = slabRate.forward;
    const codCharges = calculateCodCharges(paymentType, slabRate.codCharges, slabRate.codPercent, orderAmount);
    const otherCharges = Number(pricing.otherCharges ?? 0);
    const totalCharge = freightCharge + codCharges + otherCharges;

    if (totalCharge <= 0) {
      logger.warn(`${TAG} Skipping ${courier.name} — zero/negative total charge (fwd=${slabRate.forward}, slab=${slab.minWeight}-${slab.maxWeight ?? "∞"})`);
      continue;
    }

    const brand = brandFor(account.slug);
    results.push({
      courierId: courier.id,
      name: courier.name,
      serviceProviderId: account.id,
      serviceProvider: account.slug,
      serviceProviderDisplayName: brand.name,
      logo: courier.logo || brand.logoUrl || null,
      mode: (pricing.mode as "air" | "surface" | null) ?? "surface",
      zone: { code: zone.code, name: zone.name },
      chargeableWeight: Math.ceil(chargeableWeight),
      minWeight: slab.minWeight,
      rate: {
        forward: slabRate.forward,
        rto: slabRate.rto,
        codCharges,
        otherCharges,
        freightCharge,
        totalCharge,
      },
    });
  }

  // 9. Sort by total charge (economy first)
  results.sort((a, b) => a.rate.totalCharge - b.rate.totalCharge);

  // 10. Tag economy and fastest
  if (results.length > 0) {
    results[0].tag = "economy";
    const expressCourier = results.find((c) => c.mode === "air");
    if (expressCourier && expressCourier !== results[0]) {
      expressCourier.tag = "fastest";
    }
  }

  logger.info(
    `${TAG} Done — ${results.length} courier(s) available${results.length > 0 ? ` [cheapest: ${results[0].name}@${results[0].serviceProviderDisplayName} ₹${results[0].rate.totalCharge}]` : ""} (${Date.now() - start}ms)`,
  );

  return results;
}
