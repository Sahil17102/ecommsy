import { z } from "zod";
import { regex } from "@/lib/constants";

// ── Bank Account form ──

export const addBankAccountSchema = z.object({
  accountHolderName: z.string().min(2, "Account holder name is required"),
  accountNumber: z
    .string()
    .regex(regex.accountNumber, "Account number must be 9-18 digits"),
  confirmAccountNumber: z.string(),
  ifscCode: z
    .string()
    .regex(regex.ifsc, "Enter a valid IFSC code (e.g., SBIN0001234)"),
  bankName: z.string().min(2, "Bank name is required"),
  branchName: z.string().optional(),
  accountType: z.enum(["savings", "current"]),
}).refine((data) => data.accountNumber === data.confirmAccountNumber, {
  message: "Account numbers do not match",
  path: ["confirmAccountNumber"],
});

export type AddBankAccountFormValues = z.infer<typeof addBankAccountSchema>;

export const defaultBankAccountValues: AddBankAccountFormValues = {
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifscCode: "",
  bankName: "",
  branchName: "",
  accountType: "current",
};

// ── UPI form ──

export const addUpiSchema = z.object({
  accountHolderName: z.string().min(2, "Account holder name is required"),
  upiId: z
    .string()
    .min(5, "UPI ID is required")
    .regex(regex.upi, "Enter a valid UPI ID (e.g., name@bank)"),
});

export type AddUpiFormValues = z.infer<typeof addUpiSchema>;

export const defaultUpiValues: AddUpiFormValues = {
  accountHolderName: "",
  upiId: "",
};
