import type { BusinessStructure, CompanyType, DocumentKey } from "./types";

/** Human-readable labels for each document key */
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

/** Accepted file types per document */
export const DOCUMENT_ACCEPT: Record<DocumentKey, string> = {
  selfie: "image/jpeg,image/png,image/webp",
  panCard: "image/jpeg,image/png,image/webp,application/pdf",
  aadhaar: "image/jpeg,image/png,image/webp,application/pdf",
  cancelledCheque: "image/jpeg,image/png,image/webp,application/pdf",
  boardResolution: "image/jpeg,image/png,image/webp,application/pdf",
  partnershipDeed: "image/jpeg,image/png,image/webp,application/pdf",
  llpAgreement: "image/jpeg,image/png,image/webp,application/pdf",
  companyAddressProof: "image/jpeg,image/png,image/webp,application/pdf",
  businessPan: "image/jpeg,image/png,image/webp,application/pdf",
  gstCertificate: "image/jpeg,image/png,image/webp,application/pdf",
};

/** Required documents per business structure */
export const REQUIRED_DOCUMENTS: Record<BusinessStructure, DocumentKey[]> = {
  individual: ["selfie", "panCard", "aadhaar", "cancelledCheque"],
  sole_proprietor: ["selfie", "panCard", "aadhaar", "cancelledCheque", "gstCertificate"],
  partnership_firm: [
    "selfie",
    "partnershipDeed",
    "panCard",
    "aadhaar",
    "cancelledCheque",
    "gstCertificate",
  ],
  company: [], // resolved by company type
};

/** Required documents per company type */
export const COMPANY_REQUIRED_DOCUMENTS: Record<CompanyType, DocumentKey[]> = {
  private_limited: ["selfie", "businessPan", "aadhaar", "boardResolution", "gstCertificate"],
  public_limited: ["selfie", "businessPan", "aadhaar", "gstCertificate"],
  one_person_company: ["selfie", "businessPan", "aadhaar", "companyAddressProof", "cancelledCheque"],
  llp: ["selfie", "businessPan", "aadhaar", "companyAddressProof", "cancelledCheque", "llpAgreement"],
  section_8_company: [
    "selfie",
    "businessPan",
    "aadhaar",
    "companyAddressProof",
    "boardResolution",
    "cancelledCheque",
  ],
};

/** Get required documents for the given structure + company type */
export function getRequiredDocuments(
  structure: BusinessStructure,
  companyType?: CompanyType,
): DocumentKey[] {
  if (structure === "company" && companyType) {
    return COMPANY_REQUIRED_DOCUMENTS[companyType] || [];
  }
  return REQUIRED_DOCUMENTS[structure] || [];
}

/** Options for the business structure select */
export const BUSINESS_STRUCTURE_OPTIONS = [
  { label: "Individual", value: "individual" },
  { label: "Sole Proprietor", value: "sole_proprietor" },
  { label: "Partnership Firm", value: "partnership_firm" },
  { label: "Company", value: "company" },
] as const;

/** Options for the company type select */
export const COMPANY_TYPE_OPTIONS = [
  { label: "Private Limited", value: "private_limited" },
  { label: "Public Limited", value: "public_limited" },
  { label: "One Person Company (OPC)", value: "one_person_company" },
  { label: "LLP", value: "llp" },
  { label: "Section 8 Company", value: "section_8_company" },
] as const;

/** Step titles */
export const KYC_STEPS = [
  "Business Structure",
  "Selfie Capture",
  "Document Upload",
] as const;

export const KYC_QUERY_KEY = ["kyc"] as const;

/** Whether a document key needs GSTIN to be entered */
export function needsGstin(structure: BusinessStructure): boolean {
  return structure !== "individual";
}

/** Whether a document key needs CIN to be entered */
export function needsCin(structure: BusinessStructure, companyType?: CompanyType): boolean {
  if (structure !== "company") return false;
  return companyType === "private_limited" || companyType === "one_person_company";
}
