import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { STALE_TIME_5M } from "@/lib/constants";
import { teamMemberApi } from "./api";
import type { CreateTeamMemberPayload } from "./types";

const TEAM_MEMBERS_KEY = ["team-members"] as const;

export function useTeamMembers() {
  return useQuery({
    queryKey: TEAM_MEMBERS_KEY,
    queryFn: teamMemberApi.list,
    staleTime: STALE_TIME_5M,
    select: (data) => data.members,
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTeamMemberPayload) => teamMemberApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TEAM_MEMBERS_KEY] });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => teamMemberApi.remove(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TEAM_MEMBERS_KEY] });
    },
  });
}

export function useToggleTeamMemberActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => teamMemberApi.toggleActive(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...TEAM_MEMBERS_KEY] });
    },
  });
}

export function useResetTeamMemberPassword() {
  return useMutation({
    mutationFn: (memberId: string) => teamMemberApi.resetPassword(memberId),
  });
}
