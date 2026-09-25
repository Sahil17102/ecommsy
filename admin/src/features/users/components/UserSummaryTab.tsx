import { Spin, Tag, Progress } from "antd";
import {
  Package,
  IndianRupee,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Ban,
  TrendingUp,
  Settings2,
  BookCheck,
  PackageCheck,
  Truck,
  Navigation,
  PackageOpen,
} from "lucide-react";
import { useUserSummary } from "../queries";
import { formatCurrency, formatKeyword } from "@/lib/utils";
import { STATUS_CONFIG } from "@/features/orders/config";
import { SERVICE_PROVIDER_VARIANTS } from "@/lib/constants";
import type { OrderStatus } from "@/features/orders/types";

interface UserSummaryTabProps {
  userId: string;
}

/** Pipeline status visual config */
const PIPELINE_STEPS: {
  status: OrderStatus;
  icon: React.ReactNode;
  activeText: string;
  activeBg: string;
  activeBorder: string;
  dot: string;
}[] = [
  {
    status: "processing",
    icon: <Settings2 size={13} />,
    activeText: "text-violet-700 dark:text-violet-300",
    activeBg: "bg-violet-50 dark:bg-violet-500/10",
    activeBorder: "border-violet-200 dark:border-violet-500/20",
    dot: "bg-violet-500",
  },
  {
    status: "booked",
    icon: <BookCheck size={13} />,
    activeText: "text-cyan-700 dark:text-cyan-300",
    activeBg: "bg-cyan-50 dark:bg-cyan-500/10",
    activeBorder: "border-cyan-200 dark:border-cyan-500/20",
    dot: "bg-cyan-500",
  },
  {
    status: "pickup_initiated",
    icon: <PackageCheck size={13} />,
    activeText: "text-blue-700 dark:text-blue-300",
    activeBg: "bg-blue-50 dark:bg-blue-500/10",
    activeBorder: "border-blue-200 dark:border-blue-500/20",
    dot: "bg-blue-500",
  },
  {
    status: "shipped",
    icon: <PackageOpen size={13} />,
    activeText: "text-indigo-700 dark:text-indigo-300",
    activeBg: "bg-indigo-50 dark:bg-indigo-500/10",
    activeBorder: "border-indigo-200 dark:border-indigo-500/20",
    dot: "bg-indigo-500",
  },
  {
    status: "in_transit",
    icon: <Truck size={13} />,
    activeText: "text-violet-700 dark:text-violet-300",
    activeBg: "bg-violet-50 dark:bg-violet-500/10",
    activeBorder: "border-violet-200 dark:border-violet-500/20",
    dot: "bg-violet-500",
  },
  {
    status: "out_for_delivery",
    icon: <Navigation size={13} />,
    activeText: "text-green-700 dark:text-green-300",
    activeBg: "bg-green-50 dark:bg-green-500/10",
    activeBorder: "border-green-200 dark:border-green-500/20",
    dot: "bg-green-500",
  },
];

/** Terminal / exception groups shown as summary rows */
const OUTCOME_GROUPS = [
  { label: "Delivered", color: "text-green-600 dark:text-green-400", statuses: ["delivered"] as OrderStatus[] },
  { label: "NDR", color: "text-purple-600 dark:text-purple-400", statuses: ["ndr"] as OrderStatus[] },
  { label: "RTO", color: "text-red-600 dark:text-red-400", statuses: ["rto_initiated", "rto_in_transit", "rto_delivered"] as OrderStatus[] },
  { label: "Cancelled / Lost", color: "text-muted", statuses: ["cancelled", "lost"] as OrderStatus[] },
];

const OUTCOME_ICONS: Record<string, React.ReactNode> = {
  Delivered: <CheckCircle size={14} />,
  NDR: <AlertTriangle size={14} />,
  RTO: <RotateCcw size={14} />,
  "Cancelled / Lost": <Ban size={14} />,
};

export function UserSummaryTab({ userId }: UserSummaryTabProps) {
  const { data: summary, isLoading } = useUserSummary(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (!summary) {
    return (
      <p className="text-center text-muted py-10">
        Unable to load summary data.
      </p>
    );
  }

  const deliveryRate =
    summary.orders.total > 0
      ? Math.round((summary.orders.byStatus.delivered / summary.orders.total) * 100)
      : 0;

  const totalActive = PIPELINE_STEPS.reduce(
    (acc, s) => acc + (summary.orders.byStatus[s.status] ?? 0),
    0,
  );
  const pending = summary.orders.byStatus.created ?? 0;

  return (
    <div className="space-y-4 pt-1">
      {/* ── Top-level KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            icon: <Package size={15} />,
            iconColor: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-50 dark:bg-blue-500/10",
            label: "Total Orders",
            value: summary.orders.total.toLocaleString("en-IN"),
            sub: `${summary.orders.byType.B2C} B2C · ${summary.orders.byType.B2B} B2B`,
          },
          {
            icon: <IndianRupee size={15} />,
            iconColor: "text-emerald-600 dark:text-emerald-400",
            bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
            label: "Total Revenue",
            value: formatCurrency(summary.revenue.total),
            sub: `Freight ${formatCurrency(summary.revenue.freight)}`,
          },
          {
            icon: <Wallet size={15} />,
            iconColor: "text-violet-600 dark:text-violet-400",
            bgColor: "bg-violet-50 dark:bg-violet-500/10",
            label: "Wallet Balance",
            value: formatCurrency(summary.wallet.balance),
            sub: `${formatCurrency(summary.wallet.totalCredits)} in · ${formatCurrency(summary.wallet.totalDebits)} out`,
          },
          {
            icon: <TrendingUp size={15} />,
            iconColor: "text-green-600 dark:text-green-400",
            bgColor: "bg-green-50 dark:bg-green-500/10",
            label: "Delivery Rate",
            value: `${deliveryRate}%`,
            sub: `${summary.orders.byStatus.delivered ?? 0} of ${summary.orders.total} delivered`,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border-light bg-background-elevated p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-md ${card.bgColor}`}>
                <span className={card.iconColor}>{card.icon}</span>
              </span>
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
                {card.label}
              </span>
            </div>
            <p className="text-lg font-semibold text-foreground leading-tight">
              {card.value}
            </p>
            <p className="text-[11px] text-muted leading-tight">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Active Orders Pipeline ── */}
      <div className="rounded-xl border border-border-light bg-background-elevated p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-foreground">
            Active Orders Pipeline
          </h3>
          <span className="text-[11px] text-muted font-medium">
            {totalActive + pending} in pipeline
            {pending > 0 && (
              <span className="text-muted"> · {pending} pending</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {PIPELINE_STEPS.map((step, i) => {
            const count = summary.orders.byStatus[step.status] ?? 0;
            const cfg = STATUS_CONFIG[step.status];
            const hasOrders = count > 0;
            return (
              <div key={step.status} className="flex items-center shrink-0">
                {i > 0 && (
                  <ArrowRight
                    size={12}
                    className="text-muted/25 mx-1 shrink-0"
                  />
                )}
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors ${step.activeBg} ${step.activeBorder} ${
                    hasOrders ? "" : "opacity-60"
                  }`}
                >
                  <span className={step.activeText}>{step.icon}</span>
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${step.activeText}`}
                  >
                    {cfg.label}
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${step.activeText}`}
                  >
                    {count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Outcomes + Payment + Remittance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Order outcomes */}
        <div className="rounded-xl border border-border-light bg-background-elevated p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">
            Order Outcomes
          </h3>
          <div className="space-y-3">
            {OUTCOME_GROUPS.map((group) => {
              const count = group.statuses.reduce(
                (acc, s) => acc + (summary.orders.byStatus[s] ?? 0),
                0,
              );
              const pct =
                summary.orders.total > 0
                  ? (count / summary.orders.total) * 100
                  : 0;
              return (
                <div key={group.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`flex items-center gap-1.5 text-xs font-medium ${group.color}`}
                    >
                      {OUTCOME_ICONS[group.label]}
                      {group.label}
                    </span>
                    <span className="text-xs font-semibold text-foreground tabular-nums">
                      {count}
                      <span className="text-[10px] text-muted font-normal ml-1">
                        ({Math.round(pct)}%)
                      </span>
                    </span>
                  </div>
                  <Progress
                    percent={pct}
                    showInfo={false}
                    strokeColor="currentColor"
                    className={group.color}
                    size="small"
                  />
                  {group.statuses.length > 1 && count > 0 && (
                    <div className="flex gap-1.5 mt-1.5">
                      {group.statuses.map((s) => {
                        const c = summary.orders.byStatus[s] ?? 0;
                        if (c === 0) return null;
                        const cfg = STATUS_CONFIG[s];
                        return (
                          <Tag
                            key={s}
                            color={cfg?.color ?? "default"}
                            bordered={false}
                            className="!text-[10px] !m-0"
                          >
                            {cfg?.label ?? formatKeyword(s)}: {c}
                          </Tag>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="rounded-xl border border-border-light bg-background-elevated p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">
            Payment Breakdown
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-500/5 border border-green-200/60 dark:border-green-500/10 px-3 py-2.5">
              <span className="text-xs text-muted font-medium">Prepaid</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {summary.orders.byPayment.prepaid.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-violet-50 dark:bg-violet-500/5 border border-violet-200/60 dark:border-violet-500/10 px-3 py-2.5">
              <span className="text-xs text-muted font-medium">COD</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {summary.orders.byPayment.cod.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="border-t border-border-light/60 pt-2.5">
              <span className="text-[11px] text-muted font-medium">Order Type</span>
              <div className="flex gap-2 mt-1.5">
                <Tag color="purple" bordered={false} className="!text-xs !m-0">
                  B2C: {summary.orders.byType.B2C}
                </Tag>
                <Tag color="blue" bordered={false} className="!text-xs !m-0">
                  B2B: {summary.orders.byType.B2B}
                </Tag>
              </div>
            </div>
          </div>
        </div>

        {/* COD Remittance */}
        <div className="rounded-xl border border-border-light bg-background-elevated p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">
            COD Remittance
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-medium">Total Collected</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(summary.remittance.totalCodCollected)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                <ArrowUpRight size={12} className="text-green-600 dark:text-green-400" />
                Remitted
              </span>
              <span className="text-sm font-semibold text-green-700 dark:text-green-400 tabular-nums">
                {formatCurrency(summary.remittance.totalRemitted)}
                <span className="text-[10px] text-muted font-normal ml-1">
                  ({summary.remittance.creditedCount})
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                <Clock size={12} className="text-violet-600 dark:text-violet-400" />
                Pending
              </span>
              <span className="text-sm font-semibold text-violet-700 dark:text-violet-400 tabular-nums">
                {formatCurrency(summary.remittance.pendingRemittance)}
                <span className="text-[10px] text-muted font-normal ml-1">
                  ({summary.remittance.pendingCount})
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Wallet & Top Providers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Wallet summary */}
        <div className="rounded-xl border border-border-light bg-background-elevated p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">
            Wallet Activity
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-medium">Current Balance</span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  summary.wallet.balance >= 0
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400"
                }`}
              >
                {formatCurrency(summary.wallet.balance)}
              </span>
            </div>
            <div className="border-t border-border-light/60 pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                  <ArrowDownRight size={12} className="text-green-600 dark:text-green-400" />
                  Total Credits
                </span>
                <span className="text-sm font-semibold text-green-700 dark:text-green-400 tabular-nums">
                  {formatCurrency(summary.wallet.totalCredits)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                  <ArrowUpRight size={12} className="text-red-600 dark:text-red-400" />
                  Total Debits
                </span>
                <span className="text-sm font-semibold text-red-700 dark:text-red-400 tabular-nums">
                  {formatCurrency(summary.wallet.totalDebits)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top providers */}
        <div className="rounded-xl border border-border-light bg-background-elevated p-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-3">
            Top Courier Partners
          </h3>
          {summary.topProviders.length === 0 ? (
            <p className="text-xs text-muted">No shipments yet</p>
          ) : (
            <div className="space-y-2">
              {summary.topProviders.map((p, i) => {
                const variant = SERVICE_PROVIDER_VARIANTS[p.provider];
                const pct =
                  summary.orders.total > 0
                    ? Math.round((p.count / summary.orders.total) * 100)
                    : 0;
                return (
                  <div key={p.provider} className="flex items-center gap-2.5">
                    <span className="text-[11px] text-muted w-4 text-right tabular-nums">
                      {i + 1}.
                    </span>
                    <Tag
                      color={variant?.color ?? "default"}
                      bordered={false}
                      className="!text-[11px] !m-0 w-[88px] text-center"
                    >
                      {variant?.label ?? formatKeyword(p.provider)}
                    </Tag>
                    <div className="flex-1">
                      <Progress
                        percent={pct}
                        showInfo={false}
                        size="small"
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-10 text-right tabular-nums">
                      {p.count.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] text-muted w-20 text-right tabular-nums">
                      {formatCurrency(p.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
