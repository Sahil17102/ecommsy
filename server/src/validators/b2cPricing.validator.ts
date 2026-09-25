import { body, param, query } from "express-validator";

export const listPricingValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 500 })
    .toInt()
    .withMessage("limit must be 1-500"),
  query("plan")
    .optional()
    .isString()
    .trim()
    .toLowerCase()
    .withMessage("plan must be a string"),
  query("courier")
    .optional()
    .isUUID()
    .withMessage("courier must be a valid ID"),
  query("serviceProvider")
    .optional()
    .isString()
    .trim()
    .withMessage("serviceProvider must be a string"),
  query("mode")
    .optional()
    .isIn(["air", "surface"])
    .withMessage("mode must be air or surface"),
  query("minWeight")
    .optional()
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage("minWeight must be a non-negative number"),
];

const weightSlabsValidation = [
  body("weightSlabs")
    .isArray({ min: 1 })
    .withMessage("weightSlabs must be a non-empty array"),
  body("weightSlabs.*.minWeight")
    .isFloat({ min: 0 })
    .withMessage("Slab minWeight must be a non-negative number"),
  body("weightSlabs.*.maxWeight")
    .custom((v) => v === null || (typeof v === "number" && v > 0))
    .withMessage("Slab maxWeight must be null or a positive number"),
  body("weightSlabs").custom((slabs: { minWeight: number; maxWeight: number | null }[]) => {
    for (let i = 0; i < slabs.length; i++) {
      const s = slabs[i];
      if (s.maxWeight !== null && s.maxWeight <= s.minWeight) {
        throw new Error(`Slab ${i + 1}: maxWeight must be greater than minWeight`);
      }
      if (i > 0) {
        const prev = slabs[i - 1];
        if (prev.maxWeight === null) {
          throw new Error(`Slab ${i}: only the last slab can be open-ended`);
        }
        if (s.minWeight !== prev.maxWeight) {
          throw new Error(`Slab ${i + 1}: minWeight must equal previous slab's maxWeight`);
        }
      }
    }
    return true;
  }),
];

const zoneRatesValidation = (path: string) => [
  body(path).isArray().withMessage(`${path} must be an array`),
  body(`${path}.*.zone`)
    .isUUID()
    .withMessage("Each zone rate must have a valid zone ID"),
  body(`${path}.*.slabRates`)
    .isArray()
    .withMessage("slabRates must be an array"),
  body(`${path}.*.slabRates.*.forward`)
    .isFloat({ min: 0 })
    .withMessage("Forward rate must be a non-negative number"),
  body(`${path}.*.slabRates.*.rto`)
    .isFloat({ min: 0 })
    .withMessage("RTO rate must be a non-negative number"),
  body(`${path}.*.slabRates.*.codCharges`)
    .isFloat({ min: 0 })
    .withMessage("codCharges must be a non-negative number"),
  body(`${path}.*.slabRates.*.codPercent`)
    .isFloat({ min: 0, max: 100 })
    .withMessage("codPercent must be between 0 and 100"),
];

export const upsertPricingValidation = [
  body("courierId").isUUID().withMessage("Valid courier ID is required"),
  body("plan")
    .isString()
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("Plan slug is required"),
  body("mode")
    .isIn(["air", "surface"])
    .withMessage("Mode must be air or surface"),
  body("otherCharges")
    .isFloat({ min: 0 })
    .withMessage("Other charges must be a non-negative number"),
  ...weightSlabsValidation,
  ...zoneRatesValidation("zoneRates"),
];

export const batchUpsertPricingValidation = [
  body("courierId").isUUID().withMessage("Valid courier ID is required"),
  body("mode")
    .isIn(["air", "surface"])
    .withMessage("Mode must be air or surface"),
  body("otherCharges")
    .isFloat({ min: 0 })
    .withMessage("Other charges must be a non-negative number"),
  ...weightSlabsValidation,
  body("planRates")
    .isObject()
    .withMessage("planRates must be an object keyed by plan slug"),
];

export const pricingIdValidation = [
  param("id").isUUID().withMessage("Invalid pricing ID"),
];

export const courierIdParamValidation = [
  param("courierId").isUUID().withMessage("Invalid courier ID"),
];
