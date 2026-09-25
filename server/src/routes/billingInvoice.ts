import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAdminAuth, requireAuth } from "../middleware/auth.js";
import {
  handleGetMyInvoices,
  handleGetMyInvoiceOrders,
  handleDownloadInvoiceDoc,
  handleGenerateMyInvoice,
  handleGetBillingPreference,
  handleUpdateBillingPreference,
} from "../controllers/billingInvoice.controller.js";
import {
  handleListInvoices,
  handleGetInvoiceOrders,
  handleDownloadInvoiceDoc as handleAdminDownloadInvoiceDoc,
  handleVoidInvoice,
  handleGenerateInvoice,
} from "../controllers/adminBillingInvoice.controller.js";
import {
  listInvoicesValidation,
  invoiceIdValidation,
  generateInvoiceValidation,
  billingPreferenceValidation,
} from "../validators/billingInvoice.validator.js";

// ── Seller routes ──

export const customerInvoiceRouter = Router();
customerInvoiceRouter.use(requireAuth);

customerInvoiceRouter.get("/", listInvoicesValidation, validate, asyncHandler(handleGetMyInvoices));
customerInvoiceRouter.get("/:id/orders", invoiceIdValidation, validate, asyncHandler(handleGetMyInvoiceOrders));
customerInvoiceRouter.get("/:id/download/:type", invoiceIdValidation, validate, asyncHandler(handleDownloadInvoiceDoc));
customerInvoiceRouter.post("/generate", asyncHandler(handleGenerateMyInvoice));

// Billing preferences
customerInvoiceRouter.get("/preferences", asyncHandler(handleGetBillingPreference));
customerInvoiceRouter.patch("/preferences", billingPreferenceValidation, validate, asyncHandler(handleUpdateBillingPreference));

// ── Admin routes ──

export const adminInvoiceRouter = Router();
adminInvoiceRouter.use(requireAdminAuth);

adminInvoiceRouter.get("/", listInvoicesValidation, validate, asyncHandler(handleListInvoices));
adminInvoiceRouter.get("/:id/orders", invoiceIdValidation, validate, asyncHandler(handleGetInvoiceOrders));
adminInvoiceRouter.get("/:id/download/:type", invoiceIdValidation, validate, asyncHandler(handleAdminDownloadInvoiceDoc));
adminInvoiceRouter.post("/:id/void", invoiceIdValidation, validate, asyncHandler(handleVoidInvoice));
adminInvoiceRouter.post("/generate", generateInvoiceValidation, validate, asyncHandler(handleGenerateInvoice));
