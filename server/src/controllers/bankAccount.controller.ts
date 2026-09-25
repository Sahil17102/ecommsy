import type { Request, Response } from "express";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { db } from "../config/db.js";
import { bankAccounts } from "../db/schema.js";
import { uploadDocument } from "../services/storage.js";
import { MIME_TO_EXT } from "../config/constants.js";
import logger from "../config/logger.js";

const TAG = "[BankAccountController]";

// Inlined enums (previously in models/BankAccount.ts).
const BankAccountStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

const PaymentMethodType = {
  BANK_ACCOUNT: "bank_account",
  UPI: "upi",
} as const;
type PaymentMethodTypeValue = (typeof PaymentMethodType)[keyof typeof PaymentMethodType];

// ── User-facing handlers ──

/**
 * GET /bank-accounts — List all bank accounts / UPI for the current user.
 */
export async function handleListBankAccounts(req: Request, res: Response) {
  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.userId, req.userId!))
    .orderBy(desc(bankAccounts.isPrimary), desc(bankAccounts.createdAt));
  res.json({ success: true, accounts });
}

/**
 * POST /bank-accounts — Add a new bank account (status = pending).
 * Expects multipart form with optional "cancelledCheque" file field.
 */
export async function handleAddBankAccount(req: Request, res: Response) {
  const {
    type,
    accountHolderName,
    accountNumber,
    ifscCode,
    bankName,
    branchName,
    accountType,
    upiId,
  } = req.body;

  const methodType: PaymentMethodTypeValue =
    type === "upi" ? PaymentMethodType.UPI : PaymentMethodType.BANK_ACCOUNT;

  // Validate based on type
  if (methodType === PaymentMethodType.BANK_ACCOUNT) {
    if (!accountNumber || !ifscCode || !bankName) {
      res.status(400).json({
        success: false,
        error: "Account number, IFSC code, and bank name are required",
      });
      return;
    }

    // Cancelled cheque is mandatory for bank accounts
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "Cancelled cheque upload is mandatory",
      });
      return;
    }

    // Check for duplicate account number
    const existing = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.userId, req.userId!), eq(bankAccounts.accountNumber, accountNumber)),
    });
    if (existing) {
      res.status(400).json({
        success: false,
        error: "This account number is already added",
      });
      return;
    }
  } else {
    if (!upiId) {
      res.status(400).json({
        success: false,
        error: "UPI ID is required",
      });
      return;
    }

    // Check for duplicate UPI ID
    const existing = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.userId, req.userId!), eq(bankAccounts.upiId, upiId.toLowerCase())),
    });
    if (existing) {
      res.status(400).json({
        success: false,
        error: "This UPI ID is already added",
      });
      return;
    }
  }

  // If this is the user's first account, make it primary
  const [{ value: existingCount }] = await db
    .select({ value: count() })
    .from(bankAccounts)
    .where(eq(bankAccounts.userId, req.userId!));

  // Upload cancelled cheque if provided
  let cancelledCheque: { url: string; mime: string } | undefined;
  if (req.file) {
    const ext = MIME_TO_EXT[req.file.mimetype] || "bin";
    const storageKey = `bank-accounts/${req.userId!}/cheque-${Date.now()}.${ext}`;
    await uploadDocument(storageKey, req.file.buffer, req.file.mimetype);
    cancelledCheque = { url: storageKey, mime: req.file.mimetype };
  }

  const [account] = await db
    .insert(bankAccounts)
    .values({
      userId: req.userId!,
      type: methodType,
      accountHolderName,
      ...(methodType === PaymentMethodType.BANK_ACCOUNT
        ? {
            accountNumber,
            ifscCode: ifscCode.toUpperCase(),
            bankName,
            branchName: branchName || undefined,
            accountType: accountType || "current",
            cancelledCheque,
          }
        : {
            upiId: upiId.toLowerCase(),
            upiVerified: true,
          }),
      isPrimary: existingCount === 0,
      status: BankAccountStatus.PENDING,
    })
    .returning();

  logger.info(`${TAG} ${methodType} added — userId=${req.userId} accountId=${account.id}`);
  res.status(201).json({ success: true, account });
}

/**
 * DELETE /bank-accounts/:id — Delete a bank account.
 */
export async function handleDeleteBankAccount(req: Request, res: Response) {
  const account = await db.query.bankAccounts.findFirst({
    where: and(eq(bankAccounts.id, req.params.id), eq(bankAccounts.userId, req.userId!)),
  });

  if (!account) {
    res.status(404).json({ success: false, error: "Bank account not found" });
    return;
  }

  if (account.status === BankAccountStatus.APPROVED && account.isPrimary) {
    res.status(400).json({
      success: false,
      error: "Cannot delete the primary approved bank account",
    });
    return;
  }

  await db.delete(bankAccounts).where(eq(bankAccounts.id, account.id));
  logger.info(`${TAG} Bank account deleted — userId=${req.userId} accountId=${account.id}`);
  res.json({ success: true, message: "Bank account deleted" });
}

/**
 * PATCH /bank-accounts/:id/set-primary — Set a bank account as primary.
 */
export async function handleSetPrimary(req: Request, res: Response) {
  const account = await db.query.bankAccounts.findFirst({
    where: and(eq(bankAccounts.id, req.params.id), eq(bankAccounts.userId, req.userId!)),
  });

  if (!account) {
    res.status(404).json({ success: false, error: "Bank account not found" });
    return;
  }

  // Unset all other primaries
  await db
    .update(bankAccounts)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(and(eq(bankAccounts.userId, req.userId!), ne(bankAccounts.id, account.id)));

  const [updated] = await db
    .update(bankAccounts)
    .set({ isPrimary: true, updatedAt: new Date() })
    .where(eq(bankAccounts.id, account.id))
    .returning();

  logger.info(`${TAG} Primary bank account set — userId=${req.userId} accountId=${updated.id}`);
  res.json({ success: true, account: updated });
}

// ── Admin handlers ──

/**
 * GET /admin/bank-accounts/user/:userId — List a user's bank accounts.
 */
export async function handleAdminListBankAccounts(req: Request, res: Response) {
  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.userId, req.params.userId))
    .orderBy(desc(bankAccounts.createdAt));
  res.json({ success: true, accounts });
}

/**
 * POST /admin/bank-accounts/:id/approve — Approve a bank account.
 */
export async function handleAdminApproveBankAccount(req: Request, res: Response) {
  const [updated] = await db
    .update(bankAccounts)
    .set({ status: BankAccountStatus.APPROVED, rejectionReason: null, updatedAt: new Date() })
    .where(eq(bankAccounts.id, req.params.id))
    .returning();

  if (!updated) {
    res.status(404).json({ success: false, error: "Bank account not found" });
    return;
  }

  logger.info(`${TAG} Bank account approved — accountId=${updated.id} userId=${updated.userId}`);
  res.json({ success: true, account: updated });
}

/**
 * POST /admin/bank-accounts/:id/reject — Reject a bank account.
 */
export async function handleAdminRejectBankAccount(req: Request, res: Response) {
  const [updated] = await db
    .update(bankAccounts)
    .set({
      status: BankAccountStatus.REJECTED,
      rejectionReason: req.body.rejectionReason || "Rejected by admin",
      updatedAt: new Date(),
    })
    .where(eq(bankAccounts.id, req.params.id))
    .returning();

  if (!updated) {
    res.status(404).json({ success: false, error: "Bank account not found" });
    return;
  }

  logger.info(`${TAG} Bank account rejected — accountId=${updated.id} userId=${updated.userId}`);
  res.json({ success: true, account: updated });
}
