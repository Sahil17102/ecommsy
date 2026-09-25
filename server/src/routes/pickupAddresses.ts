import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createAddressValidation,
  updateAddressValidation,
  addressIdValidation,
} from "../validators/pickupAddress.validator.js";
import {
  handleListAddresses,
  handleGetAddress,
  handleCreateAddress,
  handleBulkCreateAddresses,
  handleUpdateAddress,
  handleDeleteAddress,
  handleSetPrimary,
} from "../controllers/pickupAddress.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(handleListAddresses));
router.get("/:id", addressIdValidation, validate, asyncHandler(handleGetAddress));
router.post("/", createAddressValidation, validate, asyncHandler(handleCreateAddress));
router.post("/bulk", asyncHandler(handleBulkCreateAddresses));
router.put("/:id", updateAddressValidation, validate, asyncHandler(handleUpdateAddress));
router.delete("/:id", addressIdValidation, validate, asyncHandler(handleDeleteAddress));
router.patch("/:id/primary", addressIdValidation, validate, asyncHandler(handleSetPrimary));

export default router;
