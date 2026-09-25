/**
 * DTDC B2C rate cards, shared by the courier seed (full re-seed) and the
 * targeted SL4041 pricing seed.
 *
 * `DEFAULT_RATE_CARDS` is a placeholder card used by accounts that don't have
 * their own numbers (SL2850, SL1404). `RATE_CARDS_BY_CUSTOMER_CODE` lets a
 * specific franchise account carry its OWN card — keyed by customerCode. Add a
 * row there when an account negotiates distinct rates.
 *
 * Replace the placeholder numbers with the real DTDC rate card when provided.
 */

// ── Zone ordering: must match the order zones are listed in b2c_zones table ──
export const ZONE_MAP = [
  "WITHIN_CITY", // z1
  "WITHIN_STATE", // z2
  "WITHIN_REGION", // z3
  "METRO_TO_METRO", // z4
  "SPECIAL_ZONE", // z5
  "ROI", // z6
] as const;

export type DtdcServiceTypeId =
  | "B2C PRIORITY"
  | "B2C PREMIUM"
  | "B2C SMART EXPRESS"
  | "B2C GROUND ECONOMY";

export type RateCard = {
  mode: "express" | "surface";
  codCharges: number;
  codPercent: number;
  slabs: Array<{
    minKg: number;
    maxKg: number | null;
    forward: [number, number, number, number, number, number];
    rto: [number, number, number, number, number, number];
  }>;
};

export type RateCardSet = Record<DtdcServiceTypeId, RateCard>;

/**
 * Default placeholder card — plausible market-shaped numbers, NOT a real DTDC
 * card. Used by SL2850 / SL1404.
 *
 *   Priority         → air, fastest (TAT 2)  → highest
 *   Premium          → air         (TAT 4)
 *   Smart Express    → surface-exp (TAT 3)
 *   Ground Economy   → surface     (TAT 4)  → cheapest
 */
export const DEFAULT_RATE_CARDS: RateCardSet = {
  "B2C PRIORITY": {
    mode: "express",
    codCharges: 35,
    codPercent: 1.5,
    slabs: [
      { minKg: 0.5, maxKg: 1.0, forward: [38, 44, 48, 54, 72, 58], rto: [15, 22, 24, 27, 36, 29] },
      { minKg: 1.0, maxKg: null, forward: [62, 72, 78, 88, 116, 94], rto: [25, 36, 39, 44, 58, 47] },
    ],
  },
  "B2C PREMIUM": {
    mode: "express",
    codCharges: 30,
    codPercent: 1.3,
    slabs: [
      { minKg: 0.5, maxKg: 1.0, forward: [34, 40, 44, 50, 66, 54], rto: [14, 20, 22, 25, 33, 27] },
      { minKg: 1.0, maxKg: null, forward: [55, 64, 71, 80, 105, 86], rto: [22, 32, 35, 40, 53, 43] },
    ],
  },
  "B2C SMART EXPRESS": {
    mode: "surface",
    codCharges: 25,
    codPercent: 1.2,
    slabs: [
      { minKg: 0.5, maxKg: 1.0, forward: [30, 36, 39, 44, 58, 48], rto: [12, 18, 20, 22, 29, 24] },
      { minKg: 1.0, maxKg: null, forward: [48, 58, 63, 70, 93, 77], rto: [19, 29, 31, 35, 47, 38] },
    ],
  },
  "B2C GROUND ECONOMY": {
    mode: "surface",
    codCharges: 22,
    codPercent: 1.0,
    slabs: [
      { minKg: 0.5, maxKg: 1.0, forward: [24, 30, 33, 38, 50, 42], rto: [10, 15, 17, 19, 25, 21] },
      { minKg: 1.0, maxKg: null, forward: [38, 48, 53, 60, 80, 67], rto: [16, 24, 27, 30, 40, 34] },
    ],
  },
};

/**
 * Per-account rate cards keyed by DTDC customerCode. An account listed here
 * uses its own card instead of DEFAULT_RATE_CARDS.
 *
 * SL4041: PLACEHOLDER numbers — distinct from the default card (priced ~5-10%
 * below it as a stand-in) so the account renders its own rates. Replace with
 * the real SL4041 rate card when DTDC provides it.
 */
export const RATE_CARDS_BY_CUSTOMER_CODE: Record<string, RateCardSet> = {
  SL4041: {
    "B2C PRIORITY": {
      mode: "express",
      codCharges: 32,
      codPercent: 1.4,
      slabs: [
        { minKg: 0.5, maxKg: 1.0, forward: [36, 42, 46, 52, 68, 55], rto: [14, 21, 23, 26, 34, 28] },
        { minKg: 1.0, maxKg: null, forward: [58, 68, 74, 84, 110, 90], rto: [24, 34, 37, 42, 55, 45] },
      ],
    },
    "B2C PREMIUM": {
      mode: "express",
      codCharges: 28,
      codPercent: 1.2,
      slabs: [
        { minKg: 0.5, maxKg: 1.0, forward: [32, 38, 42, 48, 62, 51], rto: [13, 19, 21, 24, 31, 26] },
        { minKg: 1.0, maxKg: null, forward: [52, 61, 67, 76, 100, 82], rto: [21, 30, 33, 38, 50, 41] },
      ],
    },
    "B2C SMART EXPRESS": {
      mode: "surface",
      codCharges: 23,
      codPercent: 1.1,
      slabs: [
        { minKg: 0.5, maxKg: 1.0, forward: [28, 34, 37, 42, 55, 45], rto: [11, 17, 19, 21, 27, 23] },
        { minKg: 1.0, maxKg: null, forward: [45, 55, 60, 67, 88, 73], rto: [18, 27, 29, 33, 44, 36] },
      ],
    },
    "B2C GROUND ECONOMY": {
      mode: "surface",
      codCharges: 20,
      codPercent: 0.9,
      slabs: [
        { minKg: 0.5, maxKg: 1.0, forward: [22, 28, 31, 36, 47, 40], rto: [9, 14, 16, 18, 24, 20] },
        { minKg: 1.0, maxKg: null, forward: [36, 45, 50, 57, 76, 64], rto: [15, 23, 25, 28, 38, 32] },
      ],
    },
  },
};

/**
 * DTDC B2C service catalog from the serviceability API. Pushed to a courier's
 * `metaData.rawResponse` so the rate/availability/booking layers can read TAT,
 * serviceCode, and COD/lite flags without re-hitting the API. Single source of
 * truth for what each service IS (the rate cards above are what each COSTS).
 *
 * Smart Express and Ground Economy don't return a `serviceCode` from DTDC.
 */
export const DTDC_SERVICES = [
  {
    serviceType: "B2C PRIORITY",
    TAT: 2,
    period: "Couldn't Fetch TAT!",
    serviceCode: "P7X",
    serviceTypeId: "B2C PRIORITY",
    isCodServiceable: true,
    isLiteServiceable: true,
  },
  {
    serviceType: "B2C PREMIUM",
    TAT: 4,
    period: "Couldn't Fetch TAT!",
    serviceCode: "V71",
    serviceTypeId: "B2C PREMIUM",
    isCodServiceable: true,
    isLiteServiceable: true,
  },
  {
    serviceType: "B2C SMART EXPRESS",
    TAT: 3,
    period: "Couldn't Fetch TAT!",
    serviceTypeId: "B2C SMART EXPRESS",
    isCodServiceable: true,
    isLiteServiceable: true,
  },
  {
    serviceType: "B2C GROUND ECONOMY",
    TAT: 4,
    period: "Couldn't Fetch TAT!",
    serviceTypeId: "B2C GROUND ECONOMY",
    isCodServiceable: true,
    isLiteServiceable: true,
  },
] as const;

/** "B2C PRIORITY" → "Priority" (the label used in courier display names). */
export function prettyServiceName(serviceTypeId: string): string {
  return serviceTypeId
    .replace(/^B2C\s+/i, "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolve a DTDC service type from a courier display name
 * (e.g. "DTDC Ground Economy (DTDC-SL4041)" → "B2C GROUND ECONOMY"). Used to
 * key pricing/repair off the name, which is stable, rather than off metaData,
 * which can drift. Returns null if no service label matches.
 */
export function serviceTypeFromName(name: string): DtdcServiceTypeId | null {
  for (const svc of DTDC_SERVICES) {
    if (name.includes(prettyServiceName(svc.serviceTypeId))) {
      return svc.serviceTypeId;
    }
  }
  return null;
}

/** Returns the rate-card set for a customerCode, falling back to the default. */
export function rateCardsFor(customerCode: string | null | undefined): RateCardSet {
  if (customerCode && RATE_CARDS_BY_CUSTOMER_CODE[customerCode]) {
    return RATE_CARDS_BY_CUSTOMER_CODE[customerCode];
  }
  return DEFAULT_RATE_CARDS;
}

/**
 * Build the b2c_pricing JSONB payload (weightSlabs + per-zone slabRates) for a
 * single courier from its rate card. `zoneIdMap` maps a zone code → zone id.
 */
export function buildPricingPayload(card: RateCard, zoneIdMap: Record<string, string>) {
  const weightSlabs = card.slabs.map((s) => ({ minWeight: s.minKg, maxWeight: s.maxKg }));
  const zoneRates = ZONE_MAP.map((code, zIdx) => ({
    zone: zoneIdMap[code],
    slabRates: card.slabs.map((slab) => ({
      forward: slab.forward[zIdx],
      rto: slab.rto[zIdx],
      codCharges: card.codCharges,
      codPercent: card.codPercent,
    })),
  }));
  return { mode: card.mode, otherCharges: "0", weightSlabs, zoneRates };
}
