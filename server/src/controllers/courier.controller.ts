import type { Request, Response } from "express";
import { asc, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { couriers } from "../db/schema.js";
import {
  listCouriers,
  createCourier,
  updateCourier,
  deleteCourier,
  toggleCourier,
} from "../services/courier.js";

/**
 * GET /couriers — the courier catalogue a seller can book with.
 *
 * Separate from the admin listing on purpose: sellers see only enabled
 * couriers and only the fields they need to pick one, never the internal
 * metadata or the disabled catalogue.
 */
export async function handleListSellerCouriers(_req: Request, res: Response) {
  const rows = await db
    .select({
      id: couriers.id,
      name: couriers.name,
      serviceProvider: couriers.serviceProvider,
      courierType: couriers.courierType,
      businessType: couriers.businessType,
      logo: couriers.logo,
    })
    .from(couriers)
    .where(eq(couriers.isEnabled, true))
    .orderBy(asc(couriers.name));

  res.json({ success: true, couriers: rows });
}

export async function handleListCouriers(req: Request, res: Response) {
  const serviceProvider = req.query.serviceProvider as string | undefined;
  const businessType = req.query.businessType as string | undefined;
  const isEnabled = req.query.isEnabled === "true" ? true : req.query.isEnabled === "false" ? false : undefined;
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const result = await listCouriers({ serviceProvider, businessType, isEnabled, page, limit });
  res.json(result);
}

export async function handleCreateCourier(req: Request, res: Response) {
  const doc = await createCourier(req.body);
  res.status(201).json({
    message: "Courier created",
    courier: { id: doc.id, name: doc.name, serviceProvider: doc.serviceProvider },
  });
}

export async function handleUpdateCourier(req: Request, res: Response) {
  const doc = await updateCourier(req.params.id, { name: req.body.name });
  res.json({
    message: "Courier updated",
    courier: { id: doc.id, name: doc.name, serviceProvider: doc.serviceProvider },
  });
}

export async function handleDeleteCourier(req: Request, res: Response) {
  await deleteCourier(req.params.id);
  res.json({ message: "Courier deleted" });
}

export async function handleToggleCourier(req: Request, res: Response) {
  const doc = await toggleCourier(req.params.id);
  res.json({ message: `Courier ${doc.isEnabled ? "enabled" : "disabled"}` });
}
