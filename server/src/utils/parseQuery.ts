import type { Request } from "express";

export enum QType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
}

type TypeMap = {
  [QType.STRING]: string;
  [QType.NUMBER]: number;
  [QType.BOOLEAN]: boolean;
};

type Schema = Record<string, QType>;

type ParsedQuery<S extends Schema> = {
  [K in keyof S]: TypeMap[S[K]] | undefined;
};

/**
 * Parses req.query against a schema and coerces each value to the declared type.
 * Missing or empty-string values become `undefined`.
 *
 * Usage:
 *   const { search, page, isActive } = parseQuery(req, {
 *     search: QType.STRING,
 *     page: QType.NUMBER,
 *     isActive: QType.BOOLEAN,
 *   });
 */
export function parseQuery<S extends Schema>(req: Request, schema: S): ParsedQuery<S> {
  const result = {} as Record<string, unknown>;

  for (const [key, type] of Object.entries(schema)) {
    const raw = req.query[key];

    if (raw === undefined || raw === "") {
      result[key] = undefined;
      continue;
    }

    const value = String(raw);

    switch (type) {
      case QType.STRING:
        result[key] = value;
        break;
      case QType.NUMBER: {
        const num = Number(value);
        result[key] = Number.isNaN(num) ? undefined : num;
        break;
      }
      case QType.BOOLEAN:
        result[key] = value === "true";
        break;
    }
  }

  return result as ParsedQuery<S>;
}

/**
 * Parses an inclusive `startDate` / `endDate` range from req.query.
 *
 * Both accept an ISO date (`YYYY-MM-DD`) or full ISO timestamp. `start` is
 * pinned to the beginning of that day and `end` to the end of that day
 * (23:59:59.999) so a single-day range still matches rows created later that
 * day. Invalid or missing values become `undefined`.
 */
export function parseDateRange(
  req: Request,
  startKey = "startDate",
  endKey = "endDate",
): { start?: Date; end?: Date } {
  const parse = (raw: unknown, endOfDay: boolean): Date | undefined => {
    if (raw === undefined || raw === "") return undefined;
    const d = new Date(String(raw));
    if (Number.isNaN(d.getTime())) return undefined;
    // A bare `YYYY-MM-DD` parses to midnight UTC; when it's the end bound,
    // extend it to the end of that same day so the range is inclusive.
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(String(raw))) {
      d.setUTCHours(23, 59, 59, 999);
    }
    return d;
  };

  return {
    start: parse(req.query[startKey], false),
    end: parse(req.query[endKey], true),
  };
}

/**
 * Parses sort params from request query.
 * Returns a MongoDB-compatible sort object.
 *
 * @param req - Express request
 * @param allowedFields - Whitelist of sortable fields (prevents injection)
 * @param defaultField - Default sort field
 * @param defaultOrder - Default sort order
 */
export function parseSortParams(
  req: Request,
  allowedFields: string[],
  defaultField = "createdAt",
  defaultOrder: "asc" | "desc" = "desc",
): Record<string, 1 | -1> {
  const rawField = typeof req.query.sortField === "string" ? req.query.sortField : defaultField;
  const rawOrder = typeof req.query.sortOrder === "string" ? req.query.sortOrder : defaultOrder;

  const field = allowedFields.includes(rawField) ? rawField : defaultField;
  const order: 1 | -1 = rawOrder === "asc" ? 1 : -1;

  return { [field]: order };
}
