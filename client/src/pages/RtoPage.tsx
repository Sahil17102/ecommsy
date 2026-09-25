import { useState } from "react";
import { motion } from "framer-motion";
import { Tag, Tooltip } from "antd";
import { RotateCcw, Search, MapPin, Undo2, Radar } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useRtoOrders, useOrderCourierOptions } from "@/queries/useOrders";
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

const RTO_PHASE_OPTIONS = [
  { value: "", label: "All Phases" },
  { value: "initiated", label: "Initiated" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "All Payments" },
  { value: "prepaid", label: "Prepaid" },
  { value: "cod", label: "COD" },
];

const PHASE_COLORS: Record<string, string> = {
  initiated: "purple",
  in_transit: "purple",
  delivered: "red",
};

const PHASE_LABELS: Record<string, string> = {
  initiated: "Initiated",
  in_transit: "In Transit",
  delivered: "Delivered",
};

/** Fallback when an order reached an RTO status without a metadata phase stamp. */
const PHASE_BY_STATUS: Record<string, string> = {
  rto_initiated: "initiated",
  rto_in_transit: "in_transit",
  rto_delivered: "delivered",
};

export function RtoPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  const filters = useDeferredFilters(
    {
      search: "",
      rtoPhase: "",
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

  const { data, isLoading } = useRtoOrders({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    rtoPhase: filters.applied.rtoPhase || undefined,
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
    [
      filters.draft.rtoPhase,
      filters.draft.courier,
      filters.draft.payment,
      filters.draft.startDate || filters.draft.endDate,
    ].filter(Boolean).length + (filters.draft.search ? 1 : 0);

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
      title: "Phase",
      key: "phase",
      width: 115,
      render: (_, r) => {
        const phase = r.rtoStatus || PHASE_BY_STATUS[r.status] || "initiated";
        return (
          <Tag color={PHASE_COLORS[phase]} bordered={false}>
            {PHASE_LABELS[phase] ?? formatKeyword(phase)}
          </Tag>
        );
      },
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
      title: "Returning To",
      key: "returnTo",
      width: 170,
      // The order's own RTO address if it carries one, else the pickup location.
      render: (_, r) => {
        const back = r.rtoAddress ?? r.pickupAddress;
        return (
          <Tooltip title={formatAddress(back)}>
            <span className="text-xs text-muted flex items-center gap-1.5 min-w-0">
              <Undo2 size={13} className="text-tertiary shrink-0" />
              <span className="truncate">{back?.nickname || formatCityPincode(back)}</span>
            </span>
          </Tooltip>
        );
      },
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
      title: "RTO Charge",
      key: "rtoCharge",
      width: 105,
      align: "right",
      render: (_, r) => (
        <span className="text-xs text-foreground tabular-nums">{formatCurrency(r.rtoCharges ?? r.rate?.rto)}</span>
      ),
    },
    {
      title: "Reason",
      key: "rtoReason",
      width: 200,
      render: (_, r) => {
        const reason = r.rtoReason || r.rtoRemarks || r.ndrReason;
        if (!reason) return <span className="text-xs text-muted">—</span>;
        const full = [r.rtoReason, r.rtoRemarks, r.ndrReason].filter(Boolean).join(" · ");
        return (
          <Tooltip title={full}>
            {/* The px cap is what actually makes `truncate` bite in an antd cell. */}
            <span className="text-xs text-foreground block truncate max-w-[200px]">{formatKeyword(reason)}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "RTO Date",
      key: "updatedAt",
      width: 120,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_, r) => (
        <span className="text-xs text-muted">{formatDate(r.rtoUpdatedAt ?? r.rtoReturnedAt ?? r.updatedAt)}</span>
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
            placeholder="Order ID, AWB, customer..."
            value={filters.draft.search}
            onChange={(e) => filters.setFilter("search", e.target.value)}
            className="w-full h-[34px] pl-8 pr-2.5 rounded-lg border border-border-light bg-background text-xs text-foreground placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          />
        </div>
      ),
    },
    {
      key: "rtoPhase",
      label: "RTO Phase",
      width: "160px",
      render: <FilterSelect value={filters.draft.rtoPhase} onChange={(v) => filters.setFilter("rtoPhase", v)} options={RTO_PHASE_OPTIONS} />,
    },
    {
      key: "courier",
      label: "Courier",
      width: "170px",
      render: <FilterSelect value={filters.draft.courier} onChange={(v) => filters.setFilter("courier", v)} options={courierOptions} />,
    },
  ];

  const secondaryFilters: FilterItem[] = [
    {
      key: "payment",
      label: "Payment",
      width: "140px",
      render: <FilterSelect value={filters.draft.payment} onChange={(v) => filters.setFilter("payment", v)} options={PAYMENT_OPTIONS} />,
    },
    {
      key: "startDate",
      label: "RTO From",
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
      label: "RTO To",
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
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <RotateCcw className="w-4.5 h-4.5 text-purple-500" />
            </div>
            <h1 className="text-lg font-bold text-foreground">RTO</h1>
          </div>
          <p className="text-xs text-muted mt-1">Return to origin — track returned shipments</p>
        </div>
        <span className="hidden lg:inline-flex text-xs font-bold text-purple-500 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full">
          {total} RTO
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
            <span className="text-xs font-bold text-purple-500 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full lg:hidden">
              {total} RTO
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
        // >= the sum of the column widths (1730) so nothing overlaps.
        scroll={{ x: 1780 }}
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
        locale={{ emptyText: "No RTO shipments — nothing has been returned." }}
        onRow={(record) => ({
          onClick: () => navigate(`/orders/${record.id}`),
          className: "cursor-pointer",
        })}
      />
    </motion.div>
  );
}
