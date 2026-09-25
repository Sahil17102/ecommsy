import { z } from "zod";
import { regex } from "@/lib/constants";
import { ADDRESS_ROLES } from "./types";

// ── Shared address fields schema ──

const addressFieldsSchema = z.object({
  contactName: z.string().min(1, "Contact name is required"),
  phone: z.string().regex(regex.phone, "Valid 10-digit phone required"),
  email: z.string().email("Valid email required"),
  role: z.enum(ADDRESS_ROLES, { message: "Select a role" }),
  landmark: z.string().optional().default(""),
  addressLine1: z.string().min(3, "Address line 1 is required"),
  addressLine2: z.string().optional().default(""),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required").default("India"),
  pincode: z.string().regex(regex.pincode, "Valid 6-digit pincode required"),
  gstNumber: z.string().optional().default(""),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// ── RTO address schema (permissive base — validated via superRefine when needed) ──

const rtoAddressSchema = z.object({
  contactName: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  role: z.enum(ADDRESS_ROLES).default("warehouse_manager"),
  landmark: z.string().optional().default(""),
  addressLine1: z.string().default(""),
  addressLine2: z.string().optional().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  country: z.string().default("India"),
  pincode: z.string().default(""),
  gstNumber: z.string().optional().default(""),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// ── Full pickup address form schema ──

export const pickupAddressSchema = z
  .object({
    nickname: z.string().min(1, "Address nickname is required"),
    isSameAsRto: z.boolean(),
    rtoAddress: rtoAddressSchema,
  })
  .merge(addressFieldsSchema)
  .superRefine((data, ctx) => {
    // Validate RTO fields only when isSameAsRto is false
    if (!data.isSameAsRto) {
      const rto = data.rtoAddress;
      if (!rto.contactName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "RTO contact name is required",
          path: ["rtoAddress", "contactName"],
        });
      }
      if (!regex.phone.test(rto.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Valid 10-digit phone required",
          path: ["rtoAddress", "phone"],
        });
      }
      if (!rto.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rto.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Valid email required",
          path: ["rtoAddress", "email"],
        });
      }
      if (!rto.addressLine1 || rto.addressLine1.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "RTO address line 1 is required",
          path: ["rtoAddress", "addressLine1"],
        });
      }
      if (!rto.city) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "RTO city is required",
          path: ["rtoAddress", "city"],
        });
      }
      if (!rto.state) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "RTO state is required",
          path: ["rtoAddress", "state"],
        });
      }
      if (!regex.pincode.test(rto.pincode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Valid 6-digit pincode required",
          path: ["rtoAddress", "pincode"],
        });
      }
    }
  });

export type PickupAddressSchemaValues = z.infer<typeof pickupAddressSchema>;
