import { body, param } from "express-validator";
import { ADDRESS_ROLES } from "../services/pickupAddress.js";
import { regex } from "../config/regex.js";

// ── Helpers ──

type Condition = (value: unknown, meta: { req: any }) => boolean;

/** Condition: RTO address is different from pickup (isSameAsRto === false) */
const isRtoDifferent: Condition = (_value, { req }) =>
  req.body?.isSameAsRto === false;

// ── Shared field chains ──
// When a condition is provided, .if() is placed BEFORE validators so they only
// run when the condition is truthy. Optional fields skip the condition since
// they pass validation regardless.

const addressFieldChains = (prefix = "", condition?: Condition) => {
  const p = prefix ? `${prefix}.` : "";
  const f = (field: string) => {
    const c = body(`${p}${field}`);
    return condition ? c.if(condition) : c;
  };
  return [
    f("contactName").isString().trim().notEmpty().withMessage("Contact name is required"),
    f("phone").isString().trim().matches(regex.phone).withMessage("Valid 10-digit phone required"),
    f("email").isString().trim().isEmail().withMessage("Valid email required"),
    f("role").isString().isIn([...ADDRESS_ROLES]).withMessage(`Role must be one of: ${ADDRESS_ROLES.join(", ")}`),
    body(`${p}landmark`).optional({ values: "falsy" }).isString().trim(),
    f("addressLine1").isString().trim().notEmpty().withMessage("Address line 1 is required"),
    body(`${p}addressLine2`).optional({ values: "falsy" }).isString().trim(),
    f("city").isString().trim().notEmpty().withMessage("City is required"),
    f("state").isString().trim().notEmpty().withMessage("State is required"),
    body(`${p}country`).optional().isString().trim(),
    f("pincode").isString().trim().matches(regex.pincode).withMessage("Valid 6-digit pincode required"),
    body(`${p}gstNumber`).optional({ values: "falsy" }).isString().trim(),
    body(`${p}latitude`).optional().isFloat().toFloat(),
    body(`${p}longitude`).optional().isFloat().toFloat(),
  ];
};

// ── Create ──

export const createAddressValidation = [
  body("nickname").isString().trim().notEmpty().withMessage("Address nickname is required"),
  ...addressFieldChains(),
  body("isSameAsRto").isBoolean().withMessage("isSameAsRto must be a boolean"),
  // RTO fields: only validated when isSameAsRto is false
  body("rtoAddress")
    .if(isRtoDifferent)
    .notEmpty()
    .withMessage("RTO address is required when not same as pickup"),
  ...addressFieldChains("rtoAddress", isRtoDifferent),
];

// ── Update ──

export const updateAddressValidation = [
  param("id").isUUID().withMessage("Invalid address ID"),
  body("nickname").optional().isString().trim().notEmpty(),
  body("contactName").optional().isString().trim().notEmpty(),
  body("phone").optional().isString().trim().matches(regex.phone),
  body("email").optional().isString().trim().isEmail(),
  body("role").optional().isString().isIn([...ADDRESS_ROLES]),
  body("landmark").optional({ values: "falsy" }).isString().trim(),
  body("addressLine1").optional().isString().trim().notEmpty(),
  body("addressLine2").optional({ values: "falsy" }).isString().trim(),
  body("city").optional().isString().trim().notEmpty(),
  body("state").optional().isString().trim().notEmpty(),
  body("country").optional().isString().trim(),
  body("pincode").optional().isString().trim().matches(regex.pincode),
  body("gstNumber").optional({ values: "falsy" }).isString().trim(),
  body("isSameAsRto").optional().isBoolean(),
  body("rtoAddress").optional(),
  body("latitude").optional().isFloat().toFloat(),
  body("longitude").optional().isFloat().toFloat(),
];

// ── Get / Delete ──

export const addressIdValidation = [
  param("id").isUUID().withMessage("Invalid address ID"),
];
