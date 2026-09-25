// ── System Overview ──
export interface SystemOverview {
  totalOrders: number;
  previousOrders: number;
  ordersToday: number;
  activeSellers: number;
  revenue: number;
  previousRevenue: number;
  deliveryRate: number;
  previousDeliveryRate: number;
  avgDeliveryDays: number | null;
}

// ── Courier Insights ──
export interface CourierInsight {
  courier: string;
  totalOrders: number;
  delivered: number;
  failed: number;
  successRate: number;
  failureRate: number;
  revenue: number;
  avgDeliveryDays: number | null;
}

// ── Trend Point ──
export interface TrendPoint {
  date: string;
  orders: number;
  delivered: number;
  rto: number;
  revenue: number;
}

// ── Revenue & Margins ──
export interface CourierMargin {
  courier: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  orderCount: number;
  revenuePerOrder: number;
}

export interface RevenueData {
  margins: CourierMargin[];
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
}

// ── Seller Insights ──
export interface SellerRow {
  id: string;
  name: string;
  email: string;
  totalOrders: number;
  delivered: number;
  rto: number;
  revenue: number;
  rtoRate: number;
}

// ── Alerts ──
export interface FailureSpike {
  courier: string;
  total: number;
  failed: number;
  failureRate: number;
}

export interface AdminAlerts {
  failureSpikes: FailureSpike[];
  delayedShipments: number;
  ndrPending: number;
  totalAlerts: number;
}

// ── Pending Actions ──
export interface PendingActions {
  kycPending: number;
  bankApprovalsPending: number;
  codRemittancesPending: number;
}

// ── Payment Split ──
export interface PaymentBucket {
  orders: number;
  delivered: number;
  revenue: number;
  codAmount: number;
}

// ── Top State ──
export interface StateData {
  state: string;
  orders: number;
  deliveryRate: number;
  revenue: number;
}

// ── Status Distribution ──
export interface StatusBucket {
  status: string;
  count: number;
}

// ── Dashboard Filters ──
export interface DashboardFilters {
  days?: number;
  serviceProvider?: string;
  paymentType?: string;
}

// ── Full Dashboard Response ──
export interface AdminDashboardData {
  overview: SystemOverview;
  courierInsights: CourierInsight[];
  trends: TrendPoint[];
  revenue: RevenueData;
  sellers: {
    topSellers: SellerRow[];
    highRtoSellers: SellerRow[];
  };
  alerts: AdminAlerts;
  pendingActions: PendingActions;
  paymentSplit: {
    prepaid: PaymentBucket;
    cod: PaymentBucket;
  };
  topStates: StateData[];
  statusDistribution: StatusBucket[];
}
