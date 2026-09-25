import { Router } from "express";
import { requireAdminAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  handleAdminGetPreferences,
  handleAdminUpdatePreferences,
  handleListNotifications,
  handleMarkRead,
  handleMarkAllRead,
  handleGetUnreadCount,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/preferences", asyncHandler(handleAdminGetPreferences));
router.put("/preferences", asyncHandler(handleAdminUpdatePreferences));

// Inbox endpoints — reuse the seller controllers since they all key off req.userId.
router.get("/", asyncHandler(handleListNotifications));
router.get("/unread-count", asyncHandler(handleGetUnreadCount));
router.post("/read-all", asyncHandler(handleMarkAllRead));
router.post("/:id/read", asyncHandler(handleMarkRead));

export default router;
