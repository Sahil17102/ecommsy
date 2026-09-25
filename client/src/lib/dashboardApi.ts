import { api } from "./api";

// ── KPI with trend ──
export interface KpiTrend {
  current: number;
  previous: number;
}

export interface NullableKpiTrend {
  current: number | null;
  previous: number | null;
}

// ── Pipeline ──
export interface ShipmentPipeline {
  created: number;
  processing: number;
  inTransit: number;
  outForDelivery: number;
  ndr: number;
  rto: number;
}

// ── Trend ──
export interface TrendPoint {
  date: string;
  orders: number;
  delivered: number;
  rto: number;
}

// ── Courier ──
export interface CourierScore {
  courier: string;
  totalOrders: number;
  delivered: number;
  successRate: number;
  rtoRate: number;
  avgDeliveryDays: number | null;
  avgCost: number;
}

// ── Zone ──
export interface ZonePerf {
  zone: string;
  zoneName: string;
  totalOrders: number;
  successRate: number;
  rtoRate: number;
  avgCost: number;
  avgDeliveryDays: number | null;
}

// ── Payment ──
export interface PaymentBucket {
  orders: number;
  delivered: number;
  totalAmount: number;
  codAmount: number;
}

// ── City ──
export interface CityData {
  city: string;
  orders: number;
  deliveryRate: number;
}

// ── Full response ──
export interface SellerDashboardData {
  kpis: {
    deliveryRate: KpiTrend;
    avgDeliveryDays: NullableKpiTrend;
    rtoRate: KpiTrend;
    totalOrders: KpiTrend;
    totalCost: number;
  };
  pipeline: ShipmentPipeline;
  trends: TrendPoint[];
  courierScorecard: CourierScore[];
  zonePerformance: ZonePerf[];
  paymentSplit: {
    prepaid: PaymentBucket;
    cod: PaymentBucket;
  };
  codPending: {
    amount: number;
    count: number;
  };
  topCities: CityData[];
}

// ── Filters ──
export interface DashboardFilters {
  from?: string;
  to?: string;
  days?: number;
  orderType?: "B2B" | "B2C";
}

// ── API ──
export const dashboardApi = {
  getSummary: async (filters?: DashboardFilters): Promise<SellerDashboardData> => {
    const { data } = await api.get("/dashboard/summary", { params: filters });
    return data as SellerDashboardData;
  },
};
