import { Router, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../config/db.js";
import { trackingEvents } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { requireKyc } from "../middleware/requireKyc.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { parseSortParams } from "../utils/parseQuery.js";
import { createOrderValidation, bulkCreateB2COrdersValidation, bulkCreateB2BOrdersValidation, bulkManifestValidation } from "../validators/order.validator.js";
import {
  handleCreateOrder,
  handleGetOrders,
  handleGetOrderById,
  handleBulkCreateB2COrders,
  handleBulkCreateB2BOrders,
  handleBulkManifest,
  handleBulkTemplate,
  handleGetOrderCourierOptions,
} from "../controllers/order.controller.js";
import { handleGetLabel, handleGetInvoice, handleGenerateManifest, handleBulkLabels } from "../controllers/document.controller.js";
import { param, body } from "express-validator";
import { cancelOrder } from "../services/orderCancellation.js";
import { manifestOrders } from "../services/manifestService.js";
import { listNdrOrders, takeNdrAction } from "../services/ndrService.js";
import { listRtoOrders } from "../services/rtoService.js";
import { parseAdminOrderFilters } from "../services/orderQuery.js";
import logger from "../config/logger.js";

const router = Router();

router.post("/", requireAuth, requireKyc(), createOrderValidation, validate, asyncHandler(handleCreateOrder));
router.get("/", requireAuth, asyncHandler(handleGetOrders));
/** GET /orders/courier-options — couriers this seller has actually shipped with (filter dropdown) */
router.get("/courier-options", requireAuth, asyncHandler(handleGetOrderCourierOptions));

// ── Bulk B2C ──
router.get("/bulk-template", requireAuth, (req, res) => handleBulkTemplate(req, res));
router.post(
  "/bulk-create",
  requireAuth,
  requireKyc(),
  bulkCreateB2COrdersValidation,
  validate,
  asyncHandler(handleBulkCreateB2COrders),
);
router.post(
  "/bulk-create-b2b",
  requireAuth,
  requireKyc(),
  bulkCreateB2BOrdersValidation,
  validate,
  asyncHandler(handleBulkCreateB2BOrders),
);
router.post(
  "/bulk-manifest",
  requireAuth,
  bulkManifestValidation,
  validate,
  asyncHandler(handleBulkManifest),
);

// Document endpoints
router.post(
  "/bulk-labels",
  requireAuth,
  [body("orderIds").isArray({ min: 1 }).withMessage("orderIds must be a non-empty array")],
  validate,
  asyncHandler(handleBulkLabels),
);
router.post(
  "/manifest",
  requireAuth,
  [body("orderIds").isArray({ min: 1 }).withMessage("orderIds must be a non-empty array")],
  validate,
  asyncHandler(handleGenerateManifest),
);
router.get("/:id/label", requireAuth, [param("id").isUUID().withMessage("Invalid order ID")], validate, asyncHandler(handleGetLabel));
router.get("/:id/invoice", requireAuth, [param("id").isUUID().withMessage("Invalid order ID")], validate, asyncHandler(handleGetInvoice));

// ── Order Lifecycle ──

/** POST /orders/manifest-orders — Manifest selected orders (generate docs + request pickup) */
router.post(
  "/manifest-orders",
  requireAuth,
  [body("orderIds").isArray({ min: 1 }).withMessage("orderIds must be a non-empty array")],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { orderIds } = req.body;
    const result = await manifestOrders(orderIds, userId);
    res.json(result);
  }),
);

/** POST /orders/:id/cancel — Cancel an order */
router.post(
  "/:id/cancel",
  requireAuth,
  [param("id").isUUID().withMessage("Invalid order ID")],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { reason } = req.body;
    const order = await cancelOrder(req.params.id, userId, reason);
    res.json({ message: "Order cancelled", order });
  }),
);

/** GET /orders/:id/tracking — Get tracking history for an order */
router.get(
  "/:id/tracking",
  requireAuth,
  [param("id").isUUID().withMessage("Invalid order ID")],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const events = await db
      .select()
      .from(trackingEvents)
      .where(eq(trackingEvents.orderId, req.params.id))
      .orderBy(desc(trackingEvents.createdAt));
    res.json(events);
  }),
);

// ── NDR (customer-facing) ──

/** GET /orders/ndr/list — List NDR orders for the logged-in user */
router.get(
  "/ndr/list",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    logger.info(`listNdrOrders — userId: ${userId}`);
    const { page, limit } = req.query;
    const sort = parseSortParams(req, ["createdAt", "ndrAttemptedAt", "orderAmount"], "ndrAttemptedAt");
    const result = await listNdrOrders({
      // userId wins over anything in the query so a seller can't read another
      // seller's NDRs by passing ?userId=.
      userId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      filters: parseAdminOrderFilters(req),
      sort,
    });
    res.json(result);
  }),
);

/** POST /orders/:id/ndr-action — Take action on NDR (customer) */
router.post(
  "/:id/ndr-action",
  requireAuth,
  [
    param("id").isUUID().withMessage("Invalid order ID"),
    body("action").isIn(["reattempt", "rto", "reschedule"]).withMessage("Invalid action"),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    await takeNdrAction({
      orderId: req.params.id,
      action: req.body.action,
      remarks: req.body.remarks,
      rescheduledDate: req.body.rescheduledDate,
      updatedPhone: req.body.updatedPhone,
      updatedAddress: req.body.updatedAddress,
    });
    res.json({ message: `NDR action "${req.body.action}" taken` });
  }),
);

// ── RTO (customer-facing) ──

/** GET /orders/rto/list — List RTO orders for the logged-in user */
router.get(
  "/rto/list",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { page, limit, rtoPhase } = req.query;
    const sort = parseSortParams(req, ["createdAt", "updatedAt", "orderAmount"], "updatedAt");
    const result = await listRtoOrders({
      userId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      rtoPhase: rtoPhase as any,
      filters: parseAdminOrderFilters(req),
      sort,
    });
    res.json(result);
  }),
);

router.get("/:id", requireAuth, [param("id").isUUID().withMessage("Invalid order ID")], validate, asyncHandler(handleGetOrderById));

export default router;
