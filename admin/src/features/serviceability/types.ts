import type { Pagination } from "../service-providers/types";

export type LocationTag =
  | "north"
  | "south"
  | "east"
  | "west"
  | "metro"
  | "special_zone";

export interface LocationListItem {
  id: string;
  pincode: string;
  city: string;
  state: string;
  tags: LocationTag[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListLocationsResponse {
  locations: LocationListItem[];
  pagination: Pagination;
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

export interface CreateLocationPayload {
  pincode: string;
  city: string;
  state: string;
  tags?: LocationTag[];
  isActive?: boolean;
}

export interface BulkImportPayload {
  locations: CreateLocationPayload[];
}

export interface BulkImportResponse {
  message: string;
  inserted: number;
  duplicates: number;
}

export interface BulkDeletePayload {
  ids: string[];
}

export interface PincodeLookupResponse {
  city: string;
  state: string;
}
