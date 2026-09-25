import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { billingInvoices } from "../db/schema.js";
import {
  listInvoicesWithUsers,
  generateInvoiceForUser,
  voidInvoice,
  getInvoiceOrders,
} from "../services/billingInvoice.js";
import { downloadDocument } from "../services/storage.js";
import { isStorageConfigured } from "../config/storage.js";
import { parseSortParams } from "../utils/parseQuery.js";

const INVOICE_SORT_FIELDS = ["createdAt", "totalAmount", "netPayable", "periodStart"];

// ── List all invoices ──

export async function handleListInvoices(req: Request, res: Response) {
  const sort = parseSortParams(req, INVOICE_SORT_FIELDS);
  const result = await listInvoicesWithUsers({
    search: req.query.search as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sort,
  });
  res.json(result);
}

// ── Get invoice orders ──

export async function handleGetInvoiceOrders(req: Request, res: Response) {
  const invoice = await db.query.billingInvoices.findFirst({
    where: eq(billingInvoices.id, req.params.id),
    columns: { userId: true },
  });
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
  const result = await getInvoiceOrders(req.params.id);
  res.json(result);
}

// ── Download invoice document ──

export async function handleDownloadInvoiceDoc(req: Request, res: Response) {
  const type = req.params.type as "pdf" | "csv";
  const invoice = await db.query.billingInvoices.findFirst({
    where: eq(billingInvoices.id, req.params.id),
    columns: { pdfUrl: true, csvUrl: true, invoiceNumber: true, userId: true },
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

// ── Void invoice ──

export async function handleVoidInvoice(req: Request, res: Response) {
  const existing = await db.query.billingInvoices.findFirst({
    where: eq(billingInvoices.id, req.params.id),
    columns: { userId: true, invoiceNumber: true },
  });
  if (!existing) { res.status(404).json({ error: "Invoice not found" }); return; }
  const invoice = await voidInvoice(req.params.id);
  res.json({ message: "Invoice voided", invoice });
}

// ── Generate invoice for a user ──

export async function handleGenerateInvoice(req: Request, res: Response) {
  const { userId, periodStart, periodEnd, taxRate } = req.body;

  const invoice = await generateInvoiceForUser(userId, {
    startDate: new Date(periodStart),
    endDate: new Date(periodEnd),
    taxRate: taxRate ? Number(taxRate) : undefined,
  });
  res.json({ message: "Invoice generated", invoice });
}
