import type { Request, Response } from "express";
import { parseQuery, QType } from "../utils/parseQuery.js";
import { parseAdminOrderFilters, type AdminOrderFilters } from "../services/orderQuery.js";
import {
  getExportJob,
  listExportJobs,
  queueOrderExport,
  readExportFile,
} from "../services/exports/index.js";

/**
 * POST /admin/orders/export
 * Queues a CSV build and returns straight away — 202 + the job row. The panel
 * polls the history endpoint for progress.
 */
export async function handleQueueOrderExport(req: Request, res: Response) {
  const filters = parseAdminOrderFilters(req);
  const { job, reused } = await queueOrderExport({ filters, requestedBy: req.userId });

  res.status(reused ? 200 : 202).json({
    job,
    reused,
    message: reused
      ? "An identical export is already running — showing that one"
      : "Export queued. It will appear in export history when ready.",
  });
}

/** GET /admin/orders/exports — export history (newest first). */
export async function handleListExportJobs(req: Request, res: Response) {
  const { page, limit, entity } = parseQuery(req, {
    page: QType.NUMBER,
    limit: QType.NUMBER,
    entity: QType.STRING,
  });

  const result = await listExportJobs({ entity: entity ?? "orders", page, limit });
  res.json(result);
}

/** GET /admin/orders/exports/:id — single job (poll target). */
export async function handleGetExportJob(req: Request, res: Response) {
  const job = await getExportJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Export not found" });
    return;
  }
  res.json({ job });
}

/** GET /admin/orders/exports/:id/download — stream the finished CSV. */
export async function handleDownloadExport(req: Request, res: Response) {
  const job = await getExportJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Export not found" });
    return;
  }
  if (job.status !== "completed" || !job.fileKey) {
    res.status(409).json({ error: `Export is ${job.status} — nothing to download yet` });
    return;
  }

  let buffer: Buffer;
  try {
    buffer = await readExportFile(job.fileKey);
  } catch {
    res.status(410).json({ error: "Export file is no longer available — re-run the export" });
    return;
  }

  const fileName = job.fileName || `export-${job.id}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Length", String(buffer.length));
  res.send(buffer);
}

/** POST /admin/orders/exports/:id/rerun — queue a fresh build of the same filters. */
export async function handleRerunExport(req: Request, res: Response) {
  const previous = await getExportJob(req.params.id);
  if (!previous) {
    res.status(404).json({ error: "Export not found" });
    return;
  }

  const { job, reused } = await queueOrderExport({
    filters: (previous.filters ?? {}) as AdminOrderFilters,
    requestedBy: req.userId,
  });
  res.status(reused ? 200 : 202).json({ job, reused });
}
