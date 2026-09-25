import { Router, type Request, type Response } from "express";
import { param, body } from "express-validator";
import { desc, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, trackingEvents, ndrEvents, rtoEvents } from "../db/schema.js";
import { handleAdminListOrders, handleAdminGetOrderById } from "../controllers/adminOrder.controller.js";
import {
  handleQueueOrderExport,
  handleListExportJobs,
  handleGetExportJob,
  handleDownloadExport,
  handleRerunExport,
} from "../controllers/adminExport.controller.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { parseSortParams } from "../utils/parseQuery.js";
import { listNdrOrders, recordNdr, takeNdrAction } from "../services/ndrService.js";
import { listRtoOrders } from "../services/rtoService.js";
import { parseAdminOrderFilters } from "../services/orderQuery.js";
import { cancelOrder } from "../services/orderCancellation.js";

const router = Router();

router.use(requireAdminAuth);

// ── Orders CRUD ──
router.get("/", asyncHandler(handleAdminListOrders));

// ── CSV export (async) ──
// Declared before "/:id" — "exports" is not a UUID and would 400 on that route.

/** POST /admin/orders/export — queue a CSV build for the current filters */
router.post("/export", asyncHandler(handleQueueOrderExport));

/** GET /admin/orders/exports — export history */
router.get("/exports", asyncHandler(handleListExportJobs));

/** GET /admin/orders/exports/:id — single job (progress polling) */
router.get(
  "/exports/:id",
  [param("id").isUUID().withMessage("Invalid export ID")],
  validate,
  asyncHandler(handleGetExportJob),
);

/** GET /admin/orders/exports/:id/download — download the finished CSV */
router.get(
  "/exports/:id/download",
  [param("id").isUUID().withMessage("Invalid export ID")],
  validate,
  asyncHandler(handleDownloadExport),
);

/** POST /admin/orders/exports/:id/rerun — re-queue the same filter set */
router.post(
  "/exports/:id/rerun",
  [param("id").isUUID().withMessage("Invalid export ID")],
  validate,
  asyncHandler(handleRerunExport),
);

router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid order ID")],
  validate,
  asyncHandler(handleAdminGetOrderById),
);

/** POST /admin/orders/:id/cancel — Cancel order (admin) */
router.post(
  "/:id/cancel",
  [param("id").isUUID().withMessage("Invalid order ID")],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, req.params.id),
      columns: { userId: true },
    });
    if (!order) { res.status(404).json({ message: "Order not found" }); return; }
    const cancelled = await cancelOrder(req.params.id, order.userId, req.body.reason);
    res.json({ message: "Order cancelled", order: cancelled });
  }),
);

// ── Tracking ──

/** GET /admin/orders/:id/tracking — Get tracking history */
router.get(
  "/:id/tracking",
  [param("id").isUUID().withMessage("Invalid order ID")],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, req.params.id),
      columns: { userId: true },
    });
    if (!order) { res.status(404).json({ message: "Order not found" }); return; }
    const events = await db
      .select()
      .from(trackingEvents)
      .where(eq(trackingEvents.orderId, req.params.id))
      .orderBy(desc(trackingEvents.createdAt));
    res.json(events);
  }),
);

// ── NDR Management ──

/** GET /admin/orders/ndr/list — List all NDR orders */
router.get(
  "/ndr/list",
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query;
    const sort = parseSortParams(req, ["createdAt", "ndrAttemptedAt", "orderAmount"], "ndrAttemptedAt");
    const result = await listNdrOrders({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      filters: parseAdminOrderFilters(req),
      sort,
    });
    res.json(result);
  }),
);

/** GET /admin/orders/:id/ndr-events — Get NDR events for an order */
router.get(
  "/:id/ndr-events",
  [param("id").isUUID().withMessage("Invalid order ID")],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, req.params.id),
      columns: { userId: true },
    });
    if (!order) { res.status(404).json({ message: "Order not found" }); return; }
    const events = await db
      .select()
      .from(ndrEvents)
      .where(eq(ndrEvents.orderId, req.params.id))
      .orderBy(desc(ndrEvents.createdAt));
    res.json(events);
  }),
);

/** POST /admin/orders/:id/ndr — Record NDR event */
router.post(
  "/:id/ndr",
  [
    param("id").isUUID().withMessage("Invalid order ID"),
    body("reason").isString().notEmpty().withMessage("Reason is required"),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, req.params.id),
      columns: { userId: true },
    });
    if (!order) { res.status(404).json({ message: "Order not found" }); return; }
    await recordNdr({
      orderId: req.params.id,
      userId: order.userId,
      reason: req.body.reason,
      remarks: req.body.remarks,
      location: req.body.location,
      attemptDate: req.body.attemptDate,
      nextAction: req.body.nextAction,
      source: "admin",
    });
    res.json({ message: "NDR recorded" });
  }),
);

/** POST /admin/orders/:id/ndr-action — Take action on NDR */
router.post(
  "/:id/ndr-action",
  [
    param("id").isUUID().withMessage("Invalid order ID"),
    body("action").isIn(["reattempt", "rto", "reschedule"]).withMessage("Invalid action"),
  ],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, req.params.id),
      columns: { userId: true },
    });
    if (!order) { res.status(404).json({ message: "Order not found" }); return; }
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

// ── RTO Management ──

/** GET /admin/orders/rto/list — List all RTO orders */
router.get(
  "/rto/list",
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, rtoPhase } = req.query;
    const sort = parseSortParams(req, ["createdAt", "updatedAt", "orderAmount"], "updatedAt");
    const result = await listRtoOrders({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      rtoPhase: rtoPhase as any,
      filters: parseAdminOrderFilters(req),
      sort,
    });
    res.json(result);
  }),
);

/** GET /admin/orders/:id/rto-events — Get RTO events for an order */
router.get(
  "/:id/rto-events",
  [param("id").isUUID().withMessage("Invalid order ID")],
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, req.params.id),
      columns: { userId: true },
    });
    if (!order) { res.status(404).json({ message: "Order not found" }); return; }
    const events = await db
      .select()
      .from(rtoEvents)
      .where(eq(rtoEvents.orderId, req.params.id))
      .orderBy(desc(rtoEvents.createdAt));
    res.json(events);
  }),
);

export default router;
