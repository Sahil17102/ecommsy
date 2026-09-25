import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { billingInvoiceApi } from "@/lib/billingInvoiceApi";
import { STALE_TIME_5M } from "@/lib/constants";

export const BILLING_INVOICES_KEY = ["billing-invoices"] as const;

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: BILLING_INVOICES_KEY });
}

export function useBillingInvoices(params?: {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
}) {
  return useQuery({
    queryKey: [...BILLING_INVOICES_KEY, "list", params],
    queryFn: () => billingInvoiceApi.list(params),
    staleTime: STALE_TIME_5M,
    placeholderData: keepPreviousData,
  });
}

export function useInvoiceOrders(id: string | null) {
  return useQuery({
    queryKey: [...BILLING_INVOICES_KEY, "orders", id],
    queryFn: () => billingInvoiceApi.getOrders(id!),
    enabled: !!id,
    staleTime: STALE_TIME_5M,
  });
}

export function useBillingPreferences() {
  return useQuery({
    queryKey: [...BILLING_INVOICES_KEY, "preferences"],
    queryFn: () => billingInvoiceApi.getPreferences(),
    staleTime: STALE_TIME_5M,
  });
}

export function useGenerateInvoice() {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: (payload: { periodStart: string; periodEnd: string }) =>
      billingInvoiceApi.generate(payload),
    onSuccess,
  });
}

export function useUpdateBillingPreferences() {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: billingInvoiceApi.updatePreferences,
    onSuccess,
  });
}
