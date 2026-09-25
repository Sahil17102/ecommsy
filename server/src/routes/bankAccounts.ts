import { Router } from "express";
import multer from "multer";
import { requireAuth, requireAdminAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { MAX_UPLOAD_SIZE, KYC_ALLOWED_MIMES } from "../config/constants.js";
import {
  handleListBankAccounts,
  handleAddBankAccount,
  handleDeleteBankAccount,
  handleSetPrimary,
  handleAdminListBankAccounts,
  handleAdminApproveBankAccount,
  handleAdminRejectBankAccount,
} from "../controllers/bankAccount.controller.js";

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

// ── Customer routes ──

export const customerBankAccountRouter = Router();
customerBankAccountRouter.use(requireAuth);

customerBankAccountRouter.get("/", asyncHandler(handleListBankAccounts));
customerBankAccountRouter.post(
  "/",
  upload.single("cancelledCheque"),
  asyncHandler(handleAddBankAccount),
);
customerBankAccountRouter.delete("/:id", asyncHandler(handleDeleteBankAccount));
customerBankAccountRouter.patch("/:id/set-primary", asyncHandler(handleSetPrimary));

// ── Admin routes ──

export const adminBankAccountRouter = Router();
adminBankAccountRouter.use(requireAdminAuth);

adminBankAccountRouter.get("/user/:userId", asyncHandler(handleAdminListBankAccounts));
adminBankAccountRouter.post("/:id/approve", asyncHandler(handleAdminApproveBankAccount));
adminBankAccountRouter.post("/:id/reject", asyncHandler(handleAdminRejectBankAccount));
