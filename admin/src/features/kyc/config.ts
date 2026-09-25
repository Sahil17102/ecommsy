import type { DocumentKey, KycStatus, DocumentStatus } from "./types";

export const DOCUMENT_LABELS: Record<DocumentKey, string> = {
  selfie: "Selfie Photo",
  panCard: "PAN Card",
  aadhaar: "Aadhaar Card",
  cancelledCheque: "Cancelled Cheque",
  boardResolution: "Board Resolution",
  partnershipDeed: "Partnership Deed",
  llpAgreement: "LLP Agreement",
  companyAddressProof: "Company Address Proof",
  businessPan: "Business PAN Card",
  gstCertificate: "GST Certificate",
};

export const KYC_STATUS_COLORS: Record<KycStatus, string> = {
  not_submitted: "default",
  pending: "purple",
  approved: "green",
  rejected: "red",
};

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  not_submitted: "Not Started",
  pending: "Pending Review",
  approved: "Verified",
  rejected: "Rejected",
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  not_uploaded: "default",
  pending: "purple",
  approved: "green",
  rejected: "red",
};


export const ADMIN_KYC_QUERY_KEY = ["admin-kyc"] as const;
