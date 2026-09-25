import { body, type ValidationChain } from "express-validator";
import { regex } from "../config/regex.js";

// Returns all validation chains for an order payload rooted at `prefix`.
// prefix = "" → top-level (single order). prefix = "orders.*." → each row in a bulk payload.
function orderFieldValidation(prefix: string): ValidationChain[] {
  const f = (k: string) => `${prefix}${k}`;
  const ifB2B = (chain: ValidationChain) => chain.if(body(f("orderType")).equals("B2B"));
  const ifB2C = (chain: ValidationChain) => chain.if(body(f("orderType")).equals("B2C"));

  return [
    // Order details
    body(f("orderId")).isString().trim().notEmpty().withMessage("Order ID is required"),
    body(f("orderType")).isIn(["B2B", "B2C"]).withMessage("orderType must be 'B2B' or 'B2C'"),
    body(f("paymentType")).isIn(["prepaid", "cod"]).withMessage("paymentType must be 'prepaid' or 'cod'"),

    // Delivery
    body(f("buyerName")).isString().trim().notEmpty().withMessage("Buyer name is required"),
    body(f("buyerPhone")).isString().trim().matches(regex.phone).withMessage("Valid 10-digit phone required"),
    body(f("buyerEmail")).optional({ values: "falsy" }).isString().trim().isEmail().withMessage("Valid email required"),
    body(f("address")).isString().trim().isLength({ min: 5 }).withMessage("Address must be at least 5 characters"),
    body(f("address2")).optional({ values: "falsy" }).isString().trim(),
    body(f("city")).isString().trim().notEmpty().withMessage("City is required"),
    body(f("state")).isString().trim().notEmpty().withMessage("State is required"),
    body(f("pincode")).isString().trim().matches(regex.pincode).withMessage("Valid 6-digit pincode required"),

    // Package (B2C required; B2B uses packages[])
    ifB2C(body(f("weight"))).isFloat({ min: 1 }).withMessage("Weight in grams must be positive"),
    ifB2C(body(f("length"))).isFloat({ min: 0.1 }).withMessage("Length is required"),
    ifB2C(body(f("breadth"))).isFloat({ min: 0.1 }).withMessage("Breadth is required"),
    ifB2C(body(f("height"))).isFloat({ min: 0.1 }).withMessage("Height is required"),
    body(f("chargeableWeight")).isFloat({ min: 1 }).withMessage("Chargeable weight is required"),

    // Products
    body(f("products")).isArray({ min: 1 }).withMessage("At least one product is required"),
    body(f("products.*.name")).isString().trim().notEmpty().withMessage("Product name is required"),
    body(f("products.*.unitPrice")).isFloat({ min: 0 }).withMessage("Product price must be non-negative"),
    body(f("products.*.quantity")).isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
    body(f("products.*.hsn")).optional({ values: "falsy" }).isString().trim(),
    body(f("products.*.taxRate")).optional().isFloat({ min: 0, max: 100 }),

    body(f("orderAmount")).isFloat({ min: 0 }).withMessage("Order amount must be non-negative"),
    body(f("codAmount")).isFloat({ min: 0 }).withMessage("COD amount must be non-negative"),

    body(f("orderDate")).isDate({ format: "YYYY-MM-DD", strictMode: true }).withMessage("Order date must be YYYY-MM-DD"),

    // Courier & pickup
    body(f("courierId")).isUUID().withMessage("Valid courier ID is required"),
    body(f("pickupAddressId")).isUUID().withMessage("Valid pickup address ID is required"),
    body(f("preferredPickupDate"))
      .isDate({ format: "YYYY-MM-DD", strictMode: true }).withMessage("Preferred pickup date must be YYYY-MM-DD").bail()
      .custom((val: string) => {
        const selected = new Date(val);
        selected.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selected < today) throw new Error("Preferred pickup date cannot be in the past");
        return true;
      }),
    body(f("preferredPickupTime")).optional({ values: "falsy" }).isTime({ hourFormat: "hour24", mode: "default" })
      .withMessage("Preferred pickup time must be HH:MM"),

    // Rate snapshot
    body(f("rate")).isObject().withMessage("Rate snapshot is required"),
    body(f("rate.forward")).isFloat({ min: 0 }),
    body(f("rate.rto")).isFloat({ min: 0 }),
    body(f("rate.codCharges")).isFloat({ min: 0 }),
    body(f("rate.otherCharges")).isFloat({ min: 0 }),
    body(f("rate.freightCharge")).isFloat({ min: 0 }),
    body(f("rate.totalCharge")).isFloat({ min: 0 }),
    body(f("rate.zone")).isString().trim().notEmpty(),

    // B2B conditional
    ifB2B(body(f("companyName"))).isString().trim().notEmpty().withMessage("Company name is required for B2B orders"),
    ifB2B(body(f("companyGst"))).optional({ values: "falsy" }).isString().trim().matches(regex.gstin).withMessage("Valid GSTIN required"),
    ifB2B(body(f("packages"))).isArray({ min: 1 }).withMessage("At least one package is required for B2B orders"),
    ifB2B(body(f("packages.*.boxId"))).isString().trim().notEmpty(),
    ifB2B(body(f("packages.*.quantity"))).optional().isInt({ min: 1 }).withMessage("Quantity must be a positive integer"),
    ifB2B(body(f("packages.*.weight"))).isFloat({ min: 0.01 }),
    ifB2B(body(f("packages.*.length"))).isFloat({ min: 0.1 }),
    ifB2B(body(f("packages.*.breadth"))).isFloat({ min: 0.1 }),
    ifB2B(body(f("packages.*.height"))).isFloat({ min: 0.1 }),
    ifB2B(body(f("invoices"))).isArray({ min: 1 }),
    ifB2B(body(f("invoices.*.invoiceNumber"))).isString().trim().notEmpty(),
    ifB2B(body(f("invoices.*.invoiceDate"))).isDate({ format: "YYYY-MM-DD", strictMode: true }),
    ifB2B(body(f("invoices.*.invoiceValue"))).isFloat({ min: 0 }),
    ifB2B(body(f("invoices.*.ebn"))).optional({ values: "falsy" }).isString().trim(),
    ifB2B(body(f("invoices.*.ebnExpiry"))).optional({ values: "falsy" }).isDate({ format: "YYYY-MM-DD", strictMode: true }),
    ifB2B(body(f("invoices.*.fileUrl"))).optional({ values: "falsy" }).isString().trim(),
    ifB2B(body(f("chargesBreakdown"))).optional().isObject(),
    ifB2B(body(f("chargesBreakdown.baseFreight"))).optional().isFloat({ min: 0 }),
    ifB2B(body(f("chargesBreakdown.total"))).optional().isFloat({ min: 0 }),
  ];
}

export const createOrderValidation = orderFieldValidation("");

// Bulk B2C: array of rows, each row validated as a B2C order.
export const bulkCreateB2COrdersValidation: ValidationChain[] = [
  body("orders").isArray({ min: 1, max: 500 }).withMessage("orders must be an array of 1–500 items"),
  body("orders.*.orderType").custom((val) => {
    if (val !== "B2C") throw new Error("Use /orders/bulk-create-b2b for B2B orders");
    return true;
  }),
  ...orderFieldValidation("orders.*."),
];

// Bulk B2B: array of rows, each row validated as a B2B order.
export const bulkCreateB2BOrdersValidation: ValidationChain[] = [
  body("orders").isArray({ min: 1, max: 500 }).withMessage("orders must be an array of 1–500 items"),
  body("orders.*.orderType").custom((val) => {
    if (val !== "B2B") throw new Error("Use /orders/bulk-create for B2C orders");
    return true;
  }),
  ...orderFieldValidation("orders.*."),
];

export const bulkManifestValidation: ValidationChain[] = [
  body("orderIds").isArray({ min: 1, max: 500 }).withMessage("orderIds must be an array of 1–500 items"),
  body("orderIds.*").isUUID().withMessage("Each orderId must be a valid ObjectId"),
];
