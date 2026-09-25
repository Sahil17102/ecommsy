import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import {
  submitKycValidation,
  uploadDocumentValidation,
} from "../validators/kyc.validator.js";
import {
  handleGetKyc,
  handleSubmitKyc,
  handleUploadDocument,
  handleServeDocument,
} from "../controllers/kyc.controller.js";
import { MAX_UPLOAD_SIZE, KYC_ALLOWED_MIMES } from "../config/constants.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    if ((KYC_ALLOWED_MIMES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image (JPEG, PNG, WebP) and PDF files are allowed"));
    }
  },
});

router.use(requireAuth);

router.get("/", asyncHandler(handleGetKyc));
router.post("/", submitKycValidation, validate, asyncHandler(handleSubmitKyc));
router.post(
  "/upload",
  upload.single("document"),
  uploadDocumentValidation,
  validate,
  asyncHandler(handleUploadDocument),
);
router.get("/document/:key/:filename", asyncHandler(handleServeDocument));

export default router;
