import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plansApi } from "./api";
import type { CreatePlanPayload, UpdatePlanPayload } from "./types";

export const PLANS_KEY = ["plans"];

export function usePlans(params?: { isActive?: boolean }) {
  return useQuery({
    queryKey: [...PLANS_KEY, params],
    queryFn: () => plansApi.list(params),
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePlanPayload) => plansApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdatePlanPayload & { id: string }) =>
      plansApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plansApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

export function useTogglePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plansApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}
