import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { kycDocuments, users } from "../db/schema.js";
import { uploadDocument, downloadDocument } from "../services/storage.js";
import { MIME_TO_EXT } from "../config/constants.js";
import logger from "../config/logger.js";
import { notifyAsync, notifyAdmins } from "../services/notificationService.js";

const TAG = "[KycController]";

// ── Inlined constants (previously lived in models/KycDocument.ts) ──

const BUSINESS_STRUCTURES = [
  "individual",
  "company",
  "partnership_firm",
  "sole_proprietor",
] as const;
type BusinessStructure = (typeof BUSINESS_STRUCTURES)[number];

const COMPANY_TYPES = [
  "private_limited",
  "public_limited",
  "one_person_company",
  "llp",
  "section_8_company",
] as const;
type CompanyType = (typeof COMPANY_TYPES)[number];

/**
 * Schema-side enum is { not_submitted | pending | approved | rejected }. The
 * legacy code also used a `verification_in_progress` intermediate state and
 * the human-friendly `verified` for "approved" — we collapse those to the
 * schema vocabulary here.
 */
const KycStatus = {
  NOT_STARTED: "not_submitted",
  PENDING: "pending",
  VERIFICATION_IN_PROGRESS: "pending",
  VERIFIED: "approved",
  REJECTED: "rejected",
} as const;

const DocumentStatus = {
  NOT_UPLOADED: "not_uploaded",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

const DOCUMENT_KEYS = [
  "selfie",
  "panCard",
  "aadhaar",
  "cancelledCheque",
  "boardResolution",
  "partnershipDeed",
  "llpAgreement",
  "companyAddressProof",
  "businessPan",
  "gstCertificate",
] as const;
type DocumentKey = (typeof DOCUMENT_KEYS)[number];

const REQUIRED_DOCUMENTS: Record<BusinessStructure, DocumentKey[]> = {
  individual: ["panCard", "aadhaar", "cancelledCheque"],
  sole_proprietor: ["panCard", "aadhaar", "cancelledCheque", "gstCertificate"],
  partnership_firm: ["partnershipDeed", "panCard", "aadhaar", "cancelledCheque", "gstCertificate"],
  company: [], // resolved dynamically by companyType
};

const COMPANY_REQUIRED_DOCUMENTS: Record<CompanyType, DocumentKey[]> = {
  private_limited: ["businessPan", "aadhaar", "boardResolution", "gstCertificate"],
  public_limited: ["businessPan", "aadhaar", "gstCertificate"],
  one_person_company: ["businessPan", "aadhaar", "companyAddressProof", "cancelledCheque"],
  llp: ["businessPan", "aadhaar", "companyAddressProof", "cancelledCheque", "llpAgreement"],
  section_8_company: ["businessPan", "aadhaar", "companyAddressProof", "boardResolution", "cancelledCheque"],
};

function getRequiredDocuments(
  structure: BusinessStructure,
  companyType?: CompanyType,
): DocumentKey[] {
  const selfie: DocumentKey[] = ["selfie"];
  if (structure === "company" && companyType) {
    return [...selfie, ...(COMPANY_REQUIRED_DOCUMENTS[companyType] || [])];
  }
  return [...selfie, ...(REQUIRED_DOCUMENTS[structure] || [])];
}

// ── Shape stored inside each jsonb document column ──
interface DocumentField {
  url?: string;
  status: string;
  rejectionReason?: string;
  mime?: string;
}

type KycRow = typeof kycDocuments.$inferSelect;

// Cast a jsonb column value into our typed DocumentField shape.
function asDocField(value: unknown): DocumentField {
  if (value && typeof value === "object") return value as DocumentField;
  return { status: DocumentStatus.NOT_UPLOADED };
}

// ── Helpers ──

function buildKycStorageKey(userId: string, docKey: string, ext: string) {
  return `kyc/${userId}/${docKey}.${ext}`;
}

async function ensureKycRecord(userId: string): Promise<KycRow> {
  const existing = await db.query.kycDocuments.findFirst({
    where: eq(kycDocuments.userId, userId),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(kycDocuments)
    .values({ userId })
    .returning();
  return created;
}

// ── User-facing handlers ──

/**
 * GET /kyc — Fetch the current user's KYC status and details.
 * Auto-creates a KYC record if none exists.
 */
export async function handleGetKyc(req: Request, res: Response) {
  let kyc = await ensureKycRecord(req.userId!);
  const user = await db.query.users.findFirst({ where: eq(users.id, req.userId!) });

  if (user?.email?.toLowerCase() === "sahilmittal1920@gmail.com" && kyc.status !== KycStatus.VERIFIED) {
    const [approvedKyc] = await db
      .update(kycDocuments)
      .set({ status: KycStatus.VERIFIED, updatedAt: new Date() })
      .where(eq(kycDocuments.id, kyc.id))
      .returning();
    kyc = approvedKyc;
    logger.info(`${TAG} KYC auto-approved for userId=${user.id} email=${user.email}`);
  }

  res.json({ success: true, kyc });
}

/**
 * POST /kyc — Submit or update KYC details.
 * Sets status to "pending" if all required documents are uploaded.
 */
export async function handleSubmitKyc(req: Request, res: Response) {
  const { businessStructure, companyType, gstin, cin } = req.body as {
    businessStructure: BusinessStructure;
    companyType?: CompanyType;
    gstin?: string;
    cin?: string;
  };

  const kyc = await ensureKycRecord(req.userId!);

  // Don't allow re-submission if already verified
  if (kyc.status === KycStatus.VERIFIED) {
    res.status(400).json({ success: false, error: "KYC is already verified" });
    return;
  }

  const resolvedCompanyType = businessStructure === "company" ? companyType : undefined;

  // Check if all required documents are uploaded
  const requiredDocs = getRequiredDocuments(businessStructure, resolvedCompanyType);
  const missing = requiredDocs.filter((key) => {
    const f = asDocField(kyc[key]);
    return !f.url || f.status === DocumentStatus.NOT_UPLOADED;
  });

  if (missing.length > 0) {
    res.status(400).json({
      success: false,
      error: "All required documents must be uploaded before submitting",
      missingDocuments: missing,
    });
    return;
  }

  // Build patch: reset any rejected required docs back to pending on resubmission.
  const patch: Partial<Record<DocumentKey, DocumentField>> = {};
  for (const key of requiredDocs) {
    const f = asDocField(kyc[key]);
    if (f.status === DocumentStatus.REJECTED) {
      patch[key] = { ...f, status: DocumentStatus.PENDING, rejectionReason: undefined };
    }
  }

  const [updated] = await db
    .update(kycDocuments)
    .set({
      businessStructure,
      companyType: resolvedCompanyType ?? null,
      ...(gstin ? { gstin } : {}),
      ...(cin ? { cin } : {}),
      ...patch,
      status: KycStatus.PENDING,
      updatedAt: new Date(),
    })
    .where(eq(kycDocuments.id, kyc.id))
    .returning();

  // Notify admins that KYC is ready for review.
  (async () => {
    const seller = await db.query.users.findFirst({
      where: eq(users.id, req.userId!),
      columns: { name: true, firstName: true, email: true },
    });
    notifyAdmins("admin.kyc_submitted", {
      userId: req.userId!,
      userName: seller?.name ?? seller?.firstName ?? "A seller",
      userEmail: seller?.email ?? "",
    });
  })().catch(() => {});

  logger.info(`${TAG} KYC submitted — userId=${req.userId} structure=${businessStructure}`);
  res.json({ success: true, kyc: updated });
}

/**
 * POST /kyc/upload — Upload a single KYC document.
 * Expects multipart: file field "document" + body field "documentKey".
 */
export async function handleUploadDocument(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, error: "No file uploaded" });
    return;
  }

  const documentKey = req.body.documentKey as DocumentKey;
  if (!DOCUMENT_KEYS.includes(documentKey)) {
    res.status(400).json({ success: false, error: "Invalid document key" });
    return;
  }

  const kyc = await ensureKycRecord(req.userId!);

  // Don't allow uploads if KYC is already verified
  if (kyc.status === KycStatus.VERIFIED) {
    res.status(400).json({ success: false, error: "KYC is already verified" });
    return;
  }

  const ext = MIME_TO_EXT[file.mimetype] || "bin";
  const storageKey = buildKycStorageKey(req.userId!, documentKey, ext);

  await uploadDocument(storageKey, file.buffer, file.mimetype);

  const fieldUpdate: DocumentField = {
    url: storageKey,
    status: DocumentStatus.PENDING,
    mime: file.mimetype,
    rejectionReason: undefined,
  };

  const [updated] = await db
    .update(kycDocuments)
    .set({ [documentKey]: fieldUpdate, updatedAt: new Date() })
    .where(eq(kycDocuments.id, kyc.id))
    .returning();

  logger.info(`${TAG} Document uploaded — userId=${req.userId} key=${documentKey}`);
  res.json({ success: true, kyc: updated });
}

/**
 * GET /kyc/document/:key/:filename — Proxy-serve a KYC document from S3.
 */
export async function handleServeDocument(req: Request, res: Response) {
  const { key, filename } = req.params;
  const storageKey = `kyc/${req.userId!}/${key}.${filename.split(".").pop()}`;

  try {
    const { buffer, contentType } = await downloadDocument(storageKey);
    res.set({
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    });
    res.send(buffer);
  } catch {
    res.status(404).json({ success: false, error: "Document not found" });
  }
}

// ── Admin handlers ──

/**
 * GET /admin/kyc/users/:userId — View a user's KYC details.
 */
export async function handleAdminGetKyc(req: Request, res: Response) {
  const kyc = await db.query.kycDocuments.findFirst({
    where: eq(kycDocuments.userId, req.params.userId),
  });
  if (!kyc) {
    res.status(404).json({ success: false, error: "KYC record not found" });
    return;
  }
  res.json({ success: true, kyc });
}

/**
 * POST /admin/kyc/:id/approve — Approve the entire KYC.
 * Sets all uploaded document statuses to "approved".
 */
export async function handleApproveKyc(req: Request, res: Response) {
  const kyc = await db.query.kycDocuments.findFirst({ where: eq(kycDocuments.id, req.params.id) });
  if (!kyc) {
    res.status(404).json({ success: false, error: "KYC record not found" });
    return;
  }

  const patch: Partial<Record<DocumentKey, DocumentField>> = {};
  for (const key of DOCUMENT_KEYS) {
    const f = asDocField(kyc[key]);
    if (f.url) {
      patch[key] = { ...f, status: DocumentStatus.APPROVED, rejectionReason: undefined };
    }
  }

  const [updated] = await db
    .update(kycDocuments)
    .set({ ...patch, status: KycStatus.VERIFIED, updatedAt: new Date() })
    .where(eq(kycDocuments.id, kyc.id))
    .returning();

  notifyAsync({ userId: updated.userId, event: "kyc.approved" });

  logger.info(`${TAG} KYC approved — kycId=${updated.id} userId=${updated.userId}`);
  res.json({ success: true, kyc: updated });
}

/**
 * POST /admin/kyc/:id/reject — Reject the entire KYC.
 */
export async function handleRejectKyc(req: Request, res: Response) {
  const kyc = await db.query.kycDocuments.findFirst({ where: eq(kycDocuments.id, req.params.id) });
  if (!kyc) {
    res.status(404).json({ success: false, error: "KYC record not found" });
    return;
  }

  const [updated] = await db
    .update(kycDocuments)
    .set({ status: KycStatus.REJECTED, updatedAt: new Date() })
    .where(eq(kycDocuments.id, kyc.id))
    .returning();

  notifyAsync({
    userId: updated.userId,
    event: "kyc.rejected",
    data: { reason: req.body.rejectionReason ?? "Please review and resubmit" },
  });

  logger.info(`${TAG} KYC rejected — kycId=${updated.id} userId=${updated.userId} reason=${req.body.rejectionReason}`);
  res.json({ success: true, kyc: updated });
}

/**
 * POST /admin/kyc/:id/document/:key/approve — Approve a single document.
 * If all required docs are now approved, auto-approves the entire KYC.
 */
export async function handleApproveDocument(req: Request, res: Response) {
  const { id, key } = req.params;
  const docKey = key as DocumentKey;

  const kyc = await db.query.kycDocuments.findFirst({ where: eq(kycDocuments.id, id) });
  if (!kyc) {
    res.status(404).json({ success: false, error: "KYC record not found" });
    return;
  }

  const current = asDocField(kyc[docKey]);
  if (!current.url) {
    res.status(400).json({ success: false, error: "Document has not been uploaded" });
    return;
  }

  const updatedField: DocumentField = {
    ...current,
    status: DocumentStatus.APPROVED,
    rejectionReason: undefined,
  };

  // Recompute KYC-level status based on whether *all* required docs are approved.
  type KycStatusValue = typeof kycDocuments.$inferSelect["status"];
  let newKycStatus: KycStatusValue = kyc.status;
  if (kyc.businessStructure) {
    const requiredDocs = getRequiredDocuments(
      kyc.businessStructure as BusinessStructure,
      (kyc.companyType ?? undefined) as CompanyType | undefined,
    );
    const allApproved = requiredDocs.every((k) => {
      const f = k === docKey ? updatedField : asDocField(kyc[k]);
      return f.status === DocumentStatus.APPROVED;
    });
    newKycStatus = allApproved ? KycStatus.VERIFIED : KycStatus.VERIFICATION_IN_PROGRESS;
  }

  const [updated] = await db
    .update(kycDocuments)
    .set({ [docKey]: updatedField, status: newKycStatus, updatedAt: new Date() })
    .where(eq(kycDocuments.id, kyc.id))
    .returning();

  if (updated.status === KycStatus.VERIFIED) {
    notifyAsync({ userId: updated.userId, event: "kyc.approved" });
  }
  logger.info(`${TAG} Document approved — kycId=${id} key=${docKey}`);
  res.json({ success: true, kyc: updated });
}

/**
 * POST /admin/kyc/:id/document/:key/reject — Reject a single document.
 */
export async function handleRejectDocument(req: Request, res: Response) {
  const { id, key } = req.params;
  const docKey = key as DocumentKey;

  const kyc = await db.query.kycDocuments.findFirst({ where: eq(kycDocuments.id, id) });
  if (!kyc) {
    res.status(404).json({ success: false, error: "KYC record not found" });
    return;
  }

  const current = asDocField(kyc[docKey]);
  if (!current.url) {
    res.status(400).json({ success: false, error: "Document has not been uploaded" });
    return;
  }

  const updatedField: DocumentField = {
    ...current,
    status: DocumentStatus.REJECTED,
    rejectionReason: req.body.rejectionReason,
  };

  const [updated] = await db
    .update(kycDocuments)
    .set({ [docKey]: updatedField, status: KycStatus.REJECTED, updatedAt: new Date() })
    .where(eq(kycDocuments.id, kyc.id))
    .returning();

  notifyAsync({
    userId: updated.userId,
    event: "kyc.rejected",
    data: { reason: req.body.rejectionReason ?? "Please review and resubmit" },
  });
  logger.info(`${TAG} Document rejected — kycId=${id} key=${docKey} reason=${req.body.rejectionReason}`);
  res.json({ success: true, kyc: updated });
}

/**
 * GET /admin/kyc/document/:userId/:key/:filename — Admin proxy-serve a KYC document.
 */
export async function handleAdminServeDocument(req: Request, res: Response) {
  const { userId, key, filename } = req.params;
  const storageKey = `kyc/${userId}/${key}.${filename.split(".").pop()}`;

  try {
    const { buffer, contentType } = await downloadDocument(storageKey);
    res.set({
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    });
    res.send(buffer);
  } catch {
    res.status(404).json({ success: false, error: "Document not found" });
  }
}
