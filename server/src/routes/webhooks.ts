import { Router } from "express";
import { param } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import {
  handleListEvents,
  handleListWebhooks,
  handleGetWebhook,
  handleCreateWebhook,
  handleUpdateWebhook,
  handleDeleteWebhook,
  handleRotateSecret,
  handleTestWebhook,
  handleListDeliveries,
  handleRedeliver,
} from "../controllers/webhook.controller.js";

const router = Router();

router.use(requireAuth);

const webhookId = [param("id").isUUID().withMessage("Invalid webhook ID")];
const deliveryId = [param("deliveryId").isUUID().withMessage("Invalid delivery ID")];

// Static paths first — otherwise "/events" and "/deliveries" are swallowed by "/:id".
router.get("/events", asyncHandler(handleListEvents));
router.get("/deliveries", asyncHandler(handleListDeliveries));
router.post("/deliveries/:deliveryId/redeliver", deliveryId, validate, asyncHandler(handleRedeliver));

router.get("/", asyncHandler(handleListWebhooks));
router.post("/", asyncHandler(handleCreateWebhook));

router.get("/:id", webhookId, validate, asyncHandler(handleGetWebhook));
router.patch("/:id", webhookId, validate, asyncHandler(handleUpdateWebhook));
router.delete("/:id", webhookId, validate, asyncHandler(handleDeleteWebhook));

router.post("/:id/rotate-secret", webhookId, validate, asyncHandler(handleRotateSecret));
router.post("/:id/test", webhookId, validate, asyncHandler(handleTestWebhook));
router.get("/:id/deliveries", webhookId, validate, asyncHandler(handleListDeliveries));

export default router;
