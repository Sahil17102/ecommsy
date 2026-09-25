import { query } from "express-validator";
import { ShipmentMode } from "../services/delhivery.js";

export const delhiveryRateValidation = [
  query("o_pin").isString().isLength({ min: 6, max: 6 }).withMessage("Valid 6-digit origin pincode required"),
  query("d_pin").isString().isLength({ min: 6, max: 6 }).withMessage("Valid 6-digit destination pincode required"),
  query("cgm").isInt({ min: 1 }).withMessage("Weight in grams (cgm) must be a positive integer"),
  query("md").optional().isIn(Object.values(ShipmentMode)).withMessage("md must be S or E"),
];
