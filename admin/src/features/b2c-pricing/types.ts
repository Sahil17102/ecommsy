import type { Pagination } from "../service-providers/types";

export interface B2cZone {
  id: string;
  name: string;
  description: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListZonesResponse {
  zones: B2cZone[];
  pagination: Pagination;
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

export interface CreateZonePayload {
  name: string;
  description?: string;
  code: string;
}

export interface UpdateZonePayload {
  name?: string;
  description?: string;
  code?: string;
}

export interface WeightSlab {
  minWeight: number;
  maxWeight: number | null;
}

export interface SlabRate {
  forward: number;
  rto: number;
  codCharges: number;
  codPercent: number;
}

export interface ZoneRate {
  zone: string;
  slabRates: SlabRate[];
}

export interface PopulatedZoneRate {
  zone: { id: string; name: string; code: string };
  slabRates: SlabRate[];
}

export interface B2cPricingItem {
  id: string;
  courier: { id: string; name: string; serviceProvider: string };
  plan: string;
  mode: "air" | "surface";
  otherCharges: number;
  weightSlabs: WeightSlab[];
  zoneRates: PopulatedZoneRate[];
  createdAt: string;
  updatedAt: string;
}

export interface ListPricingResponse {
  pricing: B2cPricingItem[];
  pagination: Pagination;
}

export interface GetPricingByCourierResponse {
  pricing: B2cPricingItem | null;
}

export interface UpsertPricingPayload {
  courierId: string;
  plan: string;
  mode: "air" | "surface";
  otherCharges: number;
  weightSlabs: WeightSlab[];
  zoneRates: ZoneRate[];
}

export interface BatchUpsertPricingPayload {
  courierId: string;
  mode: "air" | "surface";
  otherCharges: number;
  weightSlabs: WeightSlab[];
  planRates: Record<string, ZoneRate[]>;
}
