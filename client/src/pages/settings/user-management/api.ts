import { api } from "@/lib/api";
import type {
  ListTeamMembersResponse,
  TeamMemberResponse,
  ResetPasswordResponse,
  CreateTeamMemberPayload,
} from "./types";

export const teamMemberApi = {
  list: async (): Promise<ListTeamMembersResponse> => {
    const { data } = await api.get("/team-members");
    return data;
  },

  create: async (payload: CreateTeamMemberPayload): Promise<TeamMemberResponse> => {
    const { data } = await api.post("/team-members", payload);
    return data;
  },

  remove: async (memberId: string): Promise<void> => {
    await api.delete(`/team-members/${memberId}`);
  },

  toggleActive: async (memberId: string): Promise<TeamMemberResponse> => {
    const { data } = await api.patch(`/team-members/${memberId}/toggle-active`);
    return data;
  },

  resetPassword: async (memberId: string): Promise<ResetPasswordResponse> => {
    const { data } = await api.post(`/team-members/${memberId}/reset-password`);
    return data;
  },
};
