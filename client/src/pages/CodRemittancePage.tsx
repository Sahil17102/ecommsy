import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Select, DatePicker } from "antd";
import {
  Banknote,
  IndianRupee,
  Clock,
  CheckCircle2,
  Hourglass,
  Download,
  TrendingUp,
} from "lucide-react";
import { ResponsiveTable, CollapsibleFilters } from "@/components/common";
import type { ResponsiveColumnsType } from "@/components/common";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCodRemittanceStats, useCodRemittances } from "@/queries/useCodRemittance";
import { codRemittanceApi } from "@/lib/codRemittanceApi";
import type { CodRemittanceItem } from "@/lib/codRemittanceApi";

const PAGE_SIZE = 10;

type Filters = {
  [key: string]: unknown;
  status: string | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
};

const INITIAL_FILTERS: Filters = {
  status: undefined,
  dateFrom: undefined,
  dateTo: undefined,
};

// ── Stat Card ──

function StatCard({
  icon: Icon,
  iconBg,
  label,
  value,
  subtext,
  index,
}: {
  icon: typeof Banknote;
  iconBg: string;
  label: string;
  value: string;
  subtext?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="flex items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border border-border-light bg-background-elevated"
    >
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={16} className="text-white sm:hidden" />
        <Icon size={20} className="text-white hidden sm:block" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs text-muted leading-tight">{label}</p>
        <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{value}</p>
        {subtext && <p className="text-[10px] sm:text-xs text-muted">{subtext}</p>}
      </div>
    </motion.div>
  );
}

// ── Page ──

export function CodRemittancePage() {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  const { draft, applied, setFilter, apply, clearAll } = useDeferredFilters<Filters>(
    INITIAL_FILTERS,
    () => setPage(1),
  );

  const { data: stats } = useCodRemittanceStats();
  const { data, isLoading } = useCodRemittances({
    status: applied.status,
    dateFrom: applied.dateFrom,
    dateTo: applied.dateTo,
    page,
    limit: PAGE_SIZE,
    sortField,
    sortOrder,
  });

  const remittances = data?.remittances ?? [];
  const pagination = data?.pagination;

  const activeCount = useMemo(() => {
    let c = 0;
    if (applied.status) c++;
    if (applied.dateFrom) c++;
    if (applied.dateTo) c++;
    return c;
  }, [applied]);

  const columns: ResponsiveColumnsType<CodRemittanceItem> = [
    {
      title: "Order Number",
      key: "orderNumber",
      width: 150,
      mobileTitle: true,
      render: (_, r) => (
        <Link to={`/orders/${r.orderId}`} className="block group">
          <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{r.orderNumber}</div>
          <div className="text-xs text-muted">AWB: {r.awbNumber}</div>
        </Link>
      ),
    },
    {
      title: "Courier",
      dataIndex: "courierPartner",
      key: "courier",
      width: 120,
      mobileHidden: true,
      render: (v: string) => <span className="text-sm capitalize text-foreground">{v}</span>,
    },
    {
      title: "COD Amount",
      dataIndex: "codAmount",
      key: "codAmount",
      width: 120,
      align: "right",
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (v: number) => <span className="text-sm tabular-nums text-foreground">{formatCurrency(v)}</span>,
    },
    {
      title: "Remittable",
      dataIndex: "remittableAmount",
      key: "remittable",
      width: 120,
      align: "right",
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (v: number) => (
        <span className="text-sm font-bold text-emerald-500 tabular-nums">{formatCurrency(v)}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: string) => (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
            status === "credited"
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-violet-500/10 text-violet-500"
          }`}
        >
          {status === "credited" ? (
            <CheckCircle2 size={12} />
          ) : (
            <Hourglass size={12} />
          )}
          {status === "credited" ? "Credited" : "Processing"}
        </span>
      ),
    },
    {
      title: "Collected",
      dataIndex: "collectedAt",
      key: "collected",
      width: 110,
      mobileHidden: true,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (v: string) => <span className="text-xs text-muted">{formatDate(v)}</span>,
    },
    {
      title: "Credited At",
      dataIndex: "creditedAt",
      key: "credited",
      width: 130,
      mobileHidden: true,
      render: (v: string | undefined) => (
        <span className="text-xs text-muted">{v ? formatDate(v) : "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">COD Remittance</h1>
        <p className="text-sm text-muted mt-0.5">
          Track your Cash-on-Delivery collections and settlements
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            icon={IndianRupee}
            iconBg="bg-purple-500"
            label="Remitted Till Date"
            value={formatCurrency(stats.remittedTillDate)}
            subtext={`${stats.remittedCount} orders`}
            index={0}
          />
          <StatCard
            icon={TrendingUp}
            iconBg="bg-gray-500"
            label="Last Remittance"
            value={formatCurrency(stats.lastRemittanceAmount)}
            index={1}
          />
          <StatCard
            icon={Clock}
            iconBg="bg-pink-500"
            label="Next Remittance (Expected)"
            value={formatCurrency(stats.pendingAmount)}
            subtext={`${stats.pendingCount} orders`}
            index={2}
          />
          <StatCard
            icon={Banknote}
            iconBg="bg-purple-500"
            label="Total Remittance Due"
            value={formatCurrency(stats.pendingAmount)}
            subtext={`${stats.pendingCount} orders`}
            index={3}
          />
        </div>
      )}

      {/* Filters + Export */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <CollapsibleFilters
            activeCount={activeCount}
            onApply={apply}
            onClearAll={clearAll}
            primary={[
              {
                key: "status",
                label: "Status",
                width: "180px",
                render: (
                  <Select
                    allowClear
                    placeholder="All statuses"
                    value={draft.status}
                    onChange={(v) => setFilter("status", v || undefined)}
                    className="w-full"
                    size="middle"
                    options={[
                      { label: "Processing", value: "pending" },
                      { label: "Credited to Wallet", value: "credited" },
                    ]}
                  />
                ),
              },
              {
                key: "dateFrom",
                label: "From Date",
                width: "180px",
                render: (
                  <DatePicker
                    className="w-full"
                    placeholder="From date"
                    onChange={(d) => setFilter("dateFrom", d?.toISOString())}
                    size="middle"
                  />
                ),
              },
              {
                key: "dateTo",
                label: "To Date",
                width: "180px",
                render: (
                  <DatePicker
                    className="w-full"
                    placeholder="To date"
                    onChange={(d) => setFilter("dateTo", d?.toISOString())}
                    size="middle"
                  />
                ),
              },
            ]}
          />
        </div>
        <button
          onClick={() =>
            codRemittanceApi.export({
              status: applied.status,
              dateFrom: applied.dateFrom,
              dateTo: applied.dateTo,
            })
          }
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold border border-border-light bg-background-elevated hover:bg-background transition-colors text-foreground"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <ResponsiveTable
        columns={columns}
        dataSource={remittances}
        rowKey="id"
        loading={isLoading}
        size="middle"
        onChange={(_p, _f, sorter) => {
          if (!Array.isArray(sorter) && sorter.order) {
            setSortField(sorter.columnKey as string);
            setSortOrder(sorter.order === "ascend" ? "asc" : "desc");
          } else {
            setSortField(undefined);
            setSortOrder(undefined);
          }
        }}
        pagination={
          pagination
            ? {
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                onChange: (p: number) => setPage(p),
                showTotal: (total: number, range: [number, number]) =>
                  `${range[0]}–${range[1]} of ${total}`,
              }
            : false
        }
        scroll={{ x: 900 }}
        locale={{ emptyText: "No COD remittances yet" }}
      />
    </div>
  );
}
