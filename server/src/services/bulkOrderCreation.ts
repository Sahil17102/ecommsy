import { createOrder, type CreateOrderInput } from "./orderCreation.js";
import { orders } from "../db/schema.js";
import { AppError } from "../utils/AppError.js";
import logger from "../config/logger.js";

const TAG = "[BulkOrderCreation]";

type OrderRow = typeof orders.$inferSelect;

export interface BulkCreateRowResult {
  rowNumber: number;
  orderId: string;
  success: boolean;
  order?: OrderRow;
  error?: string;
}

export interface BulkCreateResult {
  total: number;
  successCount: number;
  failedCount: number;
  results: BulkCreateRowResult[];
}

/**
 * Sequential bulk creation. Per-row error isolation — a failed row never blocks
 * subsequent rows. Sequential (not parallel) to keep wallet debits race-free.
 * Duplicates are detected both within the request (in-memory Map) and against
 * the DB (handled inside createOrder).
 */
async function bulkCreate(
  rows: Array<Omit<CreateOrderInput, "userId">>,
  userId: string,
  flow: "B2C" | "B2B",
): Promise<BulkCreateResult> {
  const start = Date.now();
  logger.info(`${TAG} Starting bulk ${flow} create — userId=${userId}, rows=${rows.length}`);

  const results: BulkCreateRowResult[] = [];
  const seen = new Map<string, number>(); // normalized orderId → rowNumber

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const normalizedId = (row.orderId || "").trim().toLowerCase();

    // In-request duplicate detection
    if (seen.has(normalizedId)) {
      results.push({
        rowNumber,
        orderId: row.orderId,
        success: false,
        error: `Duplicate of row ${seen.get(normalizedId)} in this upload`,
      });
      continue;
    }
    seen.set(normalizedId, rowNumber);

    try {
      const order = await createOrder({ ...row, userId });
      results.push({ rowNumber, orderId: row.orderId, success: true, order });
    } catch (err) {
      const message = err instanceof AppError ? err.message : (err as Error).message || "Unknown error";
      logger.warn(`${TAG} Row ${rowNumber} (${row.orderId}) failed — ${message}`);
      results.push({ rowNumber, orderId: row.orderId, success: false, error: message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successCount;
  logger.info(
    `${TAG} Bulk ${flow} complete — ${successCount}/${rows.length} succeeded in ${Date.now() - start}ms`,
  );

  return { total: rows.length, successCount, failedCount, results };
}

export function bulkCreateB2COrders(rows: Array<Omit<CreateOrderInput, "userId">>, userId: string) {
  return bulkCreate(rows, userId, "B2C");
}

export function bulkCreateB2BOrders(rows: Array<Omit<CreateOrderInput, "userId">>, userId: string) {
  return bulkCreate(rows, userId, "B2B");
}
