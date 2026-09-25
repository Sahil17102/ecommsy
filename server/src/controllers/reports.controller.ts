import type { Request, Response } from "express";
import {
  ALL_FIELDS,
  countMatchingOrders,
  streamOrdersAsCsv,
  type ReportFilters,
} from "../services/reports.service.js";

/** GET /reports/fields — Return available field definitions */
export async function handleGetReportFields(_req: Request, res: Response) {
  const fields = ALL_FIELDS.map((f) => ({ key: f.key, label: f.label }));
  res.json({ fields });
}

/** POST /reports/generate — Stream a CSV report */
export async function handleGenerateReport(req: Request, res: Response) {
  const userId = req.userId!;
  const { fields, filters: extraFilters, from, to } = req.body as {
    fields: string[];
    from: string;
    to: string;
    filters?: Omit<ReportFilters, "from" | "to">;
  };

  const filters: ReportFilters = { ...(extraFilters ?? {}), from, to };

  await streamOrdersAsCsv({ userId, fieldKeys: fields, filters, res });
}

/** GET /reports/preview — Return count of orders matching filters */
export async function handleGetReportPreview(req: Request, res: Response) {
  const userId = req.userId!;
  const { from, to, status, paymentType, orderType, courier } = req.query;

  const filters: ReportFilters = {
    from: from as string,
    to: to as string,
    status: status ? (status as string).split(",") : undefined,
    paymentType: paymentType ? (paymentType as string).split(",") : undefined,
    orderType: orderType as string | undefined,
    courier: courier ? (courier as string).split(",") : undefined,
  };

  const count = await countMatchingOrders(userId, filters);
  res.json({ count });
}
