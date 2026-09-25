import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { codRemittanceApi } from "./api";
import type {
  ListRemittancesParams,
  CreditRemittancePayload,
  ConfirmSettlementPayload,
} from "./types";

export const COD_REMITTANCE_KEY = ["cod-remittance"] as const;

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: COD_REMITTANCE_KEY });
}

export function useCodRemittanceStats() {
  return useQuery({
    queryKey: [...COD_REMITTANCE_KEY, "stats"],
    queryFn: codRemittanceApi.getStats,
  });
}

export function useCodRemittances(params?: ListRemittancesParams) {
  return useQuery({
    queryKey: [...COD_REMITTANCE_KEY, "list", params],
    queryFn: () => codRemittanceApi.list(params),
  });
}

export function useCreditRemittance() {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...payload }: CreditRemittancePayload & { id: string }) =>
      codRemittanceApi.credit(id, payload),
    onSuccess,
  });
}

export function useUpdateNotes() {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      codRemittanceApi.updateNotes(id, notes),
    onSuccess,
  });
}

export function useAutoCredit() {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: (daysOld?: number) => codRemittanceApi.autoCredit(daysOld),
    onSuccess,
  });
}

export function usePreviewSettlement() {
  return useMutation({
    mutationFn: (rows: Array<{ awbNumber: string; amount: number }>) =>
      codRemittanceApi.previewSettlementCsv(rows),
  });
}

export function useConfirmSettlement() {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: (payload: ConfirmSettlementPayload) =>
      codRemittanceApi.confirmSettlement(payload),
    onSuccess,
  });
}
