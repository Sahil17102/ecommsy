import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createTeamMemberValidation,
  memberIdValidation,
} from "../validators/teamMember.validator.js";
import {
  handleListMyTeamMembers,
  handleCreateMyTeamMember,
  handleDeleteMyTeamMember,
  handleToggleMyTeamMemberActive,
  handleResetMyTeamMemberPassword,
} from "../controllers/teamMember.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(handleListMyTeamMembers));
router.post(
  "/",
  createTeamMemberValidation,
  validate,
  asyncHandler(handleCreateMyTeamMember),
);
router.delete(
  "/:memberId",
  memberIdValidation,
  validate,
  asyncHandler(handleDeleteMyTeamMember),
);
router.patch(
  "/:memberId/toggle-active",
  memberIdValidation,
  validate,
  asyncHandler(handleToggleMyTeamMemberActive),
);
router.post(
  "/:memberId/reset-password",
  memberIdValidation,
  validate,
  asyncHandler(handleResetMyTeamMemberPassword),
);

export default router;
