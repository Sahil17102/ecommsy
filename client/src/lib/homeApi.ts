import { api } from "./api";

export interface QuickStats {
  ordersToday: number;
  inTransit: number;
  ndrPending: number;
  rtoPending: number;
}

export interface RecentHomeOrder {
  id: string;
  orderId: string;
  awb: string;
  status: string;
  serviceProvider: string | null;
  city: string;
  contactName: string;
  createdAt: string;
}

export interface StatusBucket {
  status: string;
  count: number;
}

export interface SellerHomeData {
  quickStats: QuickStats;
  wallet: { balance: number };
  codPending: { amount: number; count: number };
  statusDistribution: StatusBucket[];
  recentOrders: RecentHomeOrder[];
}

export const homeApi = {
  get: async (): Promise<SellerHomeData> => {
    const { data } = await api.get("/dashboard/home");
    return data as SellerHomeData;
  },
};
