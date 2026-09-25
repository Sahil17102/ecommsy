import type { Pagination } from "../service-providers/types";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListPlansResponse {
  plans: Plan[];
  pagination: Pagination;
}

export interface CreatePlanPayload {
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdatePlanPayload {
  name?: string;
  description?: string;
  sortOrder?: number;
  isDefault?: boolean;
}
