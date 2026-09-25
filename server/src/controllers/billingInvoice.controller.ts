import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { billingInvoices } from "../db/schema.js";
import {
  listInvoices,
  generateInvoiceForUser,
  getInvoiceOrders,
  getOrCreateBillingPreference,
  updateBillingPreference,
} from "../services/billingInvoice.js";
import { downloadDocument } from "../services/storage.js";
import { isStorageConfigured } from "../config/storage.js";
import { parseSortParams } from "../utils/parseQuery.js";

const INVOICE_SORT_FIELDS = ["createdAt", "totalAmount", "netPayable", "periodStart"];

// ── Helper: verify ownership ──

async function verifyOwnership(invoiceId: string, userId: string): Promise<boolean> {
  const invoice = await db.query.billingInvoices.findFirst({
    where: eq(billingInvoices.id, invoiceId),
    columns: { userId: true },
  });
  return invoice?.userId === userId;
}

// ── Seller: list invoices ──

export async function handleGetMyInvoices(req: Request, res: Response) {
  const sort = parseSortParams(req, INVOICE_SORT_FIELDS);
  const result = await listInvoices({
    userId: req.userId!,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sort,
  });
  res.json(result);
}

// ── Seller: get invoice orders ──

export async function handleGetMyInvoiceOrders(req: Request, res: Response) {
  if (!(await verifyOwnership(req.params.id, req.userId!))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const result = await getInvoiceOrders(req.params.id);
  res.json(result);
}

// ── Seller: download invoice document (PDF/CSV) ──

export async function handleDownloadInvoiceDoc(req: Request, res: Response) {
  if (!(await verifyOwnership(req.params.id, req.userId!))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const type = req.params.type as "pdf" | "csv";
  const invoice = await db.query.billingInvoices.findFirst({
    where: eq(billingInvoices.id, req.params.id),
    columns: { pdfUrl: true, csvUrl: true, invoiceNumber: true },
  });
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

  const key = type === "pdf" ? invoice.pdfUrl : invoice.csvUrl;
  if (!key || !isStorageConfigured()) {
    res.status(404).json({ error: "Document not available" });
    return;
  }

  const { buffer, contentType } = await downloadDocument(key);
  const filename = `${invoice.invoiceNumber}.${type}`;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

// ── Seller: generate manual invoice ──

export async function handleGenerateMyInvoice(req: Request, res: Response) {
  const { periodStart, periodEnd } = req.body;
  const invoice = await generateInvoiceForUser(req.userId!, {
    startDate: new Date(periodStart),
    endDate: new Date(periodEnd),
  });
  res.json({ message: "Invoice generated", invoice });
}

// ── Seller: get billing preference ──

export async function handleGetBillingPreference(req: Request, res: Response) {
  const pref = await getOrCreateBillingPreference(req.userId!);
  res.json(pref);
}

// ── Seller: update billing preference ──

export async function handleUpdateBillingPreference(req: Request, res: Response) {
  const { frequency, autoGenerate, customFrequencyDays } = req.body;
  const pref = await updateBillingPreference(req.userId!, {
    frequency,
    autoGenerate,
    customFrequencyDays,
  });
  res.json({ message: "Billing preference updated", ...pref });
}
