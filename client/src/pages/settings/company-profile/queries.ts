import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIME_5M } from "@/lib/constants";
import { profileApi } from "./api";
import type { ProfileUpdatePayload } from "./types";

const PROFILE_QUERY_KEY = ["company-profile"] as const;

export function useCompanyProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: profileApi.get,
    staleTime: STALE_TIME_5M,
    select: (data) => data.profile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => profileApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PROFILE_QUERY_KEY] });
    },
  });
}
