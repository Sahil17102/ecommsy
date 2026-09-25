import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input, Modal, Button, Select, DatePicker, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { AlertTriangle, Search, RotateCcw, ArrowRightLeft, MapPin, Radar } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import { CopyButton } from "@/components/common/CopyButton";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useNdrOrders, useNdrAction } from "@/features/orders/queries";
import { useUsers } from "@/features/users/queries";
import { useCouriers } from "@/features/couriers/queries";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatKeyword,
  formatWeight,
  formatAddress,
  formatCityPincode,
} from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { DEFAULT_PAGE_SIZE } from "@/lib/config";
import type { NdrOrderListItem } from "@/features/orders/types";

const NDR_ACTION_OPTIONS = [
  { value: "reattempt", label: "Retry", icon: <RotateCcw size={14} /> },
  { value: "rto", label: "RTO", icon: <ArrowRightLeft size={14} /> },
  { value: "reschedule", label: "Reschedule", icon: <RotateCcw size={14} /> },
];

type NdrOrder = NdrOrderListItem;

export default function NdrPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  const filters = useDeferredFilters(
    {
      search: "",
      courierId: undefined as string | undefined,
      userId: undefined as string | undefined,
      paymentType: undefined as string | undefined,
      orderType: undefined as string | undefined,
      startDate: undefined as string | undefined,
      endDate: undefined as string | undefined,
    },
    () => setPage(1),
  );
  const debouncedSearch = useDebounce(filters.applied.search);

  const { data: usersData } = useUsers({ limit: 500 });
  const userOptions = (usersData?.users ?? []).map((u) => ({
    label: u.businessName || u.name || u.email || u.phone || u.id,
    value: u.id,
  }));
  const { data: couriersData } = useCouriers({ limit: 200 });
  const courierOptions = (couriersData?.couriers ?? []).map((c) => ({ label: c.name, value: c.id }));

  const { data, isLoading } = useNdrOrders({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    courierId: filters.applied.courierId,
    userId: filters.applied.userId,
    paymentType: filters.applied.paymentType,
    orderType: filters.applied.orderType,
    startDate: filters.applied.startDate,
    endDate: filters.applied.endDate,
    sortField,
    sortOrder,
  });

  const [actionTarget, setActionTarget] = useState<{ order: NdrOrder; action?: string } | null>(null);
  const [actionRemarks, setActionRemarks] = useState("");
  const ndrAction = useNdrAction();

  const handleAction = () => {
    if (!actionTarget?.action || !actionTarget.order) return;
    ndrAction.mutate(
      { id: actionTarget.order.id, action: actionTarget.action as "reattempt" | "rto" | "reschedule", remarks: actionRemarks },
      { onSuccess: () => { setActionTarget(null); setActionRemarks(""); } },
    );
  };

  const columns: ResponsiveColumnsType<NdrOrder> = [
    {
      title: "Order",
      key: "orderId",
      width: 190,
      mobileTitle: true,
      render: (_: unknown, r: NdrOrder) => {
        const seller = r.user?.businessName || r.user?.name || r.user?.email || null;
        return (
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
            <span className="block text-[10px] text-muted truncate mt-0.5">{seller ?? "—"}</span>
          </div>
        );
      },
    },
    {
      title: "AWB",
      key: "awb",
      width: 165,
      render: (_: unknown, r: NdrOrder) =>
        r.awb ? (
          <div className="flex items-center gap-1 min-w-0">
            <Link
              to={`/order-tracking?mode=awb&q=${encodeURIComponent(r.awb)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-mono text-primary hover:text-primary/80 truncate no-underline"
            >
              {r.awb}
            </Link>
            <CopyButton text={r.awb} title="Copy AWB" />
            <Tooltip title="Track shipment">
              <Link
                to={`/order-tracking?mode=awb&q=${encodeURIComponent(r.awb)}`}
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
      width: 160,
      render: (_: unknown, r: NdrOrder) => (
        <div className="min-w-0">
          <span className="block text-xs text-foreground truncate">
            {r.deliveryAddress?.contactName || "—"}
          </span>
          {r.deliveryAddress?.phone && (
            <span className="block text-[10px] text-muted truncate mt-0.5">{r.deliveryAddress.phone}</span>
          )}
        </div>
      ),
    },
    {
      title: "Delivery Address",
      key: "dest",
      width: 170,
      render: (_: unknown, r: NdrOrder) => (
        <Tooltip title={formatAddress(r.deliveryAddress)}>
          <span className="text-xs text-muted flex items-center gap-1.5 min-w-0">
            <MapPin size={13} className="text-muted shrink-0" />
            <span className="truncate">{formatCityPincode(r.deliveryAddress)}</span>
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Pickup",
      key: "pickup",
      width: 150,
      render: (_: unknown, r: NdrOrder) => (
        <Tooltip title={formatAddress(r.pickupAddress)}>
          <span className="text-xs text-muted block truncate">
            {r.pickupAddress?.nickname || formatCityPincode(r.pickupAddress)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Courier",
      key: "sp",
      width: 160,
      // Courier names run long; clamp the cell and keep the full name in a tooltip.
      render: (_: unknown, r: NdrOrder) => {
        const name = r.courierName || formatKeyword(r.serviceProvider ?? "") || "—";
        return (
          <Tooltip title={name}>
            <span className="text-xs text-foreground block truncate">{name}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Weight",
      key: "weight",
      width: 90,
      align: "right" as const,
      render: (_: unknown, r: NdrOrder) => (
        <Tooltip title={r.weight ? `${r.weight} g` : undefined}>
          <span className="text-xs text-foreground tabular-nums">{formatWeight(r.weight)}</span>
        </Tooltip>
      ),
    },
    {
      title: "Amount",
      dataIndex: "orderAmount",
      // columnKey is what the sorter sends to the API — it must match the
      // server's allowed sort fields ("orderAmount" / "ndrAttemptedAt").
      key: "orderAmount",
      width: 120,
      align: "right" as const,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_: unknown, r: NdrOrder) => (
        <div className="text-right">
          <span className="block text-xs font-semibold text-foreground tabular-nums">
            {formatCurrency(r.orderAmount)}
          </span>
          {r.paymentType && (
            <Tag
              bordered={false}
              color={r.paymentType === "cod" ? "orange" : "green"}
              className="!mr-0 !text-[10px] mt-0.5"
            >
              {r.paymentType.toUpperCase()}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "NDR Reason",
      key: "ndrReason",
      width: 200,
      render: (_: unknown, r: NdrOrder) => {
        if (!r.ndrReason) return <span className="text-xs text-muted">—</span>;
        const full = [r.ndrReason, r.ndrRemarks, r.ndrLocation && `Last scan: ${r.ndrLocation}`]
          .filter(Boolean)
          .join(" · ");
        return (
          <Tooltip title={full}>
            {/* A px cap is what makes `truncate` work inside an antd cell —
                the column width alone is only a hint under table-layout:auto. */}
            <span className="text-xs text-foreground block truncate max-w-[200px]">
              {formatKeyword(r.ndrReason)}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Attempts",
      key: "ndrAttemptCount",
      width: 90,
      align: "center" as const,
      render: (_: unknown, r: NdrOrder) =>
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
      width: 130,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_: unknown, r: NdrOrder) => (
        <Tooltip title={r.ndrAttemptedAt ? formatDateTime(r.ndrAttemptedAt) : undefined}>
          <span className="text-xs text-muted">{formatDate(r.ndrAttemptedAt)}</span>
        </Tooltip>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right" as const,
      // Wide enough for "Retry + RTO + Reschedule" side by side. A fixed column
      // narrower than its buttons overlays the column to its left.
      width: 300,
      fixed: "right" as const,
      mobileActions: true,
      render: (_: unknown, record: NdrOrder) => (
        <div className="flex gap-1.5 justify-end">
          {NDR_ACTION_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="small"
              type={opt.value === "rto" ? "default" : "primary"}
              danger={opt.value === "rto"}
              icon={opt.icon}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActionTarget({ order: record, action: opt.value }); }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  const activeFilterCount = [
    filters.draft.courierId,
    filters.draft.userId,
    filters.draft.paymentType,
    filters.draft.orderType,
    filters.draft.startDate || filters.draft.endDate,
  ].filter(Boolean).length + (filters.draft.search ? 1 : 0);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={AlertTriangle}
        title="NDR Management"
        subtitle="Non-delivery reports — take action on failed deliveries"
        stats={[
          { label: "Total NDR", value: data?.total ?? 0, icon: AlertTriangle, iconColor: "text-rose-500" },
        ]}
        filters={
          <CollapsibleFilters
            activeCount={activeFilterCount}
            onApply={filters.apply}
            onClearAll={filters.clearAll}
            primary={[
              {
                key: "search",
                label: "Search",
                width: "240px",
                render: (
                  <Input
                    prefix={<Search size={14} className="text-muted" />}
                    placeholder="Order ID, AWB, customer, reason..."
                    value={filters.draft.search}
                    onChange={(e) => filters.setFilter("search", e.target.value)}
                    allowClear
                    className="w-full"
                  />
                ),
              },
              {
                key: "courierId",
                label: "Courier",
                width: "200px",
                render: (
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="All couriers"
                    value={filters.draft.courierId}
                    onChange={(val) => filters.setFilter("courierId", val || undefined)}
                    className="w-full"
                    options={courierOptions}
                  />
                ),
              },
              {
                key: "dateRange",
                label: "NDR Date",
                width: "240px",
                render: (
                  <DatePicker.RangePicker
                    allowEmpty={[true, true]}
                    value={[
                      filters.draft.startDate ? dayjs(filters.draft.startDate) : null,
                      filters.draft.endDate ? dayjs(filters.draft.endDate) : null,
                    ]}
                    onChange={(dates) => {
                      filters.setFilter("startDate", dates?.[0] ? dates[0].format("YYYY-MM-DD") : undefined);
                      filters.setFilter("endDate", dates?.[1] ? dates[1].format("YYYY-MM-DD") : undefined);
                    }}
                    className="w-full"
                    format="DD MMM YYYY"
                  />
                ),
              },
            ]}
            secondary={[
              {
                key: "userId",
                label: "Seller",
                width: "200px",
                render: (
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="All sellers"
                    value={filters.draft.userId}
                    onChange={(val) => filters.setFilter("userId", val || undefined)}
                    className="w-full"
                    options={userOptions}
                  />
                ),
              },
              {
                key: "payment",
                label: "Payment",
                width: "130px",
                render: (
                  <Select
                    allowClear
                    placeholder="All"
                    value={filters.draft.paymentType}
                    onChange={(val) => filters.setFilter("paymentType", val || undefined)}
                    className="w-full"
                    options={[
                      { label: "Prepaid", value: "prepaid" },
                      { label: "COD", value: "cod" },
                    ]}
                  />
                ),
              },
              {
                key: "orderType",
                label: "Order Type",
                width: "130px",
                render: (
                  <Select
                    allowClear
                    placeholder="All types"
                    value={filters.draft.orderType}
                    onChange={(val) => filters.setFilter("orderType", val || undefined)}
                    className="w-full"
                    options={[
                      { label: "B2B", value: "B2B" },
                      { label: "B2C", value: "B2C" },
                    ]}
                  />
                ),
              },
            ]}
            extra={
              <span className="text-xs text-muted whitespace-nowrap">
                {data?.total ?? 0} NDR{(data?.total ?? 0) !== 1 ? "s" : ""}
              </span>
            }
          />
        }
      />

      <ResponsiveTable
        columns={columns}
        dataSource={(data?.orders ?? []) as NdrOrder[]}
        rowKey="id"
        loading={isLoading}
        size="middle"
        // Must be >= the sum of the column widths (1925), otherwise antd lays
        // the fixed Actions column over NDR Date instead of beside it.
        scroll={{ x: 1980 }}
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
          pageSize,
          total: data?.total ?? 0,
          onChange: (p, size) => {
            if (size !== pageSize) {
              setPageSize(size);
              setPage(1);
            } else {
              setPage(p);
            }
          },
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
        }}
        locale={{ emptyText: "No NDR orders found" }}
        mobileHref={(record) => `/orders/${record.id}`}
        onRow={(record) => ({
          onClick: () => navigate(`/orders/${record.id}`),
          className: "cursor-pointer",
        })}
      />

      {/* NDR Action Modal */}
      <Modal
        title={`NDR Action: ${actionTarget?.action === "reattempt" ? "Reattempt Delivery" : actionTarget?.action === "rto" ? "Return to Origin" : "Reschedule"}`}
        open={!!actionTarget}
        onCancel={() => { setActionTarget(null); setActionRemarks(""); }}
        onOk={handleAction}
        confirmLoading={ndrAction.isPending}
        okText={`Confirm ${actionTarget?.action}`}
        okButtonProps={{ danger: actionTarget?.action === "rto" }}
      >
        <div className="space-y-3 py-2">
          <div className="text-sm text-muted-foreground">
            Order: <span className="font-mono font-semibold">{actionTarget?.order?.orderId}</span> — AWB: <span className="font-mono">{actionTarget?.order?.awb}</span>
          </div>
          {(actionTarget?.order as NdrOrder | undefined)?.ndrReason && (
            <div className="text-sm text-muted-foreground">
              Reason: <span className="text-foreground">{(actionTarget?.order as NdrOrder).ndrReason}</span>
            </div>
          )}
          <Input.TextArea
            placeholder="Remarks (optional)"
            value={actionRemarks}
            onChange={(e) => setActionRemarks(e.target.value)}
            rows={3}
          />
          {actionTarget?.action === "rto" && (
            <div className="rounded-md border border-purple-200 bg-purple-50 p-3 text-sm text-purple-700">
              RTO charges will be debited from the merchant's wallet.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
