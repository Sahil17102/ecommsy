import { Router } from "express";
import { requireAdminAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import {
  adminRejectValidation,
  adminDocumentKeyParam,
} from "../validators/kyc.validator.js";
import {
  handleAdminGetKyc,
  handleApproveKyc,
  handleRejectKyc,
  handleApproveDocument,
  handleRejectDocument,
  handleAdminServeDocument,
} from "../controllers/kyc.controller.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/users/:userId/kyc", asyncHandler(handleAdminGetKyc));
router.post("/kyc/:id/approve", asyncHandler(handleApproveKyc));
router.post("/kyc/:id/reject", adminRejectValidation, validate, asyncHandler(handleRejectKyc));
router.post(
  "/kyc/:id/document/:key/approve",
  adminDocumentKeyParam,
  validate,
  asyncHandler(handleApproveDocument),
);
router.post(
  "/kyc/:id/document/:key/reject",
  [...adminDocumentKeyParam, ...adminRejectValidation],
  validate,
  asyncHandler(handleRejectDocument),
);
router.get("/document/:userId/:key/:filename", asyncHandler(handleAdminServeDocument));

export default router;
