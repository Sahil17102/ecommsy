import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Tooltip } from "antd";
import {
  PackageX,
  Search,
  RotateCcw,
  ArrowRightLeft,
  MapPin,
  Loader2,
  AlertTriangle,
  Radar,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useNdrOrders, useNdrAction, useOrderCourierOptions } from "@/queries/useOrders";
import {
  formatCurrency,
  formatDate,
  formatKeyword,
  formatWeight,
  formatAddress,
  formatCityPincode,
} from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { CopyButton, CollapsibleFilters, ResponsiveTable } from "@/components/common";
import type { FilterItem, ResponsiveColumnsType } from "@/components/common";
import FilterSelect from "@/pages/OrdersPage/components/FilterSelect";
import type { Order } from "@/lib/ordersTypes";

const PAGE_SIZE = 20;

const PAYMENT_OPTIONS = [
  { value: "", label: "All Payments" },
  { value: "prepaid", label: "Prepaid" },
  { value: "cod", label: "COD" },
];

const NDR_ACTIONS = [
  { value: "reattempt" as const, label: "Reattempt", icon: RotateCcw },
  { value: "rto" as const, label: "RTO", icon: ArrowRightLeft },
  { value: "reschedule" as const, label: "Reschedule", icon: RotateCcw },
];

// ── NDR Action Modal ──

function NdrActionModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [action, setAction] = useState<"reattempt" | "rto" | "reschedule" | null>(null);
  const [remarks, setRemarks] = useState("");
  const ndrAction = useNdrAction();

  const handleSubmit = () => {
    if (!action) return;
    ndrAction.mutate({ id: order.id, action, remarks }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background-elevated rounded-2xl border border-border-light shadow-xl p-6 w-full max-w-md mx-4"
      >
        <h3 className="text-sm font-bold text-foreground mb-1">NDR Action</h3>
        <p className="text-xs text-muted mb-1">
          Order: <span className="font-mono font-semibold">{order.orderId}</span> — AWB: <span className="font-mono">{order.awb}</span>
        </p>
        {order.ndrReason && (
          <p className="text-xs text-muted mb-4">
            Reason: <span className="text-foreground">{order.ndrReason}</span>
          </p>
        )}

        <div className="flex gap-2 mb-4 mt-3">
          {NDR_ACTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAction(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                action === opt.value
                  ? opt.value === "rto"
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-primary/40 bg-primary/[0.06] text-primary"
                  : "border-border-light text-muted hover:border-primary/20"
              }`}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>

        <textarea
          placeholder="Remarks (optional)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border-light bg-background px-3 py-2 text-sm text-foreground placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none mb-4"
        />

        {action === "rto" && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-700 mb-4">
            RTO charges will be debited from your wallet.
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted border border-border-light hover:bg-surface-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!action || ndrAction.isPending}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50 ${
              action === "rto" ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {ndrAction.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 inline" /> : null}
            Confirm {action ?? "Action"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Page ──

export function NdrPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();
  const [actionOrder, setActionOrder] = useState<Order | null>(null);

  const filters = useDeferredFilters(
    {
      search: "",
      courier: "",
      payment: "",
      startDate: "",
      endDate: "",
    },
    () => setPage(1),
  );
  const debouncedSearch = useDebounce(filters.applied.search);

  const { data: sellerCouriers = [] } = useOrderCourierOptions();
  const courierOptions = [
    { value: "", label: "All Couriers" },
    ...sellerCouriers.map((c) => ({ value: c.id, label: c.name })),
  ];

  const { data, isLoading } = useNdrOrders({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    courierId: filters.applied.courier || undefined,
    paymentType: filters.applied.payment || undefined,
    startDate: filters.applied.startDate || undefined,
    endDate: filters.applied.endDate || undefined,
    sortField,
    sortOrder,
  });

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;

  const activeFilterCount =
    [filters.draft.courier, filters.draft.payment, filters.draft.startDate || filters.draft.endDate].filter(Boolean).length +
    (filters.draft.search ? 1 : 0);

  const columns: ResponsiveColumnsType<Order> = [
    {
      title: "Order",
      key: "order",
      width: 175,
      mobileTitle: true,
      render: (_, r) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <Link
              to={`/orders/${r.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-mono font-semibold text-primary hover:text-primary/80 truncate no-underline"
            >
              {r.orderId}
            </Link>
            <CopyButton text={r.orderId} title="Copy order ID" />
          </div>
          <span className="block text-[10px] text-tertiary mt-0.5">{formatDate(r.createdAt)}</span>
        </div>
      ),
    },
    {
      title: "AWB",
      key: "awb",
      width: 165,
      render: (_, r) =>
        r.awb ? (
          <div className="flex items-center gap-1 min-w-0">
            <Link
              to={`/tools/order-tracking?mode=awb&q=${encodeURIComponent(r.awb)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-mono text-primary hover:text-primary/80 truncate no-underline"
            >
              {r.awb}
            </Link>
            <CopyButton text={r.awb} title="Copy AWB" />
            <Tooltip title="Track shipment">
              <Link
                to={`/tools/order-tracking?mode=awb&q=${encodeURIComponent(r.awb)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-muted hover:text-primary shrink-0"
              >
                <Radar size={13} />
              </Link>
            </Tooltip>
          </div>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      title: "Customer",
      key: "customer",
      width: 150,
      render: (_, r) => (
        <div className="min-w-0">
          <span className="block text-xs text-foreground truncate">{r.deliveryAddress?.contactName || "—"}</span>
          {r.deliveryAddress?.phone && (
            <span className="block text-[10px] text-muted truncate mt-0.5">{r.deliveryAddress.phone}</span>
          )}
        </div>
      ),
    },
    {
      title: "Delivery Address",
      key: "destination",
      width: 170,
      render: (_, r) => (
        <Tooltip title={formatAddress(r.deliveryAddress)}>
          <span className="text-xs text-muted flex items-center gap-1.5 min-w-0">
            <MapPin size={13} className="text-tertiary shrink-0" />
            <span className="truncate">{formatCityPincode(r.deliveryAddress)}</span>
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Pickup",
      key: "pickup",
      width: 140,
      render: (_, r) => (
        <Tooltip title={formatAddress(r.pickupAddress)}>
          <span className="text-xs text-muted block truncate">
            {r.pickupAddress?.nickname || formatCityPincode(r.pickupAddress)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Courier",
      key: "courier",
      width: 160,
      render: (_, r) => {
        const name = r.courierName || formatKeyword(r.serviceProvider);
        return (
          <Tooltip title={name}>
            <Tag bordered={false} className="max-w-full !mr-0 align-middle">
              <span className="block truncate">{name}</span>
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Weight",
      key: "weight",
      width: 90,
      align: "right",
      render: (_, r) => (
        <Tooltip title={r.weight ? `${r.weight} g` : undefined}>
          <span className="text-xs text-foreground tabular-nums">{formatWeight(r.weight)}</span>
        </Tooltip>
      ),
    },
    {
      title: "Amount",
      key: "orderAmount",
      width: 110,
      align: "right",
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_, r) => (
        <div className="text-right">
          <span className="block text-xs font-semibold text-foreground tabular-nums">{formatCurrency(r.orderAmount)}</span>
          <Tag bordered={false} color={r.paymentType === "cod" ? "orange" : "green"} className="!mr-0 !text-[10px] mt-0.5">
            {r.paymentType?.toUpperCase()}
          </Tag>
        </div>
      ),
    },
    {
      title: "NDR Reason",
      key: "ndrReason",
      width: 200,
      render: (_, r) => {
        if (!r.ndrReason) return <span className="text-xs text-muted">—</span>;
        const full = [r.ndrReason, r.ndrRemarks, r.ndrLocation && `Last scan: ${r.ndrLocation}`]
          .filter(Boolean)
          .join(" · ");
        return (
          <Tooltip title={full}>
            {/* The px cap is what actually makes `truncate` bite in an antd cell. */}
            <span className="text-xs text-foreground block truncate max-w-[200px]">{formatKeyword(r.ndrReason)}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Attempts",
      key: "attempts",
      width: 85,
      align: "center",
      render: (_, r) =>
        r.ndrAttemptCount ? (
          <Tag bordered={false} color={r.ndrAttemptCount >= 3 ? "red" : "purple"} className="!mr-0">
            {r.ndrAttemptCount}
          </Tag>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      title: "NDR Date",
      key: "ndrAttemptedAt",
      width: 120,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_, r) => <span className="text-xs text-muted">{formatDate(r.ndrAttemptedAt ?? r.updatedAt)}</span>,
    },
    {
      title: "Actions",
      key: "actions",
      // A fixed column narrower than its button overlays the column to its left.
      width: 170,
      align: "right",
      fixed: "right",
      mobileActions: true,
      render: (_, r) => (
        <button
          onClick={(e) => { e.stopPropagation(); setActionOrder(r); }}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-primary text-white shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <AlertTriangle className="w-3 h-3" />
          Take Action
        </button>
      ),
    },
  ];

  const primaryFilters: FilterItem[] = [
    {
      key: "search",
      label: "Search",
      width: "240px",
      render: (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tertiary" />
          <input
            type="text"
            placeholder="Order ID, AWB, customer, reason..."
            value={filters.draft.search}
            onChange={(e) => filters.setFilter("search", e.target.value)}
            className="w-full h-[34px] pl-8 pr-2.5 rounded-lg border border-border-light bg-background text-xs text-foreground placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          />
        </div>
      ),
    },
    {
      key: "courier",
      label: "Courier",
      width: "170px",
      render: <FilterSelect value={filters.draft.courier} onChange={(v) => filters.setFilter("courier", v)} options={courierOptions} />,
    },
    {
      key: "payment",
      label: "Payment",
      width: "140px",
      render: <FilterSelect value={filters.draft.payment} onChange={(v) => filters.setFilter("payment", v)} options={PAYMENT_OPTIONS} />,
    },
  ];

  const secondaryFilters: FilterItem[] = [
    {
      key: "startDate",
      label: "NDR From",
      width: "150px",
      render: (
        <input
          type="date"
          value={filters.draft.startDate}
          max={filters.draft.endDate || undefined}
          onChange={(e) => filters.setFilter("startDate", e.target.value)}
          className="w-full h-[34px] px-2.5 rounded-lg border border-border-light bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        />
      ),
    },
    {
      key: "endDate",
      label: "NDR To",
      width: "150px",
      render: (
        <input
          type="date"
          value={filters.draft.endDate}
          min={filters.draft.startDate || undefined}
          onChange={(e) => filters.setFilter("endDate", e.target.value)}
          className="w-full h-[34px] px-2.5 rounded-lg border border-border-light bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        />
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-[1400px] mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <PackageX className="w-4.5 h-4.5 text-rose-500" />
            </div>
            <h1 className="text-lg font-bold text-foreground">NDR</h1>
          </div>
          <p className="text-xs text-muted mt-1">Non-delivery reports — take action on failed deliveries</p>
        </div>
        <span className="hidden lg:inline-flex text-xs font-bold text-rose-500 bg-rose-50 border border-rose-200/60 px-3 py-1.5 rounded-full">
          {total} NDR
        </span>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <CollapsibleFilters
          primary={primaryFilters}
          secondary={secondaryFilters}
          activeCount={activeFilterCount}
          onApply={filters.apply}
          onClearAll={filters.clearAll}
          extra={
            <span className="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-200/60 px-3 py-1.5 rounded-full lg:hidden">
              {total} NDR
            </span>
          }
        />
      </div>

      <ResponsiveTable
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={isLoading}
        size="middle"
        // Must be >= the sum of the column widths (1735), otherwise antd lays
        // the fixed Actions column over NDR Date instead of beside it.
        scroll={{ x: 1800 }}
        onChange={(_p, _f, sorter) => {
          if (!Array.isArray(sorter) && sorter.order) {
            setSortField(sorter.columnKey as string);
            setSortOrder(sorter.order === "ascend" ? "asc" : "desc");
          } else {
            setSortField(undefined);
            setSortOrder(undefined);
          }
        }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t, range) => `${range[0]}–${range[1]} of ${t}`,
        }}
        locale={{ emptyText: "No non-delivery reports — all your deliveries are on track." }}
        onRow={(record) => ({
          onClick: () => navigate(`/orders/${record.id}`),
          className: "cursor-pointer",
        })}
      />

      {/* NDR Action Modal */}
      <AnimatePresence>
        {actionOrder && <NdrActionModal order={actionOrder} onClose={() => setActionOrder(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
