import { z } from "zod";
import { regex } from "@/lib/constants";

export const createTeamMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().min(1, "Last name is required").trim(),
  email: z.string().email("Valid email is required").trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || regex.phone.test(v), "Enter a valid 10-digit phone"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateTeamMemberFormValues = z.infer<typeof createTeamMemberSchema>;

export const defaultCreateTeamMemberValues: CreateTeamMemberFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
};
