import { Router } from "express";
import { param } from "express-validator";
import { requireAdminAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import {
  handleWebhookHealth,
  handleAdminListEndpoints,
  handleAdminToggleEndpoint,
  handleAdminListDeliveries,
  handleAdminGetDelivery,
  handleAdminRedeliver,
  handleAdminListEvents,
} from "../controllers/adminWebhook.controller.js";

const router = Router();

router.use(requireAdminAuth);

const idParam = [param("id").isUUID().withMessage("Invalid ID")];

router.get("/health", asyncHandler(handleWebhookHealth));
router.get("/events", asyncHandler(handleAdminListEvents));

router.get("/endpoints", asyncHandler(handleAdminListEndpoints));
router.patch("/endpoints/:id", idParam, validate, asyncHandler(handleAdminToggleEndpoint));

router.get("/deliveries", asyncHandler(handleAdminListDeliveries));
router.get("/deliveries/:id", idParam, validate, asyncHandler(handleAdminGetDelivery));
router.post("/deliveries/:id/redeliver", idParam, validate, asyncHandler(handleAdminRedeliver));

export default router;
