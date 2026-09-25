import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  handleGetReportFields,
  handleGenerateReport,
  handleGetReportPreview,
} from "../controllers/reports.controller.js";
import {
  generateReportValidation,
  previewReportValidation,
} from "../validators/reports.validator.js";

const router = Router();

router.get("/fields", requireAuth, asyncHandler(handleGetReportFields));

router.post(
  "/generate",
  requireAuth,
  generateReportValidation,
  validate,
  asyncHandler(handleGenerateReport),
);

router.get(
  "/preview",
  requireAuth,
  previewReportValidation,
  validate,
  asyncHandler(handleGetReportPreview),
);

export default router;
