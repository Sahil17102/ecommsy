import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { handleGetUser, handleListUsers, handleToggleUserActive, handleUpdateUserPlan, handleGetUserPickupAddresses, handleGetUserSummary } from "../controllers/user.controller.js";
import {
  handleAdminListTeamMembers,
  handleAdminCreateTeamMember,
  handleAdminDeleteTeamMember,
  handleAdminResetUserPassword,
} from "../controllers/teamMember.controller.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { listUsersValidation, userIdValidation } from "../validators/user.validator.js";
import {
  createTeamMemberValidation,
  memberIdValidation,
} from "../validators/teamMember.validator.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/", listUsersValidation, validate, asyncHandler(handleListUsers));
router.get("/:id/summary", userIdValidation, validate, asyncHandler(handleGetUserSummary));
router.get("/:id/pickup-addresses", userIdValidation, validate, asyncHandler(handleGetUserPickupAddresses));
router.get("/:id", userIdValidation, validate, asyncHandler(handleGetUser));
router.patch("/:id/toggle-active", userIdValidation, validate, asyncHandler(handleToggleUserActive));
router.patch("/:id/plan", userIdValidation, validate, asyncHandler(handleUpdateUserPlan));

// Team members (sub-accounts under a seller)
router.get(
  "/:id/team-members",
  userIdValidation,
  validate,
  asyncHandler(handleAdminListTeamMembers),
);
router.post(
  "/:id/team-members",
  userIdValidation,
  createTeamMemberValidation,
  validate,
  asyncHandler(handleAdminCreateTeamMember),
);
router.delete(
  "/:id/team-members/:memberId",
  userIdValidation,
  memberIdValidation,
  validate,
  asyncHandler(handleAdminDeleteTeamMember),
);

// Admin password reset for any user (owner or member)
router.post(
  "/:id/reset-password",
  userIdValidation,
  validate,
  asyncHandler(handleAdminResetUserPassword),
);

export default router;
