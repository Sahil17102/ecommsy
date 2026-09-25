import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billingInvoicesApi } from "./api";
import type { ListInvoicesParams, GenerateInvoicePayload } from "./types";

export const BILLING_INVOICES_KEY = ["billing-invoices"] as const;

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: BILLING_INVOICES_KEY });
}

export function useBillingInvoices(params?: ListInvoicesParams) {
  return useQuery({
    queryKey: [...BILLING_INVOICES_KEY, "list", params],
    queryFn: () => billingInvoicesApi.list(params),
  });
}

export function useInvoiceOrders(id: string | null) {
  return useQuery({
    queryKey: [...BILLING_INVOICES_KEY, "orders", id],
    queryFn: () => billingInvoicesApi.getOrders(id!),
    enabled: !!id,
  });
}

export function useVoidInvoice() {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => billingInvoicesApi.voidInvoice(id),
    onSuccess,
  });
}

export function useGenerateInvoice() {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: (payload: GenerateInvoicePayload) => billingInvoicesApi.generate(payload),
    onSuccess,
  });
}
