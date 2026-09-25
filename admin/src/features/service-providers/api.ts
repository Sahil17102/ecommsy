import { api } from "@/lib/api";
import type {
  ProviderCredentialsResponse,
  ListProvidersResponse,
  ProviderListItem,
  CredentialFieldDef,
} from "./types";

interface CredentialBlockPayload {
  values: Record<string, string>;
  fields?: CredentialFieldDef[];
  description?: string;
}

export interface CreateProviderPayload {
  slug: string;
  name: string;
  baseUrl?: string;
  isActive?: boolean;
  credentials?: {
    b2c?: CredentialBlockPayload;
    b2b?: CredentialBlockPayload & { sameAsB2c?: boolean };
  };
}

export const serviceProvidersApi = {
  list: async (params?: { page?: number; limit?: number; configured?: boolean }): Promise<ListProvidersResponse> => {
    const { data } = await api.get("/service-providers", { params });
    return data as ListProvidersResponse;
  },

  create: async (payload: CreateProviderPayload): Promise<ProviderListItem> => {
    const { data } = await api.post("/service-providers", payload);
    return data.provider as ProviderListItem;
  },

  getById: async (id: string): Promise<ProviderListItem> => {
    const { data } = await api.get(`/service-providers/${id}`);
    return data.provider as ProviderListItem;
  },

  update: async (
    id: string,
    payload: {
      status?: "active" | "inactive";
      isEnabled?: boolean;
      b2bSameAsB2c?: boolean;
    },
  ): Promise<void> => {
    await api.put(`/service-providers/${id}`, payload);
  },

  updateCredentials: async (
    id: string,
    type: "b2c" | "b2b",
    credentials: Record<string, string>,
  ): Promise<void> => {
    await api.patch(`/service-providers/${id}/credentials`, { type, credentials });
  },

  getCredentials: async (id: string): Promise<ProviderCredentialsResponse> => {
    const { data } = await api.get(`/service-providers/${id}/credentials`);
    return data as ProviderCredentialsResponse;
  },

  uploadLogo: async (id: string, file: File): Promise<{ logoUrl: string }> => {
    const form = new FormData();
    form.append("logo", file);
    const { data } = await api.post(`/service-providers/${id}/logo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data as { logoUrl: string };
  },
};
