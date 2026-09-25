import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKycApi } from "./api";
import { ADMIN_KYC_QUERY_KEY } from "./config";

// ── Queries ──

export function useAdminKyc(userId: string) {
  return useQuery({
    queryKey: [...ADMIN_KYC_QUERY_KEY, userId],
    queryFn: () => adminKycApi.getByUserId(userId),
    select: (data) => data.kyc,
    enabled: !!userId,
  });
}

// ── Mutations ──

export function useApproveKyc(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminKycApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ADMIN_KYC_QUERY_KEY, userId] });
    },
  });
}

export function useRejectKyc(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminKycApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ADMIN_KYC_QUERY_KEY, userId] });
    },
  });
}

export function useApproveDocument(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, key }: { id: string; key: string }) =>
      adminKycApi.approveDocument(id, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ADMIN_KYC_QUERY_KEY, userId] });
    },
  });
}

export function useRejectDocument(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      key,
      reason,
    }: {
      id: string;
      key: string;
      reason: string;
    }) => adminKycApi.rejectDocument(id, key, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ADMIN_KYC_QUERY_KEY, userId] });
    },
  });
}
