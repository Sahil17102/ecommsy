import { api } from "@/lib/api";
import type {
  PickupAddressListResponse,
  PickupAddressSingleResponse,
  PickupAddressFormValues,
  BulkAddressImportRow,
  BulkImportResponse,
} from "./types";

export const pickupAddressApi = {
  list: async (): Promise<PickupAddressListResponse> => {
    const { data } = await api.get("/pickup-addresses");
    return data;
  },

  getById: async (id: string): Promise<PickupAddressSingleResponse> => {
    const { data } = await api.get(`/pickup-addresses/${id}`);
    return data;
  },

  create: async (
    payload: PickupAddressFormValues,
  ): Promise<PickupAddressSingleResponse> => {
    const { data } = await api.post("/pickup-addresses", payload);
    return data;
  },

  bulkImport: async (
    addresses: BulkAddressImportRow[],
  ): Promise<BulkImportResponse> => {
    const { data } = await api.post("/pickup-addresses/bulk", { addresses });
    return data;
  },

  update: async (
    id: string,
    payload: Partial<PickupAddressFormValues>,
  ): Promise<PickupAddressSingleResponse> => {
    const { data } = await api.put(`/pickup-addresses/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/pickup-addresses/${id}`);
    return data;
  },

  setPrimary: async (id: string): Promise<PickupAddressSingleResponse> => {
    const { data } = await api.patch(`/pickup-addresses/${id}/primary`);
    return data;
  },
};
