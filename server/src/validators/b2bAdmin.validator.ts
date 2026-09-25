import { body, param, query } from "express-validator";

// ── ZONES ──

export const createB2bZoneValidation = [
  body("code").isString().trim().notEmpty().withMessage("Zone code is required"),
  body("name").isString().trim().notEmpty().withMessage("Zone name is required"),
  body("description").optional().isString().trim(),
];

export const updateB2bZoneValidation = [
  param("id").isUUID().withMessage("Valid zone ID is required"),
  body("code").optional().isString().trim(),
  body("name").optional().isString().trim(),
  body("description").optional().isString().trim(),
  body("isActive").optional().isBoolean(),
];

export const b2bZoneIdValidation = [
  param("id").isUUID().withMessage("Valid zone ID is required"),
];

// ── PINCODES ──

export const listB2bPincodesValidation = [
  query("pincode").optional().isString(),
  query("zone").optional().isUUID(),
  query("courier").optional().isUUID(),
  query("serviceProvider").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 500 }),
];

export const createB2bPincodeValidation = [
  body("pincode").isString().isLength({ min: 6, max: 6 }).withMessage("Valid 6-digit pincode required"),
  body("city").isString().trim().notEmpty().withMessage("City is required"),
  body("state").isString().trim().notEmpty().withMessage("State is required"),
  body("zone").isUUID().withMessage("Valid zone ID required"),
  body("courier").isUUID().withMessage("Valid courier ID required"),
  body("serviceProvider").isString().trim().notEmpty().withMessage("Service provider slug required"),
  body("flags").optional().isObject(),
  body("flags.isOda").optional().isBoolean(),
  body("flags.isRemote").optional().isBoolean(),
  body("flags.isMall").optional().isBoolean(),
  body("flags.isSez").optional().isBoolean(),
  body("flags.isCsd").optional().isBoolean(),
  body("flags.isAirport").optional().isBoolean(),
  body("flags.isHighSecurity").optional().isBoolean(),
];

export const b2bPincodeIdValidation = [
  param("id").isUUID().withMessage("Valid pincode ID is required"),
];

export const bulkImportB2bPincodesValidation = [
  body("pincodes").isArray({ min: 1 }).withMessage("pincodes array is required"),
  body("pincodes.*.pincode").isString().isLength({ min: 6, max: 6 }),
  body("pincodes.*.city").isString().trim().notEmpty(),
  body("pincodes.*.state").isString().trim().notEmpty(),
  body("pincodes.*.zone").isUUID(),
  body("pincodes.*.courier").isUUID(),
  body("pincodes.*.serviceProvider").isString().trim().notEmpty(),
];

// ── ZONE RATES ──

export const listB2bZoneRatesValidation = [
  query("courier").optional().isUUID(),
  query("plan").optional().isString(),
  query("originZone").optional().isUUID(),
  query("destinationZone").optional().isUUID(),
];

export const upsertB2bZoneRateValidation = [
  body("plan").isString().trim().notEmpty().withMessage("Plan is required"),
  body("courier").isUUID().withMessage("Valid courier ID required"),
  body("originZone").isUUID().withMessage("Valid origin zone ID required"),
  body("destinationZone").isUUID().withMessage("Valid destination zone ID required"),
  body("serviceProvider").isString().trim().notEmpty().withMessage("Service provider slug required"),
  body("ratePerKg").isFloat({ min: 0 }).withMessage("ratePerKg must be non-negative"),
  body("rtoRatePerKg").optional().isFloat({ min: 0 }),
  body("volumetricDivisor").optional().isFloat({ min: 1 }),
  body("effectiveFrom").optional().isISO8601(),
  body("effectiveTo").optional({ values: "falsy" }).isISO8601(),
  body("isActive").optional().isBoolean(),
];

export const batchUpsertB2bZoneRatesValidation = [
  body("rates").isArray({ min: 1 }).withMessage("rates array is required"),
  body("rates.*.plan").isString().trim().notEmpty(),
  body("rates.*.courier").isUUID(),
  body("rates.*.originZone").isUUID(),
  body("rates.*.destinationZone").isUUID(),
  body("rates.*.serviceProvider").isString().trim().notEmpty(),
  body("rates.*.ratePerKg").isFloat({ min: 0 }),
];

export const b2bZoneRateIdValidation = [
  param("id").isUUID().withMessage("Valid zone rate ID is required"),
];

// ── ADDITIONAL CHARGES ──

export const listB2bAdditionalChargesValidation = [
  query("courier").optional().isUUID(),
  query("plan").optional().isString(),
];

export const upsertB2bAdditionalChargesValidation = [
  body("plan").isString().trim().notEmpty().withMessage("Plan is required"),
  body("courier").isUUID().withMessage("Valid courier ID required"),
  body("serviceProvider").isString().trim().notEmpty().withMessage("Service provider slug required"),

  body("awbCharges").optional().isFloat({ min: 0 }),
  body("minimumChargeableWeight").optional().isFloat({ min: 0 }),
  body("minimumChargeableAmount").optional().isFloat({ min: 0 }),
  body("codChargesFlat").optional().isFloat({ min: 0 }),
  body("codPercent").optional().isFloat({ min: 0 }),
  body("codMinimum").optional().isFloat({ min: 0 }),
  body("fuelSurchargePercent").optional().isFloat({ min: 0 }),
  body("greenTax").optional().isFloat({ min: 0 }),
  body("odaChargesFlat").optional().isFloat({ min: 0 }),
  body("odaChargesPerKg").optional().isFloat({ min: 0 }),
  body("csdCharges").optional().isFloat({ min: 0 }),
  body("mallDeliveryCharges").optional().isFloat({ min: 0 }),
  body("handlingCharges").optional().isArray(),
  body("handlingCharges.*.minWeight").optional().isFloat({ min: 0 }),
  body("handlingCharges.*.maxWeight").optional().isFloat({ min: 0 }),
  body("handlingCharges.*.charge").optional().isFloat({ min: 0 }),
  body("rovPercent").optional().isFloat({ min: 0 }),
  body("rovMinimum").optional().isFloat({ min: 0 }),
  body("demurrageFreeHours").optional().isFloat({ min: 0 }),
  body("demurragePerHour").optional().isFloat({ min: 0 }),
  body("demurrageMaxDays").optional().isFloat({ min: 0 }),
  body("timeSpecificDeliveryCharge").optional().isFloat({ min: 0 }),
  body("holidayPickupCharge").optional().isFloat({ min: 0 }),
];

export const b2bAdditionalChargeIdValidation = [
  param("id").isUUID().withMessage("Valid additional charge ID is required"),
];

// ── RATE CALCULATOR ──

export const calculateB2bRateValidation = [
  body("origin").isString().isLength({ min: 6, max: 6 }).withMessage("Valid 6-digit origin pincode required"),
  body("destination").isString().isLength({ min: 6, max: 6 }).withMessage("Valid 6-digit destination pincode required"),
  body("packages").isArray({ min: 1 }).withMessage("At least one package required"),
  body("packages.*.weight").isFloat({ min: 0.01 }),
  body("packages.*.length").isFloat({ min: 0.1 }),
  body("packages.*.breadth").isFloat({ min: 0.1 }),
  body("packages.*.height").isFloat({ min: 0.1 }),
  body("paymentType").isIn(["prepaid", "cod"]),
  body("orderAmount").isFloat({ min: 0 }),
  body("plan").optional().isString(),
  body("declaredValue").optional().isFloat({ min: 0 }),
  body("isInsurance").optional().isBoolean(),
  body("isTimeSpecificDelivery").optional().isBoolean(),
  body("isHolidayPickup").optional().isBoolean(),
];
