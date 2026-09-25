import { body, param } from "express-validator";
import { regex } from "../config/regex.js";

// Constants previously lived in models/KycDocument.ts — inlined here so this
// validator no longer depends on the legacy Mongoose model.
const BUSINESS_STRUCTURES = [
  "individual",
  "company",
  "partnership_firm",
  "sole_proprietor",
] as const;

const COMPANY_TYPES = [
  "private_limited",
  "public_limited",
  "one_person_company",
  "llp",
  "section_8_company",
] as const;

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

export const submitKycValidation = [
  body("businessStructure")
    .isString()
    .isIn([...BUSINESS_STRUCTURES])
    .withMessage(`businessStructure must be one of: ${BUSINESS_STRUCTURES.join(", ")}`),

  body("companyType")
    .optional({ values: "falsy" })
    .isString()
    .isIn([...COMPANY_TYPES])
    .withMessage(`companyType must be one of: ${COMPANY_TYPES.join(", ")}`),

  body("gstin")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .toUpperCase()
    .matches(regex.gstin)
    .withMessage("Invalid GSTIN format"),

  body("cin")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .toUpperCase()
    .matches(regex.cin)
    .withMessage("Invalid CIN format"),
];

export const uploadDocumentValidation = [
  body("documentKey")
    .isString()
    .isIn([...DOCUMENT_KEYS])
    .withMessage(`documentKey must be one of: ${DOCUMENT_KEYS.join(", ")}`),
];

export const adminRejectValidation = [
  body("rejectionReason")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Rejection reason is required"),
];

export const adminDocumentKeyParam = [
  param("key")
    .isString()
    .isIn([...DOCUMENT_KEYS])
    .withMessage(`Document key must be one of: ${DOCUMENT_KEYS.join(", ")}`),
];
