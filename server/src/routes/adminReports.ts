import { Router } from "express";
import { requireAdminAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  handleAdminGetReportFields,
  handleAdminGenerateReport,
  handleAdminGetReportPreview,
} from "../controllers/adminReports.controller.js";
import {
  adminGenerateReportValidation,
  adminPreviewReportValidation,
} from "../validators/reports.validator.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/fields", asyncHandler(handleAdminGetReportFields));

router.post(
  "/generate",
  adminGenerateReportValidation,
  validate,
  asyncHandler(handleAdminGenerateReport),
);

router.get(
  "/preview",
  adminPreviewReportValidation,
  validate,
  asyncHandler(handleAdminGetReportPreview),
);

export default router;
