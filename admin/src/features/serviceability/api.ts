import { api } from "@/lib/api";
import type {
  ListLocationsResponse,
  CreateLocationPayload,
  BulkImportPayload,
  BulkImportResponse,
  BulkDeletePayload,
  PincodeLookupResponse,
} from "./types";

export const locationsApi = {
  list: async (params?: {
    search?: string;
    state?: string;
    tag?: string;
    isActive?: string;
    page?: number;
    limit?: number;
  }): Promise<ListLocationsResponse> => {
    const { data } = await api.get("/locations", { params });
    return data as ListLocationsResponse;
  },

  create: async (
    payload: CreateLocationPayload,
  ): Promise<{ id: string; pincode: string; city: string; state: string }> => {
    const { data } = await api.post("/locations", payload);
    return data.location as {
      id: string;
      pincode: string;
      city: string;
      state: string;
    };
  },

  bulkImport: async (
    payload: BulkImportPayload,
  ): Promise<BulkImportResponse> => {
    const { data } = await api.post("/locations/import", payload);
    return data as BulkImportResponse;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/locations/${id}`);
  },

  bulkDelete: async (
    payload: BulkDeletePayload,
  ): Promise<{ deletedCount: number }> => {
    const { data } = await api.post("/locations/bulk-delete", payload);
    return data as { deletedCount: number };
  },

  toggle: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.patch(`/locations/${id}/toggle`);
    return data as { message: string };
  },

  lookupPincode: async (pincode: string): Promise<PincodeLookupResponse> => {
    const { data } = await api.get(`/locations/pincode-lookup/${pincode}`);
    return data as PincodeLookupResponse;
  },
};
