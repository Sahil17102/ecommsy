import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  handleCreateZone,
  handleDeleteZone,
  handleListZones,
  handleToggleZone,
  handleUpdateZone,
} from "../controllers/b2cZone.controller.js";
import { requireSuperadminAuth } from "../middleware/auth.js";
import {
  createZoneValidation,
  listZonesValidation,
  updateZoneValidation,
  zoneIdValidation,
} from "../validators/b2cZone.validator.js";

const router = Router();

router.use(requireSuperadminAuth);

router.get("/", listZonesValidation, validate, asyncHandler(handleListZones));
router.post("/", createZoneValidation, validate, asyncHandler(handleCreateZone));
router.put("/:id", updateZoneValidation, validate, asyncHandler(handleUpdateZone));
router.delete("/:id", zoneIdValidation, validate, asyncHandler(handleDeleteZone));
router.patch("/:id/toggle", zoneIdValidation, validate, asyncHandler(handleToggleZone));

export default router;
