import { and, asc, eq, gte, lte, isNull, or, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  b2bAdditionalCharges,
  b2bPincodes,
  b2bZoneRates,
  b2bZones,
  couriers,
} from "../db/schema.js";
import { checkServiceability } from "./serviceability.js";
import logger from "../config/logger.js";
import { brandFor } from "../config/courierBrands.js";
import { AppError } from "../utils/AppError.js";

const TAG = "[B2bRateCalculation]";

export class B2bRateError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "B2bRateError";
  }
}

// ── DB row aliases ──
type AdditionalChargesRow = typeof b2bAdditionalCharges.$inferSelect;
type B2bPincodeRow = typeof b2bPincodes.$inferSelect;

// The legacy IB2bPincodeFlags type lived in models/B2bPincode.ts. Schema stores
// it as untyped jsonb, so we keep a structural type here for the flags blob.
interface B2bPincodeFlags {
  isOda?: boolean;
  isRemote?: boolean;
  isMall?: boolean;
  isSez?: boolean;
  isCsd?: boolean;
  isAirport?: boolean;
  isHighSecurity?: boolean;
}

// ── Input / Output types ──

export interface B2bPackageInput {
  weight: number; // kg
  length: number; // cm
  breadth: number; // cm
  height: number; // cm
}

export interface B2bRateParams {
  origin: string;
  destination: string;
  packages: B2bPackageInput[];
  paymentType: "prepaid" | "cod";
  orderAmount: number;
  plan?: string;
  declaredValue?: number;
  isInsurance?: boolean;
  isTimeSpecificDelivery?: boolean;
  isHolidayPickup?: boolean;
}

export interface B2bOverheadItem {
  code: string;
  name: string;
  type: string;
  amount: number;
}

export interface B2bRateResult {
  baseFreight: number;
  overheads: B2bOverheadItem[];
  rtoRate: number;
  total: number;
  billableWeight: number;
  packages: Array<{
    deadWeight: number;
    volumetricWeight: number;
    billableWeight: number;
  }>;
}

export interface B2bAvailableCourier {
  courierId: string;
  name: string;
  serviceProvider: string;
  /** `service_providers.id` — the account this rate is bound to. */
  serviceProviderId: string;
  serviceProviderDisplayName: string;
  logo: string | null;
  zone: { originCode: string; originName: string; destinationCode: string; destinationName: string };
  billableWeight: number;
  packages: Array<{
    deadWeight: number;
    volumetricWeight: number;
    billableWeight: number;
  }>;
  rate: B2bRateResult;
  tag?: "economy" | "fastest";
}

// ── Helpers ──

/** Coerce a numeric column (stored as string in pg) to a number. */
function num(v: string | number | null | undefined, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  return typeof v === "string" ? Number(v) || fallback : v;
}

function resolveHandlingCharge(
  tiers: AdditionalChargesRow["handlingCharges"],
  weightKg: number,
): number {
  if (!tiers || tiers.length === 0) return 0;
  for (const tier of tiers) {
    if (weightKg >= tier.min && weightKg <= tier.max) {
      return tier.charge;
    }
  }
  // If weight exceeds all tiers, use the highest tier
  const sorted = [...tiers].sort((a, b) => b.max - a.max);
  if (weightKg > sorted[0].max) return sorted[0].charge;
  return 0;
}

function calculateOverheads(
  charges: AdditionalChargesRow,
  baseFreight: number,
  billableWeight: number,
  orderAmount: number,
  destPincode: B2bPincodeRow,
  opts: {
    paymentType: "prepaid" | "cod";
    declaredValue?: number;
    isInsurance?: boolean;
    isTimeSpecificDelivery?: boolean;
    isHolidayPickup?: boolean;
  },
): B2bOverheadItem[] {
  const overheads: B2bOverheadItem[] = [];
  const flags = (destPincode.flags ?? {}) as B2bPincodeFlags;

  // 1. AWB charges (always applied)
  const awbCharges = num(charges.awbCharges);
  if (awbCharges > 0) {
    overheads.push({ code: "AWB", name: "AWB Charges", type: "flat", amount: awbCharges });
  }

  // 2. COD charges (only if COD)
  if (opts.paymentType === "cod") {
    const codByFlat = num(charges.codChargesFlat);
    const codByPercent = (num(charges.codPercent) / 100) * orderAmount;
    // NOTE: schema has no codMinimum column — gap noted in migration report.
    const codAmount = codByFlat + codByPercent;
    if (codAmount > 0) {
      overheads.push({ code: "COD", name: "COD Charges", type: "calculated", amount: codAmount });
    }
  }

  // 3. Handling charges (weight-tiered)
  const handlingCharge = resolveHandlingCharge(charges.handlingCharges, billableWeight);
  if (handlingCharge > 0) {
    overheads.push({ code: "HANDLING", name: "Handling Charges", type: "tiered", amount: handlingCharge });
  }

  // 4. ODA charges (if destination is ODA). Schema collapses ODA into a single
  // `odaCharges` (was odaChargesFlat + odaChargesPerKg) — flat-only here.
  if (flags.isOda) {
    const odaAmount = num(charges.odaCharges);
    if (odaAmount > 0) {
      overheads.push({ code: "ODA", name: "ODA Charges", type: "conditional", amount: odaAmount });
    }
  }

  // 5. CSD/Mall/Time-specific/Holiday — not represented in the new schema.
  // Stash any matching extras{} keys if a future migration restores them.

  // 7. Fuel surcharge (% of base freight)
  const fuelSurchargePercent = num(charges.fuelSurchargePercent);
  if (fuelSurchargePercent > 0) {
    const fuelAmount = (fuelSurchargePercent / 100) * baseFreight;
    overheads.push({ code: "FUEL", name: "Fuel Surcharge", type: "percent", amount: Math.round(fuelAmount * 100) / 100 });
  }

  // 8. Green tax (flat)
  const greenTax = num(charges.greenTax);
  if (greenTax > 0) {
    overheads.push({ code: "GREEN_TAX", name: "Green Tax", type: "flat", amount: greenTax });
  }

  // 9. ROV / Insurance (if insurance requested). schema has no rovMinimum.
  if (opts.isInsurance && opts.declaredValue) {
    const rovByPercent = (num(charges.rovPercent) / 100) * opts.declaredValue;
    if (rovByPercent > 0) {
      overheads.push({ code: "ROV", name: "Return of Value / Insurance", type: "calculated", amount: rovByPercent });
    }
  }

  return overheads;
}

// ── Main ──

export async function fetchB2bAvailableCouriers(
  params: B2bRateParams,
): Promise<B2bAvailableCourier[]> {
  const start = Date.now();
  const {
    origin,
    destination,
    packages,
    paymentType,
    orderAmount,
    plan = "basic",
  } = params;

  logger.info(`${TAG} Fetching B2B couriers — ${origin} → ${destination} (${packages.length} boxes, ${paymentType})`);

  if (!packages || packages.length === 0) {
    throw new B2bRateError(400, "At least one package/box is required");
  }

  // 1. Get all B2B-enabled couriers. businessType is jsonb<string[]> in schema —
  // use a Postgres jsonb-contains comparison.
  const b2bCouriers = await db
    .select()
    .from(couriers)
    .where(
      and(
        eq(couriers.isEnabled, true),
        sql`${couriers.businessType} @> '["b2b"]'::jsonb`,
      ),
    );

  if (b2bCouriers.length === 0) {
    logger.warn(`${TAG} No B2B couriers enabled`);
    return [];
  }

  // 2. Run API serviceability check (manual-courier support removed for
  // Dream Services). Results are per-account; we then bind each courier to
  // its specific account via `couriers.metaData.serviceProviderId`.
  const totalWeightG = packages.reduce((sum, p) => sum + p.weight * 1000, 0);
  const { byAccountId, accounts } = await checkServiceability({
    origin,
    destination,
    weight: totalWeightG,
    paymentType,
    orderAmount,
  });

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const serviceableAccountIds = new Set<string>();
  for (const account of accounts) {
    if (byAccountId.get(account.id)?.serviceable) serviceableAccountIds.add(account.id);
  }

  // Bind couriers to their specific account and keep only the ones whose
  // account is serviceable for this route.
  type BoundCourier = typeof b2bCouriers[number] & { accountId: string };
  const serviceableCouriers: BoundCourier[] = [];
  for (const c of b2bCouriers) {
    const meta = (c.metaData ?? {}) as Record<string, unknown>;
    const boundAccountId = typeof meta.serviceProviderId === "string" ? meta.serviceProviderId : null;
    if (!boundAccountId) {
      logger.warn(`${TAG} B2B courier "${c.name}" has no metaData.serviceProviderId — skipping`);
      continue;
    }
    if (!serviceableAccountIds.has(boundAccountId)) continue;
    serviceableCouriers.push({ ...c, accountId: boundAccountId });
  }

  if (serviceableCouriers.length === 0) {
    logger.info(`${TAG} No serviceable B2B couriers for ${origin} → ${destination}`);
    return [];
  }

  // 3. For each serviceable courier, look up B2B pincodes and compute rates
  const results: B2bAvailableCourier[] = [];

  for (const courier of serviceableCouriers) {
    try {
      // 3a. Look up origin and destination pincodes for this courier
      const [originPin, destPin] = await Promise.all([
        db.query.b2bPincodes.findFirst({
          where: and(
            eq(b2bPincodes.pincode, origin),
            eq(b2bPincodes.courierId, courier.id),
            eq(b2bPincodes.isActive, true),
          ),
        }),
        db.query.b2bPincodes.findFirst({
          where: and(
            eq(b2bPincodes.pincode, destination),
            eq(b2bPincodes.courierId, courier.id),
            eq(b2bPincodes.isActive, true),
          ),
        }),
      ]);

      if (!originPin || !destPin) {
        logger.info(`${TAG} ${courier.name}: pincode not mapped (origin: ${!!originPin}, dest: ${!!destPin})`);
        continue;
      }

      // 3b. Get zone details
      const [originZone, destZone] = await Promise.all([
        db.query.b2bZones.findFirst({ where: eq(b2bZones.id, originPin.zoneId) }),
        db.query.b2bZones.findFirst({ where: eq(b2bZones.id, destPin.zoneId) }),
      ]);

      if (!originZone || !destZone || !originZone.isActive || !destZone.isActive) continue;

      // 3c. Get zone-to-zone rate. The schema has effectiveFrom/effectiveTo
      // nullable, so emulate the "currently effective" predicate explicitly.
      const now = new Date();
      const zoneRate = await db.query.b2bZoneRates.findFirst({
        where: and(
          eq(b2bZoneRates.plan, plan),
          eq(b2bZoneRates.courierId, courier.id),
          eq(b2bZoneRates.originZoneId, originPin.zoneId),
          eq(b2bZoneRates.destinationZoneId, destPin.zoneId),
          eq(b2bZoneRates.isActive, true),
          or(isNull(b2bZoneRates.effectiveFrom), lte(b2bZoneRates.effectiveFrom, now)),
          or(isNull(b2bZoneRates.effectiveTo), gte(b2bZoneRates.effectiveTo, now)),
        ),
      });

      const ratePerKg = num(zoneRate?.ratePerKg, 0);
      if (!zoneRate || ratePerKg <= 0) {
        logger.info(`${TAG} ${courier.name}: no rate configured for ${originZone.code} → ${destZone.code}`);
        continue;
      }

      // 3d. Get additional charges
      const additionalCharges = await db.query.b2bAdditionalCharges.findFirst({
        where: and(
          eq(b2bAdditionalCharges.plan, plan),
          eq(b2bAdditionalCharges.courierId, courier.id),
          eq(b2bAdditionalCharges.isActive, true),
        ),
      });

      // 3e. Calculate weight per package
      const volumetricDivisor = zoneRate.volumetricDivisor ?? 5000;
      const packageDetails = packages.map((pkg) => {
        const deadWeight = pkg.weight; // kg
        const volumetricWeight = (pkg.length * pkg.breadth * pkg.height) / volumetricDivisor;
        const billableWeight = Math.max(deadWeight, volumetricWeight);
        return { deadWeight, volumetricWeight, billableWeight };
      });

      let totalBillableWeight = packageDetails.reduce((sum, p) => sum + p.billableWeight, 0);

      // Apply minimum chargeable weight
      const minChargeableWeight = num(additionalCharges?.minimumChargeableWeight);
      if (additionalCharges && minChargeableWeight > 0) {
        totalBillableWeight = Math.max(totalBillableWeight, minChargeableWeight);
      }

      // Round up to nearest 0.5 kg
      totalBillableWeight = Math.ceil(totalBillableWeight * 2) / 2;

      // 3f. Calculate base freight
      let baseFreight = ratePerKg * totalBillableWeight;

      // Apply minimum chargeable amount
      const minChargeableAmount = num(additionalCharges?.minimumChargeableAmount);
      if (additionalCharges && minChargeableAmount > 0) {
        baseFreight = Math.max(baseFreight, minChargeableAmount);
      }

      baseFreight = Math.round(baseFreight * 100) / 100;

      // 3g. Calculate RTO rate
      const rtoRatePerKg = num(zoneRate.rtoRatePerKg);
      const rtoRate = Math.round(rtoRatePerKg * totalBillableWeight * 100) / 100;

      // 3h. Calculate overheads
      const overheads = additionalCharges
        ? calculateOverheads(additionalCharges, baseFreight, totalBillableWeight, orderAmount, destPin, {
            paymentType,
            declaredValue: params.declaredValue,
            isInsurance: params.isInsurance,
            isTimeSpecificDelivery: params.isTimeSpecificDelivery,
            isHolidayPickup: params.isHolidayPickup,
          })
        : [];

      // 3i. Total
      const overheadTotal = overheads.reduce((sum, o) => sum + o.amount, 0);
      const total = Math.round((baseFreight + overheadTotal) * 100) / 100;

      if (total <= 0) continue;

      const account = accountById.get(courier.accountId);
      const brand = brandFor(account?.slug ?? courier.serviceProvider);
      results.push({
        courierId: courier.id,
        name: courier.name,
        serviceProvider: courier.serviceProvider,
        serviceProviderId: account?.id ?? courier.accountId,
        serviceProviderDisplayName: brand.name,
        logo: courier.logo || brand.logoUrl || null,
        zone: {
          originCode: originZone.code,
          originName: originZone.name,
          destinationCode: destZone.code,
          destinationName: destZone.name,
        },
        billableWeight: totalBillableWeight,
        packages: packageDetails,
        rate: {
          baseFreight,
          overheads,
          rtoRate,
          total,
          billableWeight: totalBillableWeight,
          packages: packageDetails,
        },
        tag: undefined,
      });
    } catch (err) {
      logger.warn(`${TAG} Error calculating rate for ${courier.name}: ${(err as Error).message}`);
      continue;
    }
  }

  // 4. Sort by total (economy first)
  results.sort((a, b) => a.rate.total - b.rate.total);

  // 5. Tag economy and fastest
  if (results.length > 0) {
    results[0].tag = "economy";
    if (results.length > 1) {
      results[results.length - 1].tag = "fastest";
    }
  }

  logger.info(
    `${TAG} Done — ${results.length} B2B courier(s) available${results.length > 0 ? ` [cheapest: ${results[0].name} ₹${results[0].rate.total}]` : ""} (${Date.now() - start}ms)`,
  );

  // unused-import suppressions for narrow conditionals above
  void asc;

  return results;
}
