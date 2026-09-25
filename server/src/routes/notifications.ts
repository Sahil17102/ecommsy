import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  handleListNotifications,
  handleMarkRead,
  handleMarkAllRead,
  handleGetUnreadCount,
  handleGetPreferences,
  handleUpdatePreferences,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(handleListNotifications));
router.get("/unread-count", asyncHandler(handleGetUnreadCount));
router.post("/read-all", asyncHandler(handleMarkAllRead));
router.post("/:id/read", asyncHandler(handleMarkRead));

router.get("/preferences", asyncHandler(handleGetPreferences));
router.put("/preferences", asyncHandler(handleUpdatePreferences));

export default router;
