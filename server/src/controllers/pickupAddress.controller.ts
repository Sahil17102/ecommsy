import type { Request, Response } from "express";
import {
  listAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setPrimary,
  bulkCreateAddresses,
  BULK_ADDRESS_MAX,
  type BulkAddressRow,
} from "../services/pickupAddress.js";
import { AppError } from "../utils/AppError.js";

// ── List Addresses ──

export async function handleListAddresses(req: Request, res: Response) {
  const addresses = await listAddresses(req.userId!);
  res.json({ addresses });
}

// ── Get Address ──

export async function handleGetAddress(req: Request, res: Response) {
  const address = await getAddress(req.userId!, req.params.id);
  res.json({ address });
}

// ── Create Address ──

export async function handleCreateAddress(req: Request, res: Response) {
  const address = await createAddress(req.userId!, req.body);
  res.status(201).json({ message: "Address created", address });
}

// ── Bulk Create Addresses ──

export async function handleBulkCreateAddresses(req: Request, res: Response) {
  const rows = req.body?.addresses as BulkAddressRow[] | undefined;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError(400, "addresses must be a non-empty array");
  }
  if (rows.length > BULK_ADDRESS_MAX) {
    throw new AppError(400, `You can import at most ${BULK_ADDRESS_MAX} addresses at once`);
  }

  const result = await bulkCreateAddresses(req.userId!, rows);
  res.status(201).json({ message: "Bulk import processed", ...result });
}

// ── Update Address ──

export async function handleUpdateAddress(req: Request, res: Response) {
  const address = await updateAddress(req.userId!, req.params.id, req.body);
  res.json({ message: "Address updated", address });
}

// ── Delete Address ──

export async function handleDeleteAddress(req: Request, res: Response) {
  await deleteAddress(req.userId!, req.params.id);
  res.json({ message: "Address deleted" });
}

// ── Set Primary ──

export async function handleSetPrimary(req: Request, res: Response) {
  const address = await setPrimary(req.userId!, req.params.id);
  res.json({ message: "Primary address updated", address });
}
