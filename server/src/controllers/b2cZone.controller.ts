import type { Request, Response } from "express";
import {
  listZones,
  createZone,
  updateZone,
  deleteZone,
  toggleZone,
} from "../services/b2cZone.js";

export async function handleListZones(req: Request, res: Response) {
  const search = req.query.search as string | undefined;
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const result = await listZones({ search, page, limit });
  res.json(result);
}

export async function handleCreateZone(req: Request, res: Response) {
  const doc = await createZone(req.body);
  res.status(201).json({
    message: "Zone created",
    zone: { id: doc.id, name: doc.name, code: doc.code },
  });
}

export async function handleUpdateZone(req: Request, res: Response) {
  const doc = await updateZone(req.params.id, req.body);
  res.json({
    message: "Zone updated",
    zone: { id: doc.id, name: doc.name, code: doc.code },
  });
}

export async function handleDeleteZone(req: Request, res: Response) {
  await deleteZone(req.params.id);
  res.json({ message: "Zone deleted" });
}

export async function handleToggleZone(req: Request, res: Response) {
  const doc = await toggleZone(req.params.id);
  res.json({
    message: `Zone ${doc.isActive ? "activated" : "deactivated"}`,
  });
}
