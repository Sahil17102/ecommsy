import { useState } from "react";
import { Typography, Card, Table, Tag, Tabs, Select } from "antd";
import {
  PackageOpen,
  Users,
  Truck,
  IndianRupee,
  AlertTriangle,
  Award,
  TrendingUp,
  TrendingDown,
  FileCheck,
  Landmark,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAdminDashboard } from "./queries";
import { formatCurrency, formatKeyword } from "@/lib/utils";
import type {
  CourierInsight,
  CourierMargin,
  SellerRow,
  FailureSpike,
  TrendPoint,
  StateData,
  StatusBucket,
} from "./types";

const { Title, Text } = Typography;

const COLORS = ["#6C5CE7", "#F97316", "#10B981", "#3B82F6", "#EF4444", "#94A3B8", "#8B5CF6", "#EC4899"];
const PIE_COLORS = ["#6C5CE7", "#F97316"];

const STATUS_COLORS_MAP: Record<string, string> = {
  created: "#6B7280",
  processing: "#3B82F6",
  booked: "#3B82F6",
  pickup_initiated: "#8B5CF6",
  shipped: "#6366F1",
  in_transit: "#0EA5E9",
  out_for_delivery: "#F59E0B",
  delivered: "#10B981",
  ndr: "#EF4444",
  rto_initiated: "#F97316",
  rto_in_transit: "#F97316",
  rto_delivered: "#DC2626",
  cancelled: "#9CA3AF",
  lost: "#7C3AED",
};

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--color-bg-elevated, #fff)",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: 8,
  color: "var(--color-text, #0f172a)",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

// ── Helpers ──
function trendDelta(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) return { value: current > 0 ? "New" : "—", positive: current > 0 };
  const delta = ((current - previous) / previous) * 100;
  return { value: `${delta > 0 ? "+" : ""}${Math.round(delta * 10) / 10}%`, positive: delta >= 0 };
}

// ── Stat Card with Trend ──
function StatCard({
  label,
  value,
  subtitle,
  trend,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
  icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>;
  color: string;
}) {
  return (
    <Card className="!border-border" styles={{ body: { padding: "12px 16px" } }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Text className="text-muted text-xs">{label}</Text>
          <div className="text-lg sm:text-xl font-semibold text-foreground mt-0.5 truncate">{value}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {subtitle && <Text className="text-[11px] text-muted">{subtitle}</Text>}
            {trend && trend.value !== "—" && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
                trend.positive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
              }`}>
                {trend.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {trend.value}
              </span>
            )}
          </div>
        </div>
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: color + "14" }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </Card>
  );
}

// ── Courier Performance Table ──
function CourierInsightsTable({ data }: { data: CourierInsight[] }) {
  const columns = [
    {
      title: "Courier",
      dataIndex: "courier",
      key: "courier",
      render: (v: string) => <span className="font-medium">{formatKeyword(v)}</span>,
    },
    {
      title: "Orders",
      dataIndex: "totalOrders",
      key: "totalOrders",
      sorter: (a: CourierInsight, b: CourierInsight) => a.totalOrders - b.totalOrders,
    },
    {
      title: "Success %",
      dataIndex: "successRate",
      key: "successRate",
      sorter: (a: CourierInsight, b: CourierInsight) => a.successRate - b.successRate,
      render: (v: number) => (
        <span className={v >= 80 ? "text-green-600 font-medium" : v >= 60 ? "text-violet-600" : "text-red-500 font-medium"}>
          {v}%
        </span>
      ),
    },
    {
      title: "Failure %",
      dataIndex: "failureRate",
      key: "failureRate",
      sorter: (a: CourierInsight, b: CourierInsight) => a.failureRate - b.failureRate,
      render: (v: number) => (
        <span className={v > 20 ? "text-red-500 font-medium" : ""}>{v}%</span>
      ),
    },
    {
      title: "Avg Days",
      dataIndex: "avgDeliveryDays",
      key: "avgDeliveryDays",
      render: (v: number | null) => (v != null ? `${v}d` : "—"),
    },
    {
      title: "Revenue",
      dataIndex: "revenue",
      key: "revenue",
      sorter: (a: CourierInsight, b: CourierInsight) => a.revenue - b.revenue,
      render: (v: number) => formatCurrency(v),
    },
  ];

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="courier"
      pagination={false}
      size="small"
      scroll={{ x: 600 }}
    />
  );
}

// ── Revenue Margins Table ──
function MarginsTable({ data }: { data: CourierMargin[] }) {
  const columns = [
    {
      title: "Courier",
      dataIndex: "courier",
      key: "courier",
      render: (v: string) => <span className="font-medium">{formatKeyword(v)}</span>,
    },
    {
      title: "Revenue",
      dataIndex: "revenue",
      key: "revenue",
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Cost",
      dataIndex: "cost",
      key: "cost",
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Margin",
      dataIndex: "margin",
      key: "margin",
      render: (v: number) => (
        <span className={v >= 0 ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
          {formatCurrency(v)}
        </span>
      ),
    },
    {
      title: "Margin %",
      dataIndex: "marginPercent",
      key: "marginPercent",
      sorter: (a: CourierMargin, b: CourierMargin) => a.marginPercent - b.marginPercent,
      render: (v: number) => (
        <Tag color={v >= 20 ? "green" : v >= 10 ? "blue" : v >= 0 ? "orange" : "red"}>
          {v}%
        </Tag>
      ),
    },
    {
      title: "Rev/Order",
      dataIndex: "revenuePerOrder",
      key: "revenuePerOrder",
      render: (v: number) => formatCurrency(v),
    },
  ];

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="courier"
      pagination={false}
      size="small"
      scroll={{ x: 600 }}
    />
  );
}

// ── Seller Table (shared for top sellers and high RTO) ──
function SellerTable({ data, showRevenue = false }: { data: SellerRow[]; showRevenue?: boolean }) {
  const columns = [
    {
      title: "Seller",
      key: "name",
      render: (_: unknown, r: SellerRow) => (
        <div>
          <div className="font-medium text-foreground">{r.name || "—"}</div>
          <div className="text-xs text-muted">{r.email}</div>
        </div>
      ),
    },
    { title: "Orders", dataIndex: "totalOrders", key: "totalOrders" },
    ...(showRevenue
      ? [{
          title: "Revenue",
          dataIndex: "revenue" as const,
          key: "revenue",
          render: (v: number) => formatCurrency(v),
        }]
      : []),
    {
      title: "RTO %",
      dataIndex: "rtoRate",
      key: "rtoRate",
      render: (v: number) => (
        <Tag color={v > 25 ? "red" : v > 15 ? "orange" : "blue"}>{v}%</Tag>
      ),
    },
  ];

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="id"
      pagination={false}
      size="small"
      scroll={{ x: 400 }}
    />
  );
}

// ── Trend Charts (tabbed: Orders vs Revenue) ──
function TrendCharts({ data }: { data: TrendPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  }));

  const commonXAxis = (
    <XAxis
      dataKey="label"
      stroke="var(--color-text-secondary, #94a3b8)"
      fontSize={11}
      tickLine={false}
      axisLine={false}
      interval={Math.max(0, Math.floor(formatted.length / 8) - 1)}
    />
  );

  return (
    <Tabs
      size="small"
      items={[
        {
          key: "orders",
          label: "Orders",
          children: (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={formatted}>
                <defs>
                  <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6C5CE7" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6C5CE7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" vertical={false} />
                {commonXAxis}
                <YAxis stroke="var(--color-text-secondary, #94a3b8)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-text-secondary, #94a3b8)" }} />
                <Area type="monotone" dataKey="orders" stroke="#6C5CE7" strokeWidth={2} fill="url(#gradOrders)" name="Orders" dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
                <Area type="monotone" dataKey="delivered" stroke="#10B981" strokeWidth={2} fill="url(#gradDelivered)" name="Delivered" dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
                <Area type="monotone" dataKey="rto" stroke="#EF4444" strokeWidth={2} fill="url(#gradRto)" name="RTO" dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ),
        },
        {
          key: "revenue",
          label: "Revenue",
          children: (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={formatted}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F97316" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" vertical={false} />
                {commonXAxis}
                <YAxis stroke="var(--color-text-secondary, #94a3b8)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatCurrency(Number(value)), "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2} fill="url(#gradRevenue)" name="Revenue" dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ),
        },
      ]}
    />
  );
}

// ── Courier Split Pie ──
function CourierSplitPie({ data }: { data: CourierInsight[] }) {
  const pieData = data.map((c, i) => ({
    name: formatKeyword(c.courier),
    value: c.totalOrders,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
          {pieData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [Number(value).toLocaleString(), "Orders"]} />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--color-text-secondary, #94a3b8)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Revenue vs Cost Bar Chart ──
function RevenueCostChart({ data }: { data: CourierMargin[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
        <XAxis dataKey="courier" stroke="var(--color-text-secondary, #94a3b8)" fontSize={11} tickFormatter={formatKeyword} />
        <YAxis stroke="var(--color-text-secondary, #94a3b8)" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatCurrency(Number(value))]} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-text-secondary, #94a3b8)" }} />
        <Bar dataKey="revenue" fill="#6C5CE7" radius={[4, 4, 0, 0]} name="Revenue" />
        <Bar dataKey="cost" fill="#F97316" radius={[4, 4, 0, 0]} name="Cost" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Payment Split Donut ──
function PaymentSplitDonut({ prepaid, cod }: { prepaid: { orders: number }; cod: { orders: number } }) {
  const total = prepaid.orders + cod.orders;
  if (total === 0) return <div className="flex items-center justify-center h-[200px] text-muted text-sm">No data</div>;

  const pieData = [
    { name: "Prepaid", value: prepaid.orders },
    { name: "COD", value: cod.orders },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
          {pieData.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--color-text-secondary, #94a3b8)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Top States Table ──
function TopStatesTable({ data }: { data: StateData[] }) {
  const columns = [
    {
      title: "State",
      dataIndex: "state",
      key: "state",
      render: (v: string) => <span className="font-medium">{v}</span>,
    },
    { title: "Orders", dataIndex: "orders", key: "orders" },
    {
      title: "Delivery %",
      dataIndex: "deliveryRate",
      key: "deliveryRate",
      render: (v: number) => (
        <span className={v >= 80 ? "text-green-600 font-medium" : v >= 60 ? "text-violet-600" : "text-red-500"}>
          {v}%
        </span>
      ),
    },
    {
      title: "Revenue",
      dataIndex: "revenue",
      key: "revenue",
      render: (v: number) => formatCurrency(v),
    },
  ];

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="state"
      pagination={false}
      size="small"
      scroll={{ x: 400 }}
    />
  );
}

// ── Alerts Panel ──
function AlertsPanel({ alerts }: { alerts: { failureSpikes: FailureSpike[]; delayedShipments: number; ndrPending: number } }) {
  const items: { label: string; value: string; severity: "error" | "warning"; href: string }[] = [];

  if (alerts.ndrPending > 0) {
    items.push({ label: "NDR orders pending action", value: String(alerts.ndrPending), severity: "error", href: "/orders?status=ndr" });
  }
  if (alerts.delayedShipments > 0) {
    items.push({ label: "Shipments delayed > 5 days", value: String(alerts.delayedShipments), severity: "warning", href: "/orders?status=in_transit" });
  }
  alerts.failureSpikes.forEach((s) => {
    items.push({
      label: `${formatKeyword(s.courier)} — ${s.failureRate}% failure rate this week`,
      value: `${s.failed}/${s.total} orders`,
      severity: "error",
      href: `/orders?courier=${s.courier}`,
    });
  });

  if (!items.length) return null;

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <Link
          key={i}
          to={item.href}
          className="flex items-center justify-between p-3 rounded-lg border border-border no-underline hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: item.severity === "error"
              ? "var(--color-danger-bg)"
              : "rgba(245, 158, 11, 0.08)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle
              size={14}
              className={`shrink-0 ${item.severity === "error" ? "text-[var(--color-danger)]" : "text-violet-500"}`}
            />
            <span className="text-sm text-foreground truncate">{item.label}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="text-sm font-medium text-foreground">{item.value}</span>
            <ExternalLink size={12} className="text-muted" />
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Inline Filters ──
const PERIOD_OPTIONS = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
];

// ── Main Dashboard Page ──
export default function DashboardPage() {
  const [periodDays, setPeriodDays] = useState(30);
  const [courier, setCourier] = useState<string | undefined>();
  const [payment, setPayment] = useState<string | undefined>();

  const filters = {
    days: periodDays,
    serviceProvider: courier,
    paymentType: payment,
  };

  const { data, isLoading } = useAdminDashboard(filters);
  const periodLabel = `${periodDays}d`;

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="h-6 w-28 bg-[var(--color-border)] rounded-md animate-pulse" />
            <div className="h-4 w-36 bg-[var(--color-border)] rounded-md animate-pulse mt-1.5" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-[var(--color-border)] rounded-lg animate-pulse" />
            <div className="h-8 w-28 bg-[var(--color-border)] rounded-lg animate-pulse" />
            <div className="h-8 w-24 bg-[var(--color-border)] rounded-lg animate-pulse" />
          </div>
        </div>

        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="!border-border" styles={{ body: { padding: "12px 16px" } }}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 space-y-2">
                  <div className="h-3 w-20 bg-[var(--color-border)] rounded animate-pulse" />
                  <div className="h-5 w-24 bg-[var(--color-border)] rounded animate-pulse" />
                  <div className="h-3 w-16 bg-[var(--color-border)] rounded animate-pulse" />
                </div>
                <div className="w-10 h-10 rounded-lg bg-[var(--color-border)] animate-pulse shrink-0" />
              </div>
            </Card>
          ))}
        </div>

        {/* Trends + Courier skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2 !border-border" title={<div className="h-4 w-24 bg-[var(--color-border)] rounded animate-pulse" />}>
            <div className="h-[320px] bg-[var(--color-border)] rounded-lg animate-pulse opacity-30" />
          </Card>
          <Card className="!border-border" title={<div className="h-4 w-36 bg-[var(--color-border)] rounded animate-pulse" />}>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-10 bg-[var(--color-border)] rounded animate-pulse opacity-30" />
              ))}
            </div>
          </Card>
        </div>

        {/* Revenue skeleton */}
        <Card className="!border-border" title={<div className="h-4 w-32 bg-[var(--color-border)] rounded animate-pulse" />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-[var(--color-border)] animate-pulse opacity-20 h-16" />
            ))}
          </div>
          <div className="h-[200px] bg-[var(--color-border)] rounded-lg animate-pulse opacity-30" />
        </Card>

        {/* Bottom row skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="!border-border" title={<div className="h-4 w-28 bg-[var(--color-border)] rounded animate-pulse" />}>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-12 bg-[var(--color-border)] rounded animate-pulse opacity-30" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { overview, courierInsights, trends, revenue, sellers, alerts, pendingActions, paymentSplit, topStates, statusDistribution } = data;

  const ordersTrend = trendDelta(overview.totalOrders, overview.previousOrders);
  const revenueTrend = trendDelta(overview.revenue, overview.previousRevenue);
  const deliveryTrend = trendDelta(overview.deliveryRate, overview.previousDeliveryRate);

  const statusChartData = (statusDistribution ?? [])
    .filter((s: StatusBucket) => s.count > 0)
    .map((s: StatusBucket) => ({
      name: formatKeyword(s.status),
      status: s.status,
      count: s.count,
      fill: STATUS_COLORS_MAP[s.status] ?? "#94A3B8",
    }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Title level={3} className="!text-foreground !mb-0.5 !text-lg sm:!text-xl">Dashboard</Title>
          <Text className="text-muted text-xs sm:text-sm">Platform overview</Text>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={String(periodDays)}
            onChange={(v) => setPeriodDays(Number(v))}
            options={PERIOD_OPTIONS}
            size="small"
            style={{ minWidth: 100 }}
          />
          <Select
            placeholder="All couriers"
            allowClear
            value={courier}
            onChange={(v) => setCourier(v || undefined)}
            size="small"
            style={{ minWidth: 120 }}
            options={
              data?.courierInsights.map((c) => ({
                label: formatKeyword(c.courier),
                value: c.courier,
              })) ?? []
            }
          />
          <Select
            placeholder="Payment"
            allowClear
            value={payment}
            onChange={(v) => setPayment(v || undefined)}
            size="small"
            style={{ minWidth: 100 }}
            options={[
              { label: "Prepaid", value: "prepaid" },
              { label: "COD", value: "cod" },
            ]}
          />
        </div>
      </div>

      {/* ── 1. Platform KPIs ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label={`Orders (${periodLabel})`}
          value={overview.totalOrders.toLocaleString()}
          subtitle={`${overview.ordersToday} today`}
          trend={ordersTrend}
          icon={PackageOpen}
          color="#6C5CE7"
        />
        <StatCard
          label="Active Sellers"
          value={overview.activeSellers.toLocaleString()}
          icon={Users}
          color="#3B82F6"
        />
        <StatCard
          label={`Revenue (${periodLabel})`}
          value={formatCurrency(overview.revenue)}
          trend={revenueTrend}
          icon={IndianRupee}
          color="#10B981"
        />
        <StatCard
          label="Delivery Rate"
          value={`${overview.deliveryRate}%`}
          subtitle={overview.avgDeliveryDays != null ? `Avg ${overview.avgDeliveryDays}d` : undefined}
          trend={deliveryTrend}
          icon={Truck}
          color="#F97316"
        />
      </div>

      {/* ── 2. Order Status Distribution + Alerts & Actions ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card
          className="xl:col-span-2 !border-border"
          title={
            <div className="flex items-center gap-2">
              <PackageOpen size={16} className="text-primary" />
              <span>Orders by Status ({periodLabel})</span>
              <Tag>{statusChartData.reduce((s, d) => s + d.count, 0).toLocaleString()}</Tag>
            </div>
          }
        >
          {statusChartData.length > 0 ? (
            <div className="space-y-1.5">
              {statusChartData.map((item) => {
                const maxCount = statusChartData[0]?.count ?? 1;
                const pct = Math.round((item.count / maxCount) * 100);
                return (
                  <Link
                    key={item.status}
                    to={item.status === "ndr" ? "/orders?status=ndr" : item.status.startsWith("rto") ? "/orders?status=rto_initiated&status=rto_in_transit&status=rto_delivered" : `/orders?status=${item.status}`}
                    className="flex items-center gap-2.5 group no-underline"
                  >
                    <span className="text-[11px] text-muted w-[100px] text-right truncate shrink-0 group-hover:text-foreground transition-colors">
                      {item.name}
                    </span>
                    <div className="flex-1 h-5 bg-border-light/40 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all group-hover:opacity-80"
                        style={{ width: `${pct}%`, backgroundColor: item.fill, minWidth: 4 }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-foreground w-8 text-right shrink-0">{item.count}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 text-muted text-sm">No data</div>
          )}
        </Card>

        <Card
          className="!border-border"
          title={
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-[var(--color-danger)]" />
              <span>Alerts & Actions</span>
              {(alerts.totalAlerts > 0 || pendingActions.kycPending + pendingActions.bankApprovalsPending + pendingActions.codRemittancesPending > 0) && (
                <Tag color="red">
                  {alerts.totalAlerts + (pendingActions.kycPending > 0 ? 1 : 0) + (pendingActions.bankApprovalsPending > 0 ? 1 : 0) + (pendingActions.codRemittancesPending > 0 ? 1 : 0)}
                </Tag>
              )}
            </div>
          }
        >
          <div className="space-y-2">
            {/* Alerts */}
            {alerts.totalAlerts > 0 && <AlertsPanel alerts={alerts} />}

            {/* Pending actions inline */}
            {pendingActions.kycPending > 0 && (
              <Link
                to="/users-management?tab=pending_kyc"
                className="flex items-center justify-between p-3 rounded-lg border border-border no-underline hover:opacity-80 transition-opacity"
                style={{ backgroundColor: "rgba(59, 130, 246, 0.08)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileCheck size={14} className="shrink-0 text-[#3B82F6]" />
                  <span className="text-sm text-foreground truncate">KYC verifications pending</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Tag color="purple">{pendingActions.kycPending}</Tag>
                  <ExternalLink size={12} className="text-muted" />
                </div>
              </Link>
            )}
            {pendingActions.bankApprovalsPending > 0 && (
              <Link
                to="/users-management"
                className="flex items-center justify-between p-3 rounded-lg border border-border no-underline hover:opacity-80 transition-opacity"
                style={{ backgroundColor: "rgba(245, 158, 11, 0.08)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Landmark size={14} className="shrink-0 text-[#F59E0B]" />
                  <span className="text-sm text-foreground truncate">Bank approvals pending</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Tag color="purple">{pendingActions.bankApprovalsPending}</Tag>
                  <ExternalLink size={12} className="text-muted" />
                </div>
              </Link>
            )}
            {pendingActions.codRemittancesPending > 0 && (
              <Link
                to="/cod-remittance"
                className="flex items-center justify-between p-3 rounded-lg border border-border no-underline hover:opacity-80 transition-opacity"
                style={{ backgroundColor: "var(--color-success-bg)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Wallet size={14} className="shrink-0 text-[var(--color-success)]" />
                  <span className="text-sm text-foreground truncate">COD remittances pending</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Tag color="purple">{pendingActions.codRemittancesPending}</Tag>
                  <ExternalLink size={12} className="text-muted" />
                </div>
              </Link>
            )}

            {/* Empty state */}
            {alerts.totalAlerts === 0 && pendingActions.kycPending + pendingActions.bankApprovalsPending + pendingActions.codRemittancesPending === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "var(--color-success-bg)" }}>
                  <PackageOpen size={20} className="text-[var(--color-success)]" />
                </div>
                <Text className="text-foreground font-medium">All clear!</Text>
                <Text className="text-muted text-xs mt-1">No alerts or pending actions.</Text>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── 3. Order & Revenue Trend + Courier Performance ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 !border-border" title={`Trends (${periodLabel})`}>
          {trends.length > 0 ? (
            <TrendCharts data={trends} />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted text-sm">No data</div>
          )}
        </Card>
        <Card className="!border-border" title={`Courier Performance (${periodLabel})`}>
          {courierInsights.length > 0 ? (
            <CourierInsightsTable data={courierInsights} />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted text-sm">No data</div>
          )}
        </Card>
      </div>

      {/* ── 4. Revenue & Margins ── */}
      <Card className="!border-border" title="Revenue & Margins">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-[var(--color-primary-bg)]">
            <Text className="text-muted text-xs">Total Revenue</Text>
            <div className="text-base sm:text-lg font-semibold text-foreground mt-0.5">{formatCurrency(revenue.totalRevenue)}</div>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-accent-bg)]">
            <Text className="text-muted text-xs">Total Cost</Text>
            <div className="text-base sm:text-lg font-semibold text-foreground mt-0.5">{formatCurrency(revenue.totalCost)}</div>
          </div>
          <div className="p-3 rounded-lg col-span-2 sm:col-span-1" style={{ backgroundColor: revenue.totalMargin >= 0 ? "var(--color-success-bg)" : "var(--color-danger-bg)" }}>
            <Text className="text-muted text-xs">Total Margin</Text>
            <div className={`text-base sm:text-lg font-semibold mt-0.5 ${revenue.totalMargin >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
              {formatCurrency(revenue.totalMargin)}
            </div>
          </div>
        </div>

        <Tabs
          items={[
            {
              key: "table",
              label: "Breakdown",
              children: <MarginsTable data={revenue.margins} />,
            },
            {
              key: "chart",
              label: "Chart",
              children: revenue.margins.length > 0 ? (
                <RevenueCostChart data={revenue.margins} />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted text-sm">No data</div>
              ),
            },
          ]}
        />
      </Card>

      {/* ── 5. Order Distribution + Payment Split ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="!border-border" title="Order Distribution by Courier">
          {courierInsights.length > 0 ? (
            <CourierSplitPie data={courierInsights} />
          ) : (
            <div className="flex items-center justify-center h-[260px] text-muted text-sm">No data</div>
          )}
        </Card>
        <Card className="!border-border" title={`Payment Type Split (${periodLabel})`}>
          <PaymentSplitDonut prepaid={paymentSplit.prepaid} cod={paymentSplit.cod} />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-[var(--color-primary-bg)] text-center">
              <Text className="text-muted text-xs">Prepaid Revenue</Text>
              <div className="text-base font-semibold text-foreground mt-1">{formatCurrency(paymentSplit.prepaid.revenue)}</div>
              <Text className="text-muted text-[11px]">{paymentSplit.prepaid.orders} orders</Text>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-accent-bg)] text-center">
              <Text className="text-muted text-xs">COD Revenue</Text>
              <div className="text-base font-semibold text-foreground mt-1">{formatCurrency(paymentSplit.cod.revenue)}</div>
              <Text className="text-muted text-[11px]">{paymentSplit.cod.orders} orders</Text>
            </div>
          </div>
        </Card>
      </div>

      {/* ── 6. Seller Insights ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card
          className="!border-border"
          title={
            <div className="flex items-center gap-2">
              <Award size={16} className="text-primary" />
              <span>Top Sellers</span>
            </div>
          }
        >
          {sellers.topSellers.length > 0 ? (
            <SellerTable data={sellers.topSellers} showRevenue />
          ) : (
            <div className="flex items-center justify-center py-8 text-muted text-sm">No seller data</div>
          )}
        </Card>
        <Card
          className="!border-border"
          title={
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-[var(--color-danger)]" />
              <span>High RTO Sellers</span>
            </div>
          }
        >
          {sellers.highRtoSellers.length > 0 ? (
            <SellerTable data={sellers.highRtoSellers} />
          ) : (
            <div className="flex items-center justify-center py-8 text-muted text-sm">No high RTO sellers</div>
          )}
        </Card>
      </div>

      {/* ── 7. Top States ── */}
      <Card className="!border-border" title={`Top States (${periodLabel})`}>
        {topStates.length > 0 ? (
          <TopStatesTable data={topStates} />
        ) : (
          <div className="flex items-center justify-center py-8 text-muted text-sm">No data</div>
        )}
      </Card>
    </div>
  );
}
