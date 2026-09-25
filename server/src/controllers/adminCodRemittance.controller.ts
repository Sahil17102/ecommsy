import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { codRemittances } from "../db/schema.js";
import {
  getAdminStats,
  listRemittancesWithUsers,
  listRemittances,
  getRemittancesForExport,
  creditCodRemittanceToWallet,
  updateRemittanceNotes,
  previewSettlementCsv,
  confirmSettlement,
} from "../services/codRemittance.js";
import { parseSortParams } from "../utils/parseQuery.js";

const REMITTANCE_SORT_FIELDS = ["createdAt", "codAmount", "remittableAmount", "collectedAt", "creditedAt"];

// ── Stats ──

export async function handleGetStats(_req: Request, res: Response) {
  const stats = await getAdminStats();
  res.json(stats);
}

// ── List all remittances ──

export async function handleListRemittances(req: Request, res: Response) {
  const sort = parseSortParams(req, REMITTANCE_SORT_FIELDS);
  const result = await listRemittancesWithUsers({
    status: req.query.status as string | undefined,
    search: req.query.search as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sort,
  });
  res.json(result);
}

// ── Get remittances for specific user ──

export async function handleGetUserRemittances(req: Request, res: Response) {
  const sort = parseSortParams(req, REMITTANCE_SORT_FIELDS);
  const result = await listRemittances({
    userId: req.params.userId,
    status: req.query.status as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sort,
  });
  res.json(result);
}

// ── Manual credit ──

export async function handleCreditRemittance(req: Request, res: Response) {
  const existing = await db.query.codRemittances.findFirst({
    where: eq(codRemittances.id, req.params.id),
    columns: { userId: true },
  });
  if (!existing) {
    res.status(404).json({ error: "Remittance not found" });
    return;
  }

  const remittance = await creditCodRemittanceToWallet({
    remittanceId: req.params.id,
    adminId: req.userId!,
    utrNumber: req.body.utrNumber,
    creditDate: req.body.creditDate,
    amount: req.body.amount ? Number(req.body.amount) : undefined,
    notes: req.body.notes,
  });

  res.json({ message: "Remittance credited successfully", remittance });
}

// ── Update notes ──

export async function handleUpdateNotes(req: Request, res: Response) {
  const existing = await db.query.codRemittances.findFirst({
    where: eq(codRemittances.id, req.params.id),
    columns: { userId: true },
  });
  if (!existing) {
    res.status(404).json({ error: "Remittance not found" });
    return;
  }

  const remittance = await updateRemittanceNotes(req.params.id, req.body.notes);
  res.json({ message: "Notes updated", remittance });
}

// ── Preview settlement CSV ──

export async function handlePreviewSettlementCsv(req: Request, res: Response) {
  const rows = req.body.rows as Array<{ awbNumber: string; amount: number }>;
  if (!rows || !Array.isArray(rows)) {
    res.status(400).json({ error: "rows array is required" });
    return;
  }

  const result = await previewSettlementCsv(rows);
  res.json(result);
}

// ── Confirm settlement ──

export async function handleConfirmSettlement(req: Request, res: Response) {
  const { remittanceIds, utrNumber } = req.body;
  if (!remittanceIds || !Array.isArray(remittanceIds) || !utrNumber) {
    res.status(400).json({ error: "remittanceIds array and utrNumber are required" });
    return;
  }

  const result = await confirmSettlement(remittanceIds, utrNumber, req.userId!);
  res.json({
    message: `Credited ${result.credited} remittances, ${result.failed} failed`,
    ...result,
  });
}

// ── CSV Template ──

export async function handleGetCsvTemplate(_req: Request, res: Response) {
  const headers = ["AWB Number", "COD Amount"];
  const sampleRows = [
    ["DEL1234567890", "1000.00"],
    ["DEL9876543210", "750.50"],
    ["XB1122334455", "1250.00"],
  ];

  const csv = [headers, ...sampleRows].map((row) => row.join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=settlement-csv-template.csv");
  res.send(csv);
}

// ── Export CSV ──

export async function handleExportRemittances(req: Request, res: Response) {
  const remittances = await getRemittancesForExport({
    status: req.query.status as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  });

  const csvRows = [
    ["Order Number", "AWB", "Courier", "User ID", "COD Amount", "Remittable Amount", "Status", "UTR", "Collected At", "Credited At"],
    ...remittances.map((r) => [
      r.orderNumber ?? "",
      r.awbNumber ?? "",
      r.courierPartner ?? "",
      r.userId,
      Number(r.codAmount ?? 0).toFixed(2),
      Number(r.remittableAmount ?? 0).toFixed(2),
      r.status,
      r.utrNumber || "",
      r.collectedAt ? new Date(r.collectedAt).toISOString() : "",
      r.creditedAt ? new Date(r.creditedAt).toISOString() : "",
    ]),
  ];

  const csv = csvRows.map((row) => row.join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=cod-remittances-admin.csv");
  res.send(csv);
}
