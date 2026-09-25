import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "./api";
import type {
  ListUsersResponse,
  UserListItem,
  UserSummary,
  ListTeamMembersResponse,
  CreateTeamMemberPayload,
} from "./types";

export const USERS_KEY = ["users"] as const;

export function useUsers(filters?: {
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
}) {
  return useQuery<ListUsersResponse>({
    queryKey: [...USERS_KEY, filters],
    queryFn: () => usersApi.list(filters),
  });
}

export function useUser(id: string) {
  return useQuery<{ user: UserListItem }>({
    queryKey: [...USERS_KEY, id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function useUpdateUserPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) =>
      usersApi.updatePlan(id, plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

// ── Team members ──

export const TEAM_MEMBERS_KEY = ["users", "team-members"] as const;

export function useUserTeamMembers(userId: string) {
  return useQuery<ListTeamMembersResponse>({
    queryKey: [...TEAM_MEMBERS_KEY, userId],
    queryFn: () => usersApi.listTeamMembers(userId),
    enabled: !!userId,
  });
}

export function useCreateUserTeamMember(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTeamMemberPayload) =>
      usersApi.createTeamMember(userId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...TEAM_MEMBERS_KEY, userId] });
    },
  });
}

export function useDeleteUserTeamMember(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      usersApi.deleteTeamMember(userId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...TEAM_MEMBERS_KEY, userId] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (userId: string) => usersApi.resetPassword(userId),
  });
}

// ── Summary ──

export const USER_SUMMARY_KEY = ["users", "summary"] as const;

export function useUserSummary(userId: string) {
  return useQuery<UserSummary>({
    queryKey: [...USER_SUMMARY_KEY, userId],
    queryFn: () => usersApi.getSummary(userId),
    enabled: !!userId,
  });
}
