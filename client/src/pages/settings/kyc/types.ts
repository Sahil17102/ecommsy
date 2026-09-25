// ── Enums ──

export const BUSINESS_STRUCTURES = [
  "individual",
  "company",
  "partnership_firm",
  "sole_proprietor",
] as const;
export type BusinessStructure = (typeof BUSINESS_STRUCTURES)[number];

export const COMPANY_TYPES = [
  "private_limited",
  "public_limited",
  "one_person_company",
  "llp",
  "section_8_company",
] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export const KYC_STATUSES = [
  "not_submitted",
  "pending",
  "approved",
  "rejected",
] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const DOCUMENT_STATUSES = [
  "not_uploaded",
  "pending",
  "approved",
  "rejected",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_KEYS = [
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
export type DocumentKey = (typeof DOCUMENT_KEYS)[number];

// ── Document field shape ──

export interface DocumentField {
  url?: string;
  status: DocumentStatus;
  rejectionReason?: string;
  mime?: string;
}

// ── KYC record ──

export interface KycRecord {
  id: string;
  userId: string;
  businessStructure?: BusinessStructure;
  companyType?: CompanyType;
  status: KycStatus;
  selfie: DocumentField;
  panCard: DocumentField;
  aadhaar: DocumentField;
  cancelledCheque: DocumentField;
  boardResolution: DocumentField;
  partnershipDeed: DocumentField;
  llpAgreement: DocumentField;
  companyAddressProof: DocumentField;
  businessPan: DocumentField;
  gstCertificate: DocumentField;
  gstin?: string;
  cin?: string;
  createdAt: string;
  updatedAt: string;
}

// ── API responses ──

export interface KycResponse {
  success: boolean;
  kyc: KycRecord;
}

export interface KycSubmitPayload {
  businessStructure: BusinessStructure;
  companyType?: CompanyType;
  gstin?: string;
  cin?: string;
}

export interface KycSubmitError {
  success: boolean;
  error: string;
  missingDocuments?: DocumentKey[];
}
