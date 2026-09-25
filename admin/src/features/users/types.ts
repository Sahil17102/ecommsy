import type { Pagination } from "../service-providers/types";

export type KycStatus = "not_submitted" | "pending" | "approved" | "rejected";

export interface UserListItem {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  pincode: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  supportEmail: string | null;
  contactNumber: string | null;
  address: string | null;
  sellsOn: string[];
  monthlyShipmentVolume: string | null;
  lastLogin: string | null;
  isActive: boolean;
  onboardingComplete: boolean;
  isVerified: boolean;
  kycStatus: KycStatus;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersResponse {
  users: UserListItem[];
  pagination: Pagination;
  stats: {
    total: number;
    verified: number;
    onboarded: number;
    active: number;
    kycPending: number;
    kycVerified: number;
    inactive: number;
    notOnboarded: number;
    kycNotStarted: number;
  };
}

// ── Team members ──

export type TeamRole = "owner" | "member";

export interface TeamMember {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  teamRole: TeamRole;
  parentUserId: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListTeamMembersResponse {
  members: TeamMember[];
}

export interface CreateTeamMemberPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
  tempPassword: string;
  resetBy: "owner" | "admin";
}

// ── User summary ──

export interface UserSummary {
  orders: {
    total: number;
    byStatus: Record<string, number>;
    byType: { B2B: number; B2C: number };
    byPayment: { prepaid: number; cod: number };
  };
  revenue: {
    total: number;
    freight: number;
    cod: number;
  };
  remittance: {
    totalCodCollected: number;
    totalRemitted: number;
    pendingRemittance: number;
    pendingCount: number;
    creditedCount: number;
  };
  wallet: {
    balance: number;
    totalCredits: number;
    totalDebits: number;
  };
  topProviders: { provider: string; count: number; revenue: number }[];
}
