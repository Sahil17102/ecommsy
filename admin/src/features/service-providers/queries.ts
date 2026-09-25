import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceProvidersApi, type CreateProviderPayload } from "./api";
import type { ListProvidersResponse, ProviderCredentialsResponse } from "./types";

export const SP_LIST_KEY = ["service-providers"] as const;

export function useServiceProviders(page?: number, limit?: number) {
  return useQuery<ListProvidersResponse>({
    queryKey: [...SP_LIST_KEY, { page, limit }],
    queryFn: () => serviceProvidersApi.list({ page, limit }),
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProviderPayload) => serviceProvidersApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SP_LIST_KEY });
    },
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      status?: "active" | "inactive";
      isEnabled?: boolean;
      b2bSameAsB2c?: boolean;
    }) => serviceProvidersApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SP_LIST_KEY });
    },
  });
}

export function useUpdateCredentials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      type,
      credentials,
    }: {
      id: string;
      type: "b2c" | "b2b";
      credentials: Record<string, string>;
    }) => serviceProvidersApi.updateCredentials(id, type, credentials),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SP_LIST_KEY });
    },
  });
}

export function useUploadProviderLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      serviceProvidersApi.uploadLogo(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SP_LIST_KEY });
    },
  });
}

export function useProviderCredentials(id: string | null) {
  return useQuery<ProviderCredentialsResponse>({
    queryKey: ["service-providers", id, "credentials"],
    queryFn: () => serviceProvidersApi.getCredentials(id!),
    enabled: !!id,
    staleTime: 0,
  });
}
