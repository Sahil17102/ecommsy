import { z } from "zod";
import { regex } from "@/lib/constants";
import type { CompanyProfile } from "./types";

export const companyProfileSchema = z.object({
  website: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  supportEmail: z.string().email("Enter a valid email"),
  contactNumber: z.string().regex(regex.phone, "Enter a valid 10-digit phone number"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  pincode: z.string().regex(regex.pincode, "Enter a valid 6-digit pincode"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
});

export type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

export function getDefaultValues(profile?: CompanyProfile): CompanyProfileFormValues {
  return {
    website: profile?.website ?? "",
    supportEmail: profile?.supportEmail ?? "",
    contactNumber: profile?.contactNumber ?? "",
    address: profile?.address ?? "",
    pincode: profile?.pincode ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
  };
}
