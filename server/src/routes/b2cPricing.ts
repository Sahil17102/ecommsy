import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  handleDeletePricing,
  handleGetPricingByCourier,
  handleListPricing,
  handleUpsertPricing,
  handleBatchUpsertPricing,
} from "../controllers/b2cPricing.controller.js";
import { requireSuperadminAuth } from "../middleware/auth.js";
import {
  courierIdParamValidation,
  listPricingValidation,
  pricingIdValidation,
  upsertPricingValidation,
  batchUpsertPricingValidation,
} from "../validators/b2cPricing.validator.js";

const router = Router();

router.use(requireSuperadminAuth);

router.get("/", listPricingValidation, validate, asyncHandler(handleListPricing));
router.get("/courier/:courierId", courierIdParamValidation, validate, asyncHandler(handleGetPricingByCourier));
router.post("/", upsertPricingValidation, validate, asyncHandler(handleUpsertPricing));
router.post("/batch", batchUpsertPricingValidation, validate, asyncHandler(handleBatchUpsertPricing));
router.delete("/:id", pricingIdValidation, validate, asyncHandler(handleDeletePricing));

export default router;
