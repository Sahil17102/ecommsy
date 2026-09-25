import type { Request, Response } from "express";
import { createRechargeOrder, verifyAndCreditWallet } from "../services/recharge.js";
import { getRazorpayKeyId } from "../config/razorpay.js";

/**
 * POST /wallet/recharge/create-order
 * Creates a Razorpay order for wallet recharge.
 */
export async function handleCreateRechargeOrder(req: Request, res: Response) {
  const { amount } = req.body;

  const result = await createRechargeOrder({
    userId: req.userId!,
    amount: Number(amount),
  });

  res.json({
    ...result,
    keyId: getRazorpayKeyId(),
  });
}

/**
 * POST /wallet/recharge/verify
 * Verifies Razorpay payment and credits the wallet.
 */
export async function handleVerifyRecharge(req: Request, res: Response) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const result = await verifyAndCreditWallet({
    userId: req.userId!,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  res.json({
    message: `₹${result.creditedAmount} added to wallet`,
    balance: result.balance,
    creditedAmount: result.creditedAmount,
  });
}
