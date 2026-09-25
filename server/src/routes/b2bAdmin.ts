import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireSuperadminAuth } from "../middleware/auth.js";
import {
  handleListB2bZones,
  handleCreateB2bZone,
  handleUpdateB2bZone,
  handleDeleteB2bZone,
  handleToggleB2bZone,
  handleListB2bPincodes,
  handleCreateB2bPincode,
  handleUpdateB2bPincode,
  handleDeleteB2bPincode,
  handleBulkImportB2bPincodes,
  handleListB2bZoneRates,
  handleUpsertB2bZoneRate,
  handleBatchUpsertB2bZoneRates,
  handleDeleteB2bZoneRate,
  handleListB2bAdditionalCharges,
  handleUpsertB2bAdditionalCharges,
  handleDeleteB2bAdditionalCharge,
  handleCalculateB2bRate,
} from "../controllers/b2bAdmin.controller.js";
import {
  createB2bZoneValidation,
  updateB2bZoneValidation,
  b2bZoneIdValidation,
  listB2bPincodesValidation,
  createB2bPincodeValidation,
  b2bPincodeIdValidation,
  bulkImportB2bPincodesValidation,
  listB2bZoneRatesValidation,
  upsertB2bZoneRateValidation,
  batchUpsertB2bZoneRatesValidation,
  b2bZoneRateIdValidation,
  listB2bAdditionalChargesValidation,
  upsertB2bAdditionalChargesValidation,
  b2bAdditionalChargeIdValidation,
  calculateB2bRateValidation,
} from "../validators/b2bAdmin.validator.js";

const router = Router();

router.use(requireSuperadminAuth);

// ── Zones ──
router.get("/zones", asyncHandler(handleListB2bZones));
router.post("/zones", createB2bZoneValidation, validate, asyncHandler(handleCreateB2bZone));
router.put("/zones/:id", updateB2bZoneValidation, validate, asyncHandler(handleUpdateB2bZone));
router.delete("/zones/:id", b2bZoneIdValidation, validate, asyncHandler(handleDeleteB2bZone));
router.patch("/zones/:id/toggle", b2bZoneIdValidation, validate, asyncHandler(handleToggleB2bZone));

// ── Pincodes ──
router.get("/pincodes", listB2bPincodesValidation, validate, asyncHandler(handleListB2bPincodes));
router.post("/pincodes", createB2bPincodeValidation, validate, asyncHandler(handleCreateB2bPincode));
router.put("/pincodes/:id", b2bPincodeIdValidation, validate, asyncHandler(handleUpdateB2bPincode));
router.delete("/pincodes/:id", b2bPincodeIdValidation, validate, asyncHandler(handleDeleteB2bPincode));
router.post("/pincodes/bulk-import", bulkImportB2bPincodesValidation, validate, asyncHandler(handleBulkImportB2bPincodes));

// ── Zone Rates ──
router.get("/zone-rates", listB2bZoneRatesValidation, validate, asyncHandler(handleListB2bZoneRates));
router.post("/zone-rates", upsertB2bZoneRateValidation, validate, asyncHandler(handleUpsertB2bZoneRate));
router.post("/zone-rates/batch", batchUpsertB2bZoneRatesValidation, validate, asyncHandler(handleBatchUpsertB2bZoneRates));
router.delete("/zone-rates/:id", b2bZoneRateIdValidation, validate, asyncHandler(handleDeleteB2bZoneRate));

// ── Additional Charges ──
router.get("/additional-charges", listB2bAdditionalChargesValidation, validate, asyncHandler(handleListB2bAdditionalCharges));
router.post("/additional-charges", upsertB2bAdditionalChargesValidation, validate, asyncHandler(handleUpsertB2bAdditionalCharges));
router.delete("/additional-charges/:id", b2bAdditionalChargeIdValidation, validate, asyncHandler(handleDeleteB2bAdditionalCharge));

// ── Rate Calculator ──
router.post("/calculate-rate", calculateB2bRateValidation, validate, asyncHandler(handleCalculateB2bRate));

export default router;
