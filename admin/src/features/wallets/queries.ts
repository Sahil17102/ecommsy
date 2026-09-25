import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { walletsApi } from "./api";
import type {
  ListWalletsParams,
  ListTransactionsParams,
  AdjustWalletPayload,
} from "./types";

export const WALLETS_KEY = ["wallets"];

export function useWallets(params?: ListWalletsParams) {
  return useQuery({
    queryKey: [...WALLETS_KEY, params],
    queryFn: () => walletsApi.list(params),
  });
}

export function useWalletTransactions(params: ListTransactionsParams) {
  return useQuery({
    queryKey: [...WALLETS_KEY, "transactions", params],
    queryFn: () => walletsApi.transactions(params),
    enabled: !!params.userId,
  });
}

export function useAdjustWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...payload }: AdjustWalletPayload & { userId: string }) =>
      walletsApi.adjust(userId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WALLETS_KEY }),
  });
}
