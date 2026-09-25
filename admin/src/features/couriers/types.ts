import type { Pagination } from "../service-providers/types";

export interface CourierListItem {
  id: string;
  name: string;
  serviceProvider: string;
  serviceProviderDisplayName: string;
  courierType: "delivery";
  businessType: string[];
  isEnabled: boolean;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourierStats {
  total: number;
  enabled: number;
  disabled: number;
  delivery: number;
}

export interface CreateCourierPayload {
  name: string;
  /** Specific service-provider account id to bind this courier to. */
  serviceProviderId: string;
  courierType: "delivery";
  businessType?: string[];
  isEnabled?: boolean;
  logo?: string | null;
}

export interface UpdateCourierPayload {
  /** Seller-facing display name for the courier. */
  name: string;
}

export interface ListCouriersResponse {
  couriers: CourierListItem[];
  pagination: Pagination;
  stats: CourierStats;
}
