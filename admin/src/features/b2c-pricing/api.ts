import { api } from "@/lib/api";
import type {
  ListZonesResponse,
  CreateZonePayload,
  UpdateZonePayload,
  ListPricingResponse,
  GetPricingByCourierResponse,
  UpsertPricingPayload,
  BatchUpsertPricingPayload,
  B2cPricingItem,
} from "./types";

export const b2cZonesApi = {
  list: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ListZonesResponse> => {
    const { data } = await api.get("/b2c-zones", { params });
    return data as ListZonesResponse;
  },

  create: async (
    payload: CreateZonePayload,
  ): Promise<{ id: string; name: string; code: string }> => {
    const { data } = await api.post("/b2c-zones", payload);
    return data.zone as { id: string; name: string; code: string };
  },

  update: async (
    id: string,
    payload: UpdateZonePayload,
  ): Promise<{ id: string; name: string; code: string }> => {
    const { data } = await api.put(`/b2c-zones/${id}`, payload);
    return data.zone as { id: string; name: string; code: string };
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/b2c-zones/${id}`);
  },

  toggle: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.patch(`/b2c-zones/${id}/toggle`);
    return data as { message: string };
  },
};

export const b2cPricingApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    plan?: string;
    courier?: string;
    serviceProvider?: string;
    mode?: string;
    minWeight?: number;
  }): Promise<ListPricingResponse> => {
    const { data } = await api.get("/b2c-pricing", { params });
    return data as ListPricingResponse;
  },

  getByCourier: async (
    courierId: string,
    plan?: string,
  ): Promise<GetPricingByCourierResponse> => {
    const { data } = await api.get(`/b2c-pricing/courier/${courierId}`, {
      params: plan ? { plan } : undefined,
    });
    return data as GetPricingByCourierResponse;
  },

  getAllByCourier: async (
    courierId: string,
  ): Promise<{ pricing: B2cPricingItem[] }> => {
    const { data } = await api.get(`/b2c-pricing/courier/${courierId}`);
    return data as { pricing: B2cPricingItem[] };
  },

  upsert: async (
    payload: UpsertPricingPayload,
  ): Promise<{ message: string }> => {
    const { data } = await api.post("/b2c-pricing", payload);
    return data as { message: string };
  },

  batchUpsert: async (
    payload: BatchUpsertPricingPayload,
  ): Promise<{ message: string; saved: number }> => {
    const { data } = await api.post("/b2c-pricing/batch", payload);
    return data as { message: string; saved: number };
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/b2c-pricing/${id}`);
  },
};
