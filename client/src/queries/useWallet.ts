import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { walletApi } from "@/lib/walletApi";
import { STALE_TIME_5M } from "@/lib/constants";

export const WALLET_QUERY_KEY = ["wallet", "balance"];
export const WALLET_TRANSACTIONS_KEY = ["wallet", "transactions"];

export function useWalletBalance() {
  return useQuery({
    queryKey: WALLET_QUERY_KEY,
    queryFn: walletApi.getBalance,
    staleTime: STALE_TIME_5M,
    refetchOnWindowFocus: true,
  });
}

export function useWalletTransactions(params?: {
  type?: "credit" | "debit";
  serviceProvider?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
}) {
  return useQuery({
    queryKey: [...WALLET_TRANSACTIONS_KEY, params],
    queryFn: () => walletApi.getTransactions(params),
    staleTime: STALE_TIME_5M,
    placeholderData: keepPreviousData,
  });
}

export function useCreateRechargeOrder() {
  return useMutation({
    mutationFn: walletApi.createRechargeOrder,
  });
}

export function useVerifyRecharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: walletApi.verifyRecharge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WALLET_TRANSACTIONS_KEY });
    },
  });
}
