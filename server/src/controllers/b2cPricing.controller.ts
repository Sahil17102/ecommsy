import type { Request, Response } from "express";
import {
  listPricing,
  getPricingByCourier,
  upsertPricing,
  batchUpsertPricing,
  deletePricing,
} from "../services/b2cPricing.js";

export async function handleListPricing(req: Request, res: Response) {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const plan = req.query.plan as string | undefined;
  const courier = req.query.courier as string | undefined;
  const serviceProvider = req.query.serviceProvider as string | undefined;
  const mode = req.query.mode as string | undefined;
  const minWeight = req.query.minWeight ? Number(req.query.minWeight) : undefined;

  const result = await listPricing({ page, limit, plan, courier, serviceProvider, mode, minWeight });
  res.json(result);
}

export async function handleGetPricingByCourier(req: Request, res: Response) {
  const plan = req.query.plan as string | undefined;
  const doc = await getPricingByCourier(req.params.courierId, plan);

  // If plan was specified, return single pricing; otherwise return array
  if (plan) {
    res.json({ pricing: doc });
  } else {
    res.json({ pricing: doc });
  }
}

export async function handleUpsertPricing(req: Request, res: Response) {
  const doc = await upsertPricing(req.body);
  res.json({
    message: "Pricing saved",
    pricing: { id: doc._id, courier: doc.courier, plan: doc.plan },
  });
}

export async function handleBatchUpsertPricing(req: Request, res: Response) {
  const result = await batchUpsertPricing(req.body);
  res.json({
    message: `Pricing saved for ${result.saved} plan(s)`,
    ...result,
  });
}

export async function handleDeletePricing(req: Request, res: Response) {
  await deletePricing(req.params.id);
  res.json({ message: "Pricing deleted" });
}
