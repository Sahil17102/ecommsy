import type { Request, Response } from "express";
import {
  listLocations,
  createLocation,
  bulkCreateLocations,
  deleteLocation,
  bulkDeleteLocations,
  toggleLocation,
  lookupPincode,
  getDistinctStates,
  getCitiesByState,
} from "../services/location.js";

export async function handleListLocations(req: Request, res: Response) {
  const search = req.query.search as string | undefined;
  const state = req.query.state as string | undefined;
  const tag = req.query.tag as string | undefined;
  const isActive =
    req.query.isActive !== undefined
      ? req.query.isActive === "true"
      : undefined;
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const result = await listLocations({
    search,
    state,
    tag,
    isActive,
    page,
    limit,
  });
  res.json(result);
}

export async function handleCreateLocation(req: Request, res: Response) {
  const doc = await createLocation(req.body);
  res.status(201).json({
    message: "Location created",
    location: { id: doc.id, pincode: doc.pincode, city: doc.city, state: doc.state },
  });
}

export async function handleBulkImport(req: Request, res: Response) {
  const result = await bulkCreateLocations(req.body.locations);
  res.json({
    message: `Imported ${result.inserted} locations${result.duplicates > 0 ? `, ${result.duplicates} duplicates skipped` : ""}`,
    inserted: result.inserted,
    duplicates: result.duplicates,
  });
}

export async function handleDeleteLocation(req: Request, res: Response) {
  await deleteLocation(req.params.id);
  res.json({ message: "Location deleted" });
}

export async function handleBulkDelete(req: Request, res: Response) {
  const result = await bulkDeleteLocations(req.body.ids);
  res.json({
    message: `Deleted ${result.deletedCount} locations`,
    deletedCount: result.deletedCount,
  });
}

export async function handleToggleLocation(req: Request, res: Response) {
  const doc = await toggleLocation(req.params.id);
  res.json({
    message: `Location ${doc.isActive ? "activated" : "deactivated"}`,
  });
}

export async function handleGetStates(_req: Request, res: Response) {
  const states = await getDistinctStates();
  res.json({ states });
}

export async function handleGetCities(req: Request, res: Response) {
  const cities = await getCitiesByState(req.query.state as string);
  res.json({ cities });
}

export async function handleLookupPincode(req: Request, res: Response) {
  const result = await lookupPincode(req.params.pincode);
  res.json(result);
}
