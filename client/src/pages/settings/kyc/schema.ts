import { z } from "zod";
import { regex } from "@/lib/constants";

export const businessStructureSchema = z
  .object({
    businessStructure: z.enum(["individual", "company", "partnership_firm", "sole_proprietor"], {
      message: "Please select a business structure",
    }),
    companyType: z
      .enum(["private_limited", "public_limited", "one_person_company", "llp", "section_8_company"])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.businessStructure === "company" && !data.companyType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a company type",
        path: ["companyType"],
      });
    }
  });

export type BusinessStructureFormValues = z.infer<typeof businessStructureSchema>;

export const documentDetailsSchema = z.object({
  gstin: z
    .string()
    .regex(regex.gstin, "Invalid GSTIN format")
    .optional()
    .or(z.literal("")),
  cin: z
    .string()
    .regex(regex.cin, "Invalid CIN format")
    .optional()
    .or(z.literal("")),
});

export type DocumentDetailsFormValues = z.infer<typeof documentDetailsSchema>;

export function getBusinessStructureDefaults(): BusinessStructureFormValues {
  return {
    businessStructure: "individual",
    companyType: undefined,
  };
}

export function getDocumentDetailsDefaults(): DocumentDetailsFormValues {
  return {
    gstin: "",
    cin: "",
  };
}
