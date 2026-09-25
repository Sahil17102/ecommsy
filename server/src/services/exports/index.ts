import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { and, asc, count, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "../../config/db.js";
import { exportJobs, users } from "../../db/schema.js";
import logger from "../../config/logger.js";
import { isStorageConfigured } from "../../config/storage.js";
import { deleteDocument, downloadDocument, uploadDocument } from "../storage.js";
import {
  normalizeAdminOrderFilters,
  type AdminOrderFilters,
} from "../orderQuery.js";
import { CSV_BOM, csvHeaderLine, csvRowLine } from "./csv.js";
import {
  ORDER_EXPORT_COLUMNS,
  countOrderExportRows,
  streamOrderExportRows,
} from "./orderExport.js";

const TAG = "[Exports]";

export type ExportJobRow = typeof exportJobs.$inferSelect;
export type ExportStatus = "queued" | "processing" | "completed" | "failed" | "expired";

/** Hard bound so one careless "export everything" can't chew the box. */
const MAX_ROWS = Number(process.env.EXPORT_MAX_ROWS) || 200_000;
const BATCH_SIZE = Number(process.env.EXPORT_BATCH_SIZE) || 1000;
const RETENTION_DAYS = Number(process.env.EXPORT_RETENTION_DAYS) || 7;
/** A job still "processing" after this long is treated as dead. */
const STALL_MINUTES = Number(process.env.EXPORT_STALL_MINUTES) || 30;

function exportDir(): string {
  return process.env.EXPORT_DIR || path.resolve(process.cwd(), "tmp/exports");
}

/* ─────────────────────────── Queueing ─────────────────────────── */

/**
 * Queue an orders CSV export. Returns immediately — the file is built by the
 * in-process worker below, so the HTTP request never waits on the database
 * walk that used to blow the gateway timeout.
 *
 * An identical filter set that is still queued/processing for the same admin
 * is handed back instead of starting a second identical walk (double-clicking
 * Export is the common case).
 */
export async function queueOrderExport(input: {
  filters: AdminOrderFilters;
  requestedBy?: string | null;
}): Promise<{ job: ExportJobRow; reused: boolean }> {
  const filters = normalizeAdminOrderFilters(input.filters);

  const [existing] = await db
    .select()
    .from(exportJobs)
    .where(
      and(
        eq(exportJobs.entity, "orders"),
        inArray(exportJobs.status, ["queued", "processing"]),
        input.requestedBy ? eq(exportJobs.requestedBy, input.requestedBy) : sql`true`,
        sql`${exportJobs.filters} = ${JSON.stringify(filters)}::jsonb`,
      ),
    )
    .limit(1);

  if (existing) {
    kickExportWorker();
    return { job: existing, reused: true };
  }

  const [job] = await db
    .insert(exportJobs)
    .values({
      entity: "orders",
      requestedBy: input.requestedBy ?? null,
      filters: filters as Record<string, unknown>,
      status: "queued",
      expiresAt: new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    })
    .returning();

  logger.info(`${TAG} Queued export ${job.id} — ${JSON.stringify(filters)}`);
  kickExportWorker();
  return { job, reused: false };
}

/* ──────────────────────────── Worker ──────────────────────────── */

let workerRunning = false;
/** A kick that arrived mid-drain — the drain re-checks the queue before exiting. */
let wakeRequested = false;
/** Last time the drain loop made progress; used to spot a wedged worker. */
let lastWorkerActivity = 0;

/**
 * Nudge the worker.
 *
 * A kick that lands while a drain is in flight can't just be dropped: the drain
 * may already be past its "anything queued?" check, and the job would then sit
 * untouched until the next restart. So mark a pending wake instead and let the
 * drain loop around. If a previous drain has been wedged (a hung query, say)
 * past the stall window, abandon it and start fresh rather than staying silent
 * forever.
 */
export function kickExportWorker(): void {
  if (workerRunning) {
    const wedgedFor = Date.now() - lastWorkerActivity;
    if (wedgedFor < STALL_MINUTES * 60 * 1000) {
      wakeRequested = true;
      return;
    }
    logger.warn(`${TAG} Worker showed no activity for ${Math.round(wedgedFor / 1000)}s — starting a fresh drain`);
  }

  workerRunning = true;
  wakeRequested = false;
  lastWorkerActivity = Date.now();
  void drainQueue()
    .catch((err) => logger.error(`${TAG} Worker crashed — ${(err as Error).message}`))
    .finally(() => {
      workerRunning = false;
      // Something queued while we were finishing up — go again.
      if (wakeRequested) kickExportWorker();
    });
}

async function drainQueue(): Promise<void> {
  for (;;) {
    wakeRequested = false;
    lastWorkerActivity = Date.now();

    const [next] = await db
      .select({ id: exportJobs.id })
      .from(exportJobs)
      .where(eq(exportJobs.status, "queued"))
      .orderBy(asc(exportJobs.createdAt))
      .limit(1);

    if (!next) return;
    logger.info(`${TAG} Picking up queued export ${next.id}`);

    // Status-conditional claim — two workers (or a restarted process) can
    // never pick up the same job.
    const [claimed] = await db
      .update(exportJobs)
      .set({ status: "processing", startedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(exportJobs.id, next.id), eq(exportJobs.status, "queued")))
      .returning();

    if (!claimed) continue;

    await runJob(claimed);
    lastWorkerActivity = Date.now();
  }
}

async function runJob(job: ExportJobRow): Promise<void> {
  const start = Date.now();
  const filters = (job.filters ?? {}) as AdminOrderFilters;
  logger.info(`${TAG} Building export ${job.id} (${job.entity})`);

  try {
    const countStart = Date.now();
    const total = await countOrderExportRows(filters);
    logger.info(`${TAG} Export ${job.id} — ${total} row(s) to write (count took ${Date.now() - countStart}ms)`);
    await patchJob(job.id, { totalRows: total }, "processing");

    const { filePath, rowCount, byteSize } = await writeOrdersCsv(job.id, filters, async (done) => {
      logger.info(`${TAG} Export ${job.id} — ${done}/${total} rows written`);
      await patchJob(job.id, { processedRows: done }, "processing");
    });

    const fileName = buildFileName(filters);
    const fileKey = await persistExport(job.id, filePath);

    const [updated] = await db
      .update(exportJobs)
      .set({
        status: "completed",
        processedRows: rowCount,
        fileKey,
        fileName,
        fileSize: byteSize,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(exportJobs.id, job.id), eq(exportJobs.status, "processing")))
      .returning();

    if (!updated) {
      // Job was cancelled/expired underneath us — don't leave the file behind.
      await removeExportFile(fileKey);
      logger.warn(`${TAG} Export ${job.id} finished but was no longer processing — file discarded`);
      return;
    }

    logger.info(`${TAG} Export ${job.id} completed — ${rowCount} rows, ${byteSize} bytes (${Date.now() - start}ms)`);
  } catch (err) {
    const messageText = (err as Error).message || "Export failed";
    logger.error(`${TAG} Export ${job.id} failed — ${messageText}`);
    // Don't leave a half-written temp file behind.
    await unlink(path.join(exportDir(), `${job.id}.csv`)).catch(() => undefined);
    await db
      .update(exportJobs)
      .set({ status: "failed", error: readableError(messageText), completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(exportJobs.id, job.id), eq(exportJobs.status, "processing")));
  }
}

/**
 * The panel shows this string to an admin, so an OpenSSL stack reference is
 * worse than useless. Keep the raw text in the log and show what to do.
 */
function readableError(message: string): string {
  if (/ssl|tls|bad record mac|socket hang up|ECONNRESET|EPIPE|ETIMEDOUT/i.test(message)) {
    return "A network error interrupted the export — please re-run it";
  }
  return message.slice(0, 500);
}

/** Only ever writes to a job that is still in the expected state. */
async function patchJob(
  id: string,
  values: Partial<typeof exportJobs.$inferInsert>,
  expectedStatus: ExportStatus,
): Promise<void> {
  await db
    .update(exportJobs)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(exportJobs.id, id), eq(exportJobs.status, expectedStatus)));
}

/**
 * Stream the CSV straight to a temp file rather than assembling it in memory —
 * a 200k-row export is ~50MB of text we never need to hold at once.
 */
async function writeOrdersCsv(
  jobId: string,
  filters: AdminOrderFilters,
  onProgress: (rows: number) => Promise<void>,
): Promise<{ filePath: string; rowCount: number; byteSize: number }> {
  const dir = exportDir();
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${jobId}.csv`);
  const stream = createWriteStream(filePath, { encoding: "utf8" });

  const write = (chunk: string) =>
    new Promise<void>((resolve, reject) => {
      stream.write(chunk, (err) => (err ? reject(err) : resolve()));
    });

  let rowCount = 0;
  try {
    await write(CSV_BOM + csvHeaderLine(ORDER_EXPORT_COLUMNS) + "\n");

    for await (const batch of streamOrderExportRows(filters, { batchSize: BATCH_SIZE, maxRows: MAX_ROWS })) {
      await write(batch.map((row) => csvRowLine(ORDER_EXPORT_COLUMNS, row)).join("\n") + "\n");
      rowCount += batch.length;
      await onProgress(rowCount);
    }
  } finally {
    await new Promise<void>((resolve) => stream.end(resolve));
  }

  const { size } = await stat(filePath);
  return { filePath, rowCount, byteSize: size };
}

function buildFileName(filters: AdminOrderFilters): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const scope = filters.status ? `-${filters.status}` : "";
  return `orders${scope}-${stamp}.csv`;
}

/* ─────────────────────────── Storage ──────────────────────────── */

/**
 * Move the finished file to its resting place. S3 when configured (so the file
 * survives a redeploy), otherwise it just stays on local disk.
 *
 * An upload that fails after every retry is *not* a failed export: the CSV is
 * already sitting on disk, complete. Keeping it locally hands the admin a
 * working download instead of throwing away a walk that may have taken
 * minutes — the only thing lost is surviving a redeploy.
 */
async function persistExport(jobId: string, filePath: string): Promise<string> {
  if (!isStorageConfigured()) return `local:${filePath}`;

  const key = `exports/orders/${jobId}.csv`;
  try {
    const buffer = await readFile(filePath);
    await uploadDocument(key, buffer, "text/csv; charset=utf-8");
  } catch (err) {
    logger.warn(
      `${TAG} Export ${jobId} could not be uploaded to S3 (${(err as Error).message}) — serving it from local disk instead`,
    );
    return `local:${filePath}`;
  }
  await unlink(filePath).catch(() => undefined);
  return `s3:${key}`;
}

/** Read a finished export back out for download. */
export async function readExportFile(fileKey: string): Promise<Buffer> {
  if (fileKey.startsWith("s3:")) {
    const { buffer } = await downloadDocument(fileKey.slice(3));
    return buffer;
  }
  return readFile(fileKey.replace(/^local:/, ""));
}

async function removeExportFile(fileKey: string | null): Promise<void> {
  if (!fileKey) return;
  if (fileKey.startsWith("s3:")) {
    await deleteDocument(fileKey.slice(3));
    return;
  }
  await unlink(fileKey.replace(/^local:/, "")).catch(() => undefined);
}

/* ──────────────────────── Reads & upkeep ──────────────────────── */

export interface ExportJobView extends ExportJobRow {
  requestedByName: string | null;
}

/** Newest-first history for the side panel. */
export async function listExportJobs(params: {
  entity?: string;
  page?: number;
  limit?: number;
}): Promise<{ jobs: ExportJobView[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const where = params.entity ? eq(exportJobs.entity, params.entity) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        job: exportJobs,
        requestedByName: sql<string | null>`coalesce(${users.businessName}, ${users.name}, ${users.email})`,
      })
      .from(exportJobs)
      .leftJoin(users, eq(users.id, exportJobs.requestedBy))
      .where(where)
      .orderBy(desc(exportJobs.createdAt))
      .offset((page - 1) * limit)
      .limit(limit),
    db.select({ value: count() }).from(exportJobs).where(where),
  ]);

  const total = Number(totalRow[0]?.value ?? 0);
  return {
    jobs: rows.map((r) => ({ ...r.job, requestedByName: r.requestedByName })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function getExportJob(id: string): Promise<ExportJobRow | null> {
  const [row] = await db.select().from(exportJobs).where(eq(exportJobs.id, id)).limit(1);
  return row ?? null;
}

/**
 * A process that dies mid-export leaves a job stuck in "processing" forever.
 * Put those back in the queue on boot, then drain.
 */
export async function recoverInterruptedExports(): Promise<void> {
  const requeued = await db
    .update(exportJobs)
    .set({ status: "queued", processedRows: 0, startedAt: null, updatedAt: new Date() })
    .where(eq(exportJobs.status, "processing"))
    .returning({ id: exportJobs.id });

  if (requeued.length) logger.info(`${TAG} Re-queued ${requeued.length} interrupted export(s)`);
  kickExportWorker();
}

/**
 * Fail exports that have been "processing" far longer than any real export
 * takes — a database connection that hangs would otherwise pin a job (and the
 * panel's progress bar) forever. If the original run does eventually finish,
 * its status-guarded write fails and it discards its own file.
 */
export async function failStalledExports(): Promise<void> {
  const cutoff = new Date(Date.now() - STALL_MINUTES * 60 * 1000);
  const stalled = await db
    .update(exportJobs)
    .set({
      status: "failed",
      error: `Export stalled for over ${STALL_MINUTES} minutes and was abandoned — please re-run it`,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(exportJobs.status, "processing"), lt(exportJobs.startedAt, cutoff)))
    .returning({ id: exportJobs.id });

  if (stalled.length) logger.warn(`${TAG} Abandoned ${stalled.length} stalled export(s)`);
  kickExportWorker();
}

/** Drop expired files and mark their rows — keeps the bucket from growing forever. */
export async function purgeExpiredExports(): Promise<void> {
  const stale = await db
    .select({ id: exportJobs.id, fileKey: exportJobs.fileKey })
    .from(exportJobs)
    .where(and(eq(exportJobs.status, "completed"), lt(exportJobs.expiresAt, new Date())))
    .limit(500);

  for (const job of stale) {
    await removeExportFile(job.fileKey);
    await db
      .update(exportJobs)
      .set({ status: "expired", fileKey: null, updatedAt: new Date() })
      .where(and(eq(exportJobs.id, job.id), eq(exportJobs.status, "completed")));
  }

  if (stale.length) logger.info(`${TAG} Purged ${stale.length} expired export(s)`);
}

export { MAX_ROWS as EXPORT_MAX_ROWS };
