import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAdminAuth, requireAuth } from "../middleware/auth.js";
import {
  handleGetMyStats,
  handleGetMyRemittances,
  handleExportMyRemittances,
  handleExportSingleRemittance,
} from "../controllers/codRemittance.controller.js";
import {
  handleGetStats,
  handleListRemittances,
  handleGetUserRemittances,
  handleCreditRemittance,
  handleUpdateNotes,
  handlePreviewSettlementCsv,
  handleConfirmSettlement,
  handleExportRemittances,
  handleGetCsvTemplate,
} from "../controllers/adminCodRemittance.controller.js";
import {
  listRemittancesValidation,
  remittanceIdValidation,
  userIdParamValidation,
  creditRemittanceValidation,
  updateNotesValidation,
  previewCsvValidation,
  confirmSettlementValidation,
} from "../validators/codRemittance.validator.js";

// ── Seller routes ──

export const customerCodRemittanceRouter = Router();
customerCodRemittanceRouter.use(requireAuth);

customerCodRemittanceRouter.get("/stats", asyncHandler(handleGetMyStats));
customerCodRemittanceRouter.get("/remittances", listRemittancesValidation, validate, asyncHandler(handleGetMyRemittances));
customerCodRemittanceRouter.get("/remittances/export", asyncHandler(handleExportMyRemittances));
customerCodRemittanceRouter.get("/remittances/:id/export", remittanceIdValidation, validate, asyncHandler(handleExportSingleRemittance));

// ── Admin routes ──

export const adminCodRemittanceRouter = Router();
adminCodRemittanceRouter.use(requireAdminAuth);

adminCodRemittanceRouter.get("/stats", asyncHandler(handleGetStats));
adminCodRemittanceRouter.get("/remittances", listRemittancesValidation, validate, asyncHandler(handleListRemittances));
adminCodRemittanceRouter.get("/remittances/export", asyncHandler(handleExportRemittances));
adminCodRemittanceRouter.get("/users/:userId/remittances", [...userIdParamValidation, ...listRemittancesValidation], validate, asyncHandler(handleGetUserRemittances));
adminCodRemittanceRouter.post("/remittances/:id/credit", creditRemittanceValidation, validate, asyncHandler(handleCreditRemittance));
adminCodRemittanceRouter.patch("/remittances/:id/notes", updateNotesValidation, validate, asyncHandler(handleUpdateNotes));
adminCodRemittanceRouter.post("/preview-settlement-csv", previewCsvValidation, validate, asyncHandler(handlePreviewSettlementCsv));
adminCodRemittanceRouter.post("/confirm-settlement", confirmSettlementValidation, validate, asyncHandler(handleConfirmSettlement));
adminCodRemittanceRouter.get("/csv-template", asyncHandler(handleGetCsvTemplate));
