export type UserRole = "user" | "admin" | "superadmin";

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  /** Optional job title, free-text or one of the predefined labels. */
  designation: string | null;
  /** Most recently applied role-preset name (e.g. "Operations"). Display only. */
  roleLabel: string | null;
  /**
   * For staff admins: the seller _ids they are scoped to. Empty for superadmin
   * (who sees everything).
   */
  assignedSellerIds: string[];
  /**
   * For staff admins: the granted permission keys (e.g. "wallet.adjust").
   * Empty array → view-only (still sees data for assigned sellers).
   * Ignored for superadmin (`useCan` always returns true).
   */
  permissions: string[];
  isVerified: boolean;
  onboardingComplete: boolean;
}
