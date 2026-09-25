import type { Request, Response } from "express";
import {
  createProvider,
  listProviders,
  getProviderById,
  updateProvider,
  updateProviderLogo,
  updateCredentials,
  getCredentials,
} from "../services/serviceProvider.js";
import { uploadDocument, downloadDocument } from "../services/storage.js";

const LOGO_EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function buildLogoStorageKey(slug: string, ext: string): string {
  return `service-providers/logos/${slug}.${ext}`;
}

export async function handleListProviders(req: Request, res: Response) {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const configured = req.query.configured !== undefined
    ? req.query.configured === "true"
    : undefined;
  const result = await listProviders({ page, limit, configured });
  res.json(result);
}

export async function handleCreateProvider(req: Request, res: Response) {
  const provider = await createProvider(req.body);
  res.status(201).json({ provider });
}

export async function handleGetProvider(req: Request, res: Response) {
  const provider = await getProviderById(req.params.id);
  res.json({ provider });
}

export async function handleUpdateProvider(req: Request, res: Response) {
  await updateProvider(req.params.id, req.body);
  res.json({ message: "Provider updated" });
}

export async function handleUpdateCredentials(req: Request, res: Response) {
  const { type, credentials } = req.body;
  await updateCredentials(req.params.id, type, credentials);
  res.json({ message: `${type.toUpperCase()} credentials updated` });
}

export async function handleGetCredentials(req: Request, res: Response) {
  const creds = await getCredentials(req.params.id);
  res.json(creds);
}

export async function handleUploadProviderLogo(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No file uploaded" });
    return;
  }

  const ext = LOGO_EXT_BY_MIME[req.file.mimetype];
  if (!ext) {
    res.status(400).json({ success: false, error: "Unsupported image type" });
    return;
  }

  const provider = await getProviderById(req.params.id);
  const key = buildLogoStorageKey(provider.serviceProvider, ext);
  await uploadDocument(key, req.file.buffer, req.file.mimetype);

  const logoUrl = `/service-providers/logo/${provider.serviceProvider}.${ext}`;
  await updateProviderLogo(req.params.id, logoUrl);

  res.json({ logoUrl });
}

export async function handleServeProviderLogo(req: Request, res: Response) {
  const filename = req.params.filename;
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) {
    res.status(400).json({ success: false, error: "Invalid filename" });
    return;
  }

  const slug = filename.slice(0, lastDot);
  const ext = filename.slice(lastDot + 1);
  const key = buildLogoStorageKey(slug, ext);

  try {
    const { buffer, contentType } = await downloadDocument(key);
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch {
    res.status(404).json({ success: false, error: "Logo not found" });
  }
}
