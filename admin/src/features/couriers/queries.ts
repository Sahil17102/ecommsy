import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { couriersApi } from "./api";
import { SP_LIST_KEY } from "../service-providers/queries";
import type { CreateCourierPayload, UpdateCourierPayload, ListCouriersResponse } from "./types";

export const COURIERS_KEY = ["couriers"] as const;

function useInvalidateCouriers() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: COURIERS_KEY });
    qc.invalidateQueries({ queryKey: SP_LIST_KEY });
  };
}

export interface CourierFilters {
  serviceProvider?: string;
  businessType?: string;
  isEnabled?: string;
  page?: number;
  limit?: number;
}

export function useCouriers(filters: CourierFilters = {}) {
  return useQuery<ListCouriersResponse>({
    queryKey: [...COURIERS_KEY, filters],
    queryFn: () => couriersApi.list(filters),
  });
}

export function useCreateCourier() {
  const onSuccess = useInvalidateCouriers();
  return useMutation({
    mutationFn: (payload: CreateCourierPayload) => couriersApi.create(payload),
    onSuccess,
  });
}

export function useUpdateCourier() {
  const onSuccess = useInvalidateCouriers();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateCourierPayload & { id: string }) =>
      couriersApi.update(id, payload),
    onSuccess,
  });
}

export function useDeleteCourier() {
  const onSuccess = useInvalidateCouriers();
  return useMutation({
    mutationFn: (id: string) => couriersApi.delete(id),
    onSuccess,
  });
}

export function useToggleCourier() {
  const onSuccess = useInvalidateCouriers();
  return useMutation({
    mutationFn: (id: string) => couriersApi.toggle(id),
    onSuccess,
  });
}
