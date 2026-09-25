import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminBankAccountApi } from "./api";

const ADMIN_BANK_ACCOUNTS_KEY = ["admin-bank-accounts"] as const;

export function useAdminBankAccounts(userId: string) {
  return useQuery({
    queryKey: [...ADMIN_BANK_ACCOUNTS_KEY, userId],
    queryFn: () => adminBankAccountApi.listByUser(userId),
    select: (data) => data.accounts,
    enabled: !!userId,
  });
}

export function useApproveBankAccount(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBankAccountApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_BANK_ACCOUNTS_KEY, userId],
      });
    },
  });
}

export function useRejectBankAccount(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminBankAccountApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_BANK_ACCOUNTS_KEY, userId],
      });
    },
  });
}
