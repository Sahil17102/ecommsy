import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIME_5M } from "@/lib/constants";
import { bankAccountApi } from "./api";

const BANK_ACCOUNTS_KEY = ["bank-accounts"] as const;

export function useBankAccounts() {
  return useQuery({
    queryKey: BANK_ACCOUNTS_KEY,
    queryFn: bankAccountApi.list,
    staleTime: STALE_TIME_5M,
    select: (data) => data.accounts,
  });
}

export function useAddBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => bankAccountApi.addBankAccount(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...BANK_ACCOUNTS_KEY] });
    },
  });
}

export function useAddUpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { accountHolderName: string; upiId: string }) =>
      bankAccountApi.addUpi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...BANK_ACCOUNTS_KEY] });
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bankAccountApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...BANK_ACCOUNTS_KEY] });
    },
  });
}

export function useSetPrimaryBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bankAccountApi.setPrimary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...BANK_ACCOUNTS_KEY] });
    },
  });
}
