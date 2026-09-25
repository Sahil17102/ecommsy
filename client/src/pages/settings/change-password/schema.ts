import { z } from "zod";

const baseSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your new password"),
});

/** User already has a password — current password is required and must differ from new */
export const changePasswordSchema = baseSchema
  .refine((d) => d.currentPassword.length > 0, {
    path: ["currentPassword"],
    message: "Current password is required",
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different from current password",
  });

/** User has no password yet (OTP/Google signup) — only new + confirm required */
export const setPasswordSchema = baseSchema
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type ChangePasswordFormValues = z.infer<typeof baseSchema>;

export const defaultChangePasswordValues: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};
