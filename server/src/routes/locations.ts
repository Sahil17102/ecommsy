import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  handleBulkDelete,
  handleBulkImport,
  handleCreateLocation,
  handleDeleteLocation,
  handleGetCities,
  handleGetStates,
  handleListLocations,
  handleLookupPincode,
  handleToggleLocation,
} from "../controllers/location.controller.js";
import { requireSuperadminAuth } from "../middleware/auth.js";
import {
  bulkDeleteValidation,
  bulkImportValidation,
  createLocationValidation,
  listLocationsValidation,
  locationIdValidation,
  pincodeParamValidation,
} from "../validators/location.validator.js";

const router = Router();

router.use(requireSuperadminAuth);

router.get("/regions/states", asyncHandler(handleGetStates));
router.get("/regions/cities", asyncHandler(handleGetCities));
router.get("/", listLocationsValidation, validate, asyncHandler(handleListLocations));
router.post("/", createLocationValidation, validate, asyncHandler(handleCreateLocation));
router.post("/import", bulkImportValidation, validate, asyncHandler(handleBulkImport));
router.post("/bulk-delete", bulkDeleteValidation, validate, asyncHandler(handleBulkDelete));
router.get("/pincode-lookup/:pincode", pincodeParamValidation, validate, asyncHandler(handleLookupPincode));
router.delete("/:id", locationIdValidation, validate, asyncHandler(handleDeleteLocation));
router.patch("/:id/toggle", locationIdValidation, validate, asyncHandler(handleToggleLocation));

export default router;
