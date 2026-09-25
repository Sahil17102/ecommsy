import { api } from "@/lib/api";
import type {
  ListUsersResponse,
  UserListItem,
  ListTeamMembersResponse,
  CreateTeamMemberPayload,
  TeamMember,
  ResetPasswordResponse,
  UserSummary,
} from "./types";

export const usersApi = {
  list: async (params?: {
    search?: string;
    onboardingComplete?: string;
    isVerified?: string;
    isActive?: string;
    plan?: string;
    kycStatus?: string;
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: string;
  }): Promise<ListUsersResponse> => {
    const { data } = await api.get("/users", { params });
    return data as ListUsersResponse;
  },

  getById: async (id: string): Promise<{ user: UserListItem }> => {
    const { data } = await api.get(`/users/${id}`);
    return data as { user: UserListItem };
  },

  toggleActive: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.patch(`/users/${id}/toggle-active`);
    return data as { message: string };
  },

  updatePlan: async (id: string, plan: string): Promise<{ message: string }> => {

    const { data } = await api.patch(`/users/${id}/plan`, { plan });
    return data as { message: string };
  },

  // ── Team members ──

  listTeamMembers: async (id: string): Promise<ListTeamMembersResponse> => {
    const { data } = await api.get(`/users/${id}/team-members`);
    return data as ListTeamMembersResponse;
  },

  createTeamMember: async (
    id: string,
    payload: CreateTeamMemberPayload,
  ): Promise<{ member: TeamMember }> => {
    const { data } = await api.post(`/users/${id}/team-members`, payload);
    return data as { member: TeamMember };
  },

  deleteTeamMember: async (id: string, memberId: string): Promise<void> => {
    await api.delete(`/users/${id}/team-members/${memberId}`);
  },

  resetPassword: async (id: string): Promise<ResetPasswordResponse> => {
    const { data } = await api.post(`/users/${id}/reset-password`);
    return data as ResetPasswordResponse;
  },

  // ── Summary ──

  getSummary: async (id: string): Promise<UserSummary> => {
    const { data } = await api.get(`/users/${id}/summary`);
    return data as UserSummary;
  },
};
