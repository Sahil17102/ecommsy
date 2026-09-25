import type { Request, Response } from "express";
import {
  getSellerStats,
  listRemittances,
  getRemittancesForExport,
} from "../services/codRemittance.js";
import { parseSortParams } from "../utils/parseQuery.js";

const REMITTANCE_SORT_FIELDS = ["createdAt", "codAmount", "remittableAmount", "collectedAt", "creditedAt"];

// ── Seller: get stats ──

export async function handleGetMyStats(req: Request, res: Response) {
  const stats = await getSellerStats(req.userId!);
  res.json(stats);
}

// ── Seller: list remittances ──

export async function handleGetMyRemittances(req: Request, res: Response) {
  const sort = parseSortParams(req, REMITTANCE_SORT_FIELDS);
  const result = await listRemittances({
    userId: req.userId!,
    status: req.query.status as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sort,
  });
  res.json(result);
}

// ── Seller: export remittances ──

export async function handleExportMyRemittances(req: Request, res: Response) {
  const remittances = await getRemittancesForExport({
    userId: req.userId!,
    status: req.query.status as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  });

  const csvRows = [
    ["Order Number", "AWB", "Courier", "COD Amount", "Remittable Amount", "Status", "Collected At", "Credited At"],
    ...remittances.map((r) => [
      r.orderNumber,
      r.awbNumber,
      r.courierPartner,
      r.codAmount != null ? Number(r.codAmount).toFixed(2) : "0.00",
      r.remittableAmount != null ? Number(r.remittableAmount).toFixed(2) : "0.00",
      r.status,
      r.collectedAt ? new Date(r.collectedAt).toISOString() : "",
      r.creditedAt ? new Date(r.creditedAt).toISOString() : "",
    ]),
  ];

  const csv = csvRows.map((row) => row.join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=cod-remittances.csv");
  res.send(csv);
}

// ── Seller: export single remittance receipt ──

export async function handleExportSingleRemittance(req: Request, res: Response) {

  const result = await listRemittances({
    userId: req.userId!,
  });

  const remittance = result.remittances.find(
    (r) => r.id === req.params.id,
  );

  if (!remittance) {
    res.status(404).json({ error: "Remittance not found" });
    return;
  }

  const receipt = {
    orderNumber: remittance.orderNumber,
    awbNumber: remittance.awbNumber,
    courierPartner: remittance.courierPartner,
    codAmount: remittance.codAmount,
    remittableAmount: remittance.remittableAmount,
    status: remittance.status,
    collectedAt: remittance.collectedAt,
    creditedAt: remittance.creditedAt,
    walletTransactionId: remittance.walletTransactionId?.toString(),
    utrNumber: remittance.utrNumber,
  };

  res.json(receipt);
}
