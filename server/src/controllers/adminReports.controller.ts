import type { Request, Response } from "express";
import {
  ALL_FIELDS,
  countMatchingOrders,
  streamOrdersAsCsv,
  type ReportFilters,
} from "../services/reports.service.js";

/** GET /admin/reports/fields — Return available field definitions */
export async function handleAdminGetReportFields(_req: Request, res: Response) {
  const fields = ALL_FIELDS.map((f) => ({ key: f.key, label: f.label }));
  res.json({ fields });
}

/** POST /admin/reports/generate — Stream a CSV report (global, optional userId filter) */
export async function handleAdminGenerateReport(req: Request, res: Response) {
  const { fields, filters: extraFilters, from, to } = req.body as {
    fields: string[];
    from: string;
    to: string;
    filters?: Omit<ReportFilters, "from" | "to">;
  };

  const filters: ReportFilters = {
    ...(extraFilters ?? {}),
    from,
    to,
  };

  await streamOrdersAsCsv({ userId: null, fieldKeys: fields, filters, res });
}

/** GET /admin/reports/preview — Return count of orders matching filters */
export async function handleAdminGetReportPreview(req: Request, res: Response) {
  const { from, to, status, paymentType, orderType, courier, userId } = req.query;

  const filters: ReportFilters = {
    from: from as string,
    to: to as string,
    status: status ? (status as string).split(",") : undefined,
    paymentType: paymentType ? (paymentType as string).split(",") : undefined,
    orderType: orderType as string | undefined,
    courier: courier ? (courier as string).split(",") : undefined,
    userId: userId as string | undefined,
  };

  const count = await countMatchingOrders(null, filters);
  res.json({ count });
}
