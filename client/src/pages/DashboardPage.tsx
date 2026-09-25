import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldAlert,
  Package,
  PackageCheck,
  CalendarDays,
} from "lucide-react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
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
import { KycBanner } from "@/components/dashboard/KycBanner";
import { useDashboard } from "@/queries/useDashboard";
import { formatCurrency, formatKeyword } from "@/lib/utils";
import type {
  CourierScore,
  ZonePerf,
  TrendPoint,
  ShipmentPipeline,
  CityData,
  PaymentBucket,
  DashboardFilters,
} from "@/lib/dashboardApi";

// ── Shared ──
const tooltipStyle = {
  backgroundColor: "var(--color-bg-elevated, #fff)",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: 8,
  color: "var(--color-text, #0f172a)",
  fontSize: 12,
};

const PIE_COLORS = ["#6C5CE7", "#F97316"];

function trendDelta(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) return { value: current > 0 ? "New" : "—", positive: current > 0 };
  const delta = ((current - previous) / previous) * 100;
  return { value: `${delta > 0 ? "+" : ""}${Math.round(delta * 10) / 10}%`, positive: delta >= 0 };
}

// ── KPI Card — compact with subtle left-accent ──
function KpiCard({
  label,
  value,
  trend,
  invertTrend = false,
  icon,
  accentColor,
  index = 0,
}: {
  label: string;
  value: string;
  trend: { value: string; positive: boolean };
  invertTrend?: boolean;
  icon: React.ReactNode;
  accentColor: string;
  index?: number;
}) {
  const isGood = invertTrend ? !trend.positive : trend.positive;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="relative bg-background-elevated rounded-lg border border-border-light overflow-hidden hover:shadow-sm transition-shadow"
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg opacity-60" style={{ backgroundColor: accentColor }} />
      <div className="pl-3 pr-3 py-2.5 sm:pl-4 sm:pr-4 sm:py-3">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] sm:text-xs font-normal text-muted">{label}</span>
          <span className="text-muted opacity-50">{icon}</span>
        </div>
        <div className="flex items-end gap-1.5">
          <p className="text-base sm:text-lg font-semibold text-foreground leading-none">{value}</p>
          {trend.value !== "—" && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium mb-px ${isGood ? "text-emerald-600" : "text-red-500"}`}>
              {isGood ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {trend.value}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Section Card ──
function SectionCard({ title, children, headerRight, className = "" }: {
  title: string; children: React.ReactNode; headerRight?: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-background-elevated rounded-xl border border-border-light p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

// ── Pipeline — compact vertical list ──
function PipelineFlow({ pipeline }: { pipeline: ShipmentPipeline }) {
  const stages = [
    { key: "created", label: "New", count: pipeline.created, color: "#6B7280" },
    { key: "processing", label: "Processing", count: pipeline.processing, color: "#3B82F6" },
    { key: "inTransit", label: "In Transit", count: pipeline.inTransit, color: "#0EA5E9" },
    { key: "outForDelivery", label: "Out for Delivery", count: pipeline.outForDelivery, color: "#F59E0B" },
    { key: "ndr", label: "NDR", count: pipeline.ndr, color: "#EF4444" },
    { key: "rto", label: "RTO", count: pipeline.rto, color: "#F97316" },
  ];

  const total = stages.reduce((s, st) => s + st.count, 0);
  if (total === 0) return <p className="text-sm text-muted text-center py-6">No active shipments.</p>;

  return (
    <div className="space-y-2">
      {stages.map((stage) => {
        const pct = total ? (stage.count / total) * 100 : 0;
        return (
          <div key={stage.key} className="flex items-center gap-3">
            <span className="text-[11px] text-muted w-[80px] truncate">{stage.label}</span>
            <div className="flex-1 h-2 rounded-full bg-border-light overflow-hidden">
              {stage.count > 0 && (
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: stage.color }} />
              )}
            </div>
            <span className="text-xs font-semibold text-foreground w-6 text-right">{stage.count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Trends ──
function TrendsChart({ data }: { data: TrendPoint[] }) {
  if (!data.length) return <p className="text-sm text-muted text-center py-8">No trend data yet.</p>;
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light, #e5e7eb)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--color-muted, #94a3b8)" fontSize={11} tickLine={false} />
        <YAxis stroke="var(--color-muted, #94a3b8)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="orders" fill="#6C5CE7" radius={[3, 3, 0, 0]} name="Orders" />
        <Bar dataKey="delivered" fill="#10B981" radius={[3, 3, 0, 0]} name="Delivered" />
        <Bar dataKey="rto" fill="#EF4444" radius={[3, 3, 0, 0]} name="RTO" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Courier Scorecard ──
function CourierScorecardTable({ data }: { data: CourierScore[] }) {
  if (!data.length) return <p className="text-sm text-muted text-center py-6">No courier data yet.</p>;
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light">
            {["Courier", "Orders", "Success", "RTO", "Avg Days", "Avg Cost"].map((h, i) => (
              <th key={h} className={`text-xs font-medium text-muted pb-2.5 ${i === 0 ? "text-left pr-3" : i === 4 ? "text-right px-2 hidden sm:table-cell" : i === 5 ? "text-right pl-2" : "text-right px-2"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.courier} className="border-b border-border-light/50 last:border-0">
              <td className="py-2.5 pr-3 font-medium text-foreground">{formatKeyword(c.courier)}</td>
              <td className="py-2.5 px-2 text-right text-foreground">{c.totalOrders}</td>
              <td className="py-2.5 px-2 text-right"><span className={c.successRate >= 80 ? "text-emerald-600 font-medium" : c.successRate >= 60 ? "text-violet-600" : "text-red-500 font-medium"}>{c.successRate}%</span></td>
              <td className="py-2.5 px-2 text-right"><span className={c.rtoRate > 10 ? "text-red-500 font-medium" : "text-foreground"}>{c.rtoRate}%</span></td>
              <td className="py-2.5 px-2 text-right text-foreground hidden sm:table-cell">{c.avgDeliveryDays != null ? `${c.avgDeliveryDays}d` : "—"}</td>
              <td className="py-2.5 pl-2 text-right text-foreground">{formatCurrency(c.avgCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Zone Performance (with readable names) ──
function ZonePerformanceTable({ data }: { data: ZonePerf[] }) {
  if (!data.length) return <p className="text-sm text-muted text-center py-6">No zone data yet.</p>;
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light">
            {["Zone", "Orders", "Success", "RTO", "Avg Days", "Avg Cost"].map((h, i) => (
              <th key={h} className={`text-xs font-medium text-muted pb-2.5 ${i === 0 ? "text-left pr-3" : i === 4 ? "text-right px-2 hidden sm:table-cell" : i === 5 ? "text-right pl-2" : "text-right px-2"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((z) => (
            <tr key={z.zone} className="border-b border-border-light/50 last:border-0">
              <td className="py-2.5 pr-3">
                <span className="font-medium text-foreground">{z.zoneName}</span>
                {z.zoneName !== z.zone && (
                  <span className="text-[10px] text-muted ml-1.5">({z.zone})</span>
                )}
              </td>
              <td className="py-2.5 px-2 text-right text-foreground">{z.totalOrders}</td>
              <td className="py-2.5 px-2 text-right"><span className={z.successRate >= 80 ? "text-emerald-600 font-medium" : z.successRate >= 60 ? "text-violet-600" : "text-red-500 font-medium"}>{z.successRate}%</span></td>
              <td className="py-2.5 px-2 text-right"><span className={z.rtoRate > 10 ? "text-red-500 font-medium" : "text-foreground"}>{z.rtoRate}%</span></td>
              <td className="py-2.5 px-2 text-right text-foreground hidden sm:table-cell">{z.avgDeliveryDays != null ? `${z.avgDeliveryDays}d` : "—"}</td>
              <td className="py-2.5 pl-2 text-right text-foreground">{formatCurrency(z.avgCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Payment Donut ──
function PaymentDonut({ prepaid, cod }: { prepaid: PaymentBucket; cod: PaymentBucket }) {
  const total = prepaid.orders + cod.orders;
  if (total === 0) return <p className="text-sm text-muted text-center py-6">No orders yet.</p>;
  const pieData = [
    { name: "Prepaid", value: prepaid.orders },
    { name: "COD", value: cod.orders },
  ];
  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={130} height={130}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
            {pieData.map((entry, idx) => <Cell key={entry.name} fill={PIE_COLORS[idx]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-3 flex-1">
        {[
          { name: "Prepaid", data: prepaid, color: PIE_COLORS[0] },
          { name: "COD", data: cod, color: PIE_COLORS[1] },
        ].map((item) => (
          <div key={item.name}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-foreground font-medium">{item.name}</span>
            </div>
            <p className="text-xs text-muted pl-[18px]">{item.data.orders} orders ({total ? Math.round((item.data.orders / total) * 100) : 0}%)</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top Cities ──
function TopCitiesChart({ data }: { data: CityData[] }) {
  if (!data.length) return <p className="text-sm text-muted text-center py-6">No data yet.</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light, #e5e7eb)" horizontal={false} />
        <XAxis type="number" stroke="var(--color-muted, #94a3b8)" fontSize={11} />
        <YAxis dataKey="city" type="category" stroke="var(--color-muted, #94a3b8)" fontSize={11} width={90}
          tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "..." : v} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [Number(value), name === "orders" ? "Orders" : String(name)]} />
        <Bar dataKey="orders" fill="#6C5CE7" radius={[0, 4, 4, 0]} name="orders" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Period presets ──
const PRESETS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
] as const;

// ── Main Dashboard ──
export function DashboardPage() {
  const [periodDays, setPeriodDays] = useState(30);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [orderType, setOrderType] = useState<"" | "B2B" | "B2C">("");
  const [isCustom, setIsCustom] = useState(false);

  const filters: DashboardFilters = isCustom && customFrom
    ? { from: customFrom, to: customTo || undefined, orderType: orderType || undefined }
    : { days: periodDays, orderType: orderType || undefined };

  const { data: dashboard, isLoading, error } = useDashboard(filters);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="h-6 w-28 bg-surface-muted rounded-md animate-pulse" />
              <div className="h-4 w-44 bg-surface-muted rounded-md animate-pulse mt-1.5" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 bg-surface-muted rounded-lg animate-pulse" />
              <div className="h-8 w-36 bg-surface-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative bg-background-elevated rounded-lg border border-border-light overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg bg-surface-muted" />
              <div className="pl-3 pr-3 py-2.5 sm:pl-4 sm:pr-4 sm:py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-3 w-20 bg-surface-muted rounded animate-pulse" />
                  <div className="h-4 w-4 bg-surface-muted rounded animate-pulse" />
                </div>
                <div className="h-5 w-16 bg-surface-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Pipeline + Trends skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-background-elevated rounded-xl border border-border-light p-5">
            <div className="h-4 w-32 bg-surface-muted rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3 w-[80px] bg-surface-muted rounded animate-pulse" />
                  <div className="flex-1 h-2 bg-surface-muted rounded-full animate-pulse" />
                  <div className="h-3 w-6 bg-surface-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-background-elevated rounded-xl border border-border-light p-5 xl:col-span-2">
            <div className="h-4 w-28 bg-surface-muted rounded animate-pulse mb-4" />
            <div className="h-[280px] bg-surface-muted/50 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Courier + Zone skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-background-elevated rounded-xl border border-border-light p-5">
              <div className="h-4 w-36 bg-surface-muted rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-8 bg-surface-muted/50 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-error-bg border border-error/20 rounded-xl p-6 text-center">
          <p className="text-sm text-error">Failed to load dashboard. Please try refreshing.</p>
        </div>
      </div>
    );
  }

  const { kpis, pipeline, trends, courierScorecard, zonePerformance, paymentSplit, codPending, topCities } = dashboard;

  const deliveryTrend = trendDelta(kpis.deliveryRate.current, kpis.deliveryRate.previous);
  const ordersTrend = trendDelta(kpis.totalOrders.current, kpis.totalOrders.previous);
  const rtoTrend = trendDelta(kpis.rtoRate.current, kpis.rtoRate.previous);
  const deliveryDaysTrend = kpis.avgDeliveryDays.current != null && kpis.avgDeliveryDays.previous != null
    ? trendDelta(kpis.avgDeliveryDays.current, kpis.avgDeliveryDays.previous)
    : { value: "—", positive: true };

  const hasData = kpis.totalOrders.current > 0 || kpis.totalOrders.previous > 0;
  const periodLabel = isCustom ? "custom range" : `${periodDays}d`;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <KycBanner />

      {/* ── Header + Filters ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Analytics</h2>
            <p className="text-sm text-muted mt-0.5">Shipping performance &middot; {periodLabel}</p>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Order type */}
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as "" | "B2B" | "B2C")}
              className="px-2.5 py-1.5 rounded-lg border border-border-light bg-background text-xs text-foreground outline-none focus:border-primary/40"
            >
              <option value="">All Orders</option>
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>

            {/* Period presets */}
            <div className="flex items-center bg-background border border-border-light rounded-lg p-0.5">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setPeriodDays(p.value); setIsCustom(false); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    !isCustom && periodDays === p.value
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setIsCustom(true)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  isCustom ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                }`}
                title="Custom date range"
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Custom date inputs */}
        {isCustom && (
          <div className="flex items-center gap-2 flex-wrap">
            <DatePicker
              value={customFrom ? dayjs(customFrom) : null}
              onChange={(d) => setCustomFrom(d ? d.format("YYYY-MM-DD") : "")}
              placeholder="Start date"
              format="DD MMM YYYY"
              allowClear
              size="small"
            />
            <span className="text-xs text-muted">to</span>
            <DatePicker
              value={customTo ? dayjs(customTo) : null}
              onChange={(d) => setCustomTo(d ? d.format("YYYY-MM-DD") : "")}
              placeholder="End date"
              format="DD MMM YYYY"
              allowClear
              size="small"
            />
          </div>
        )}
      </motion.div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <KpiCard label="Delivery Rate" value={`${kpis.deliveryRate.current}%`} trend={deliveryTrend}
          icon={<PackageCheck className="w-4 h-4" />} accentColor="#10B981" index={0} />
        <KpiCard label="Avg Delivery Time" value={kpis.avgDeliveryDays.current != null ? `${kpis.avgDeliveryDays.current}d` : "—"}
          trend={deliveryDaysTrend} invertTrend icon={<Clock className="w-4 h-4" />} accentColor="#3B82F6" index={1} />
        <KpiCard label="RTO Rate" value={`${kpis.rtoRate.current}%`} trend={rtoTrend} invertTrend
          icon={<ShieldAlert className="w-4 h-4" />} accentColor="#EF4444" index={2} />
        <KpiCard label={`Orders (${periodLabel})`} value={kpis.totalOrders.current.toLocaleString()} trend={ordersTrend}
          icon={<Package className="w-4 h-4" />} accentColor="#6C5CE7" index={3} />
      </div>

      {hasData ? (
        <>
          {/* ── Pipeline + Trends ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <SectionCard title="Shipment Pipeline"
              headerRight={<span className="text-[11px] text-muted">{Object.values(pipeline).reduce((a, b) => a + b, 0)} active</span>}
            >
              <PipelineFlow pipeline={pipeline} />
            </SectionCard>

            <SectionCard title="Order Trends" className="xl:col-span-2"
              headerRight={<span className="text-[11px] text-muted">{periodLabel}</span>}
            >
              <TrendsChart data={trends} />
            </SectionCard>
          </div>

          {/* ── Courier + Zone ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SectionCard title="Courier Scorecard" headerRight={<span className="text-[11px] text-muted">{periodLabel}</span>}>
              <CourierScorecardTable data={courierScorecard} />
            </SectionCard>
            <SectionCard title="Zone Performance" headerRight={<span className="text-[11px] text-muted">{periodLabel}</span>}>
              <ZonePerformanceTable data={zonePerformance} />
            </SectionCard>
          </div>

          {/* ── Payment + Cities ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <SectionCard title="Payment Split">
              <PaymentDonut prepaid={paymentSplit.prepaid} cod={paymentSplit.cod} />
              {codPending.count > 0 && (
                <div className="mt-4 p-3 rounded-lg border border-border-light bg-background">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted">COD Pending</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(codPending.amount)}</p>
                    </div>
                    <Link to="/cod-remittance" className="text-xs font-medium text-primary no-underline hover:underline">
                      {codPending.count} pending &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </SectionCard>
            <SectionCard title="Top Delivery Cities" className="xl:col-span-2">
              <TopCitiesChart data={topCities} />
            </SectionCard>
          </div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-background-elevated rounded-xl border border-border-light p-10 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No shipment data yet</h3>
          <p className="text-sm text-muted max-w-md mx-auto mb-6">
            Create your first order to see delivery analytics, courier performance, zone insights, and more.
          </p>
          <Link to="/orders/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors no-underline">
            Create First Order
          </Link>
        </motion.div>
      )}
    </div>
  );
}
