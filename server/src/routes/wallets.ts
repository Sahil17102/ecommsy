import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAdminAuth, requireAuth } from "../middleware/auth.js";
import {
  handleListWallets,
  handleGetUserWallet,
  handleGetUserTransactions,
  handleAdjustWallet,
  handleGetMyBalance,
  handleGetMyTransactions,
} from "../controllers/wallet.controller.js";
import {
  handleCreateRechargeOrder,
  handleVerifyRecharge,
} from "../controllers/recharge.controller.js";
import {
  listWalletsValidation,
  walletUserIdValidation,
  listTransactionsValidation,
  adjustWalletValidation,
} from "../validators/wallet.validator.js";
import {
  createRechargeOrderValidation,
  verifyRechargeValidation,
} from "../validators/recharge.validator.js";

// ── Admin wallet routes ──

export const adminWalletRouter = Router();
adminWalletRouter.use(requireAdminAuth);

adminWalletRouter.get("/", listWalletsValidation, validate, asyncHandler(handleListWallets));
adminWalletRouter.get("/:userId", walletUserIdValidation, validate, asyncHandler(handleGetUserWallet));
adminWalletRouter.get("/:userId/transactions", listTransactionsValidation, validate, asyncHandler(handleGetUserTransactions));
adminWalletRouter.post("/:userId/adjust", adjustWalletValidation, validate, asyncHandler(handleAdjustWallet));

// ── Customer wallet routes ──

export const customerWalletRouter = Router();
customerWalletRouter.use(requireAuth);

customerWalletRouter.get("/balance", asyncHandler(handleGetMyBalance));
customerWalletRouter.get("/transactions", asyncHandler(handleGetMyTransactions));
// Razorpay self-recharge is disabled for this project — the wallet is controlled by the
// server/admin only. Re-enable these routes (and `RECHARGE_ENABLED` in the seller WalletPage)
// to restore seller self top-up via Razorpay.
// customerWalletRouter.post("/recharge/create-order", createRechargeOrderValidation, validate, asyncHandler(handleCreateRechargeOrder));
// customerWalletRouter.post("/recharge/verify", verifyRechargeValidation, validate, asyncHandler(handleVerifyRecharge));
