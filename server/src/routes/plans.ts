import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireSuperadminAuth } from "../middleware/auth.js";
import {
  handleListPlans,
  handleCreatePlan,
  handleUpdatePlan,
  handleDeletePlan,
  handleTogglePlanActive,
} from "../controllers/plan.controller.js";
import {
  listPlansValidation,
  createPlanValidation,
  updatePlanValidation,
  planIdValidation,
} from "../validators/plan.validator.js";

const router = Router();

router.use(requireSuperadminAuth);

router.get("/", listPlansValidation, validate, asyncHandler(handleListPlans));
router.post("/", createPlanValidation, validate, asyncHandler(handleCreatePlan));
router.put("/:id", updatePlanValidation, validate, asyncHandler(handleUpdatePlan));
router.delete("/:id", planIdValidation, validate, asyncHandler(handleDeletePlan));
router.patch("/:id/toggle", planIdValidation, validate, asyncHandler(handleTogglePlanActive));

export default router;
