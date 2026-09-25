import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getRazorpay } from "../config/razorpay.js";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { createWalletTransaction, getWalletByUserId, TransactionType } from "./wallet.js";
import { AppError } from "../utils/AppError.js";
import logger from "../config/logger.js";

// ── Minimum / maximum recharge amounts (in ₹) ──

export const MIN_RECHARGE_AMOUNT = 100;
export const MAX_RECHARGE_AMOUNT = 500_000;

// ── Create a Razorpay order for wallet recharge ──

export async function createRechargeOrder(opts: {
  userId: string;
  amount: number;
}): Promise<{
  orderId: string;
  amount: number;
  currency: string;
}> {
  const { userId, amount } = opts;

  if (amount < MIN_RECHARGE_AMOUNT || amount > MAX_RECHARGE_AMOUNT) {
    throw new AppError(
      400,
      `Recharge amount must be between ₹${MIN_RECHARGE_AMOUNT} and ₹${MAX_RECHARGE_AMOUNT.toLocaleString("en-IN")}`,
    );
  }

  // Ensure wallet exists
  await getWalletByUserId(userId);

  // Razorpay expects amount in paise
  const rzp = getRazorpay();
  const order = await rzp.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: `rch_${userId.slice(-8)}_${Date.now().toString(36)}`,
    notes: {
      userId,
      purpose: "wallet_recharge",
    },
  });

  logger.info(
    `[Recharge] Created Razorpay order=${order.id} userId=${userId} amount=₹${amount}`,
  );

  return {
    orderId: order.id,
    amount,
    currency: "INR",
  };
}

// ── Verify payment and credit wallet ──

export async function verifyAndCreditWallet(opts: {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<{ balance: number; creditedAmount: number }> {
  const { userId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = opts;

  // Verify signature
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    logger.warn(
      `[Recharge] Signature mismatch userId=${userId} orderId=${razorpayOrderId} expected=${expectedSignature} received=${razorpaySignature}`,
    );
    throw new AppError(400, "Payment verification failed — invalid signature");
  }

  // Fetch payment to get amount (more reliable than order status in test mode)
  const rzp = getRazorpay();
  const payment = await rzp.payments.fetch(razorpayPaymentId);

  if (payment.status !== "captured" && payment.status !== "authorized") {
    logger.warn(
      `[Recharge] Payment not successful userId=${userId} paymentId=${razorpayPaymentId} status=${payment.status}`,
    );
    throw new AppError(400, `Payment not completed (status: ${payment.status})`);
  }

  const amountInRupees = Number(payment.amount) / 100;

  // Credit wallet (idempotent ref prevents double-credit)
  const wallet = await getWalletByUserId(userId);
  const ref = `razorpay_${razorpayPaymentId}`;

  await createWalletTransaction({
    walletId: wallet.id,
    amount: amountInRupees,
    type: TransactionType.CREDIT,
    reason: "Wallet recharge via Razorpay",
    ref,
    meta: {
      razorpayOrderId,
      razorpayPaymentId,
      method: "razorpay",
    },
  });

  // Read updated balance
  const updatedWallet = await getWalletByUserId(userId);
  const newBalance = Number(updatedWallet.balance);

  logger.info(
    `[Recharge] Credited ₹${amountInRupees} userId=${userId} paymentId=${razorpayPaymentId} newBalance=₹${newBalance}`,
  );

  const { notifyAsync, notifyAdmins } = await import("./notificationService.js");
  notifyAsync({
    userId,
    event: "wallet.recharged",
    data: { amount: amountInRupees, balance: newBalance },
  });

  (async () => {
    const seller = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { name: true, firstName: true, email: true },
    });
    notifyAdmins("admin.wallet_recharged", {
      amount: amountInRupees,
      sellerName: seller?.name ?? seller?.firstName ?? "A seller",
    });
  })().catch(() => {});

  return {
    balance: newBalance,
    creditedAmount: amountInRupees,
  };
}
