import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tag, Input, Select, Modal, Button, DatePicker, Tooltip, InputNumber } from "antd";
import dayjs from "dayjs";
import { RotateCcw, Search, ArrowRight, MapPin, Radar, Undo2 } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import { CopyButton } from "@/components/common/CopyButton";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useRtoOrders, useUpdateRtoPhase } from "@/features/orders/queries";
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
import type { RtoOrderListItem } from "@/features/orders/types";

const RTO_PHASE_OPTIONS = [
  { value: "initiated", label: "Initiated" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
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

type RtoOrder = RtoOrderListItem;

export default function RtoPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  const filters = useDeferredFilters(
    {
      search: "",
      rtoPhase: undefined as string | undefined,
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

  const { data, isLoading } = useRtoOrders({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    rtoPhase: filters.applied.rtoPhase,
    courierId: filters.applied.courierId,
    userId: filters.applied.userId,
    paymentType: filters.applied.paymentType,
    orderType: filters.applied.orderType,
    startDate: filters.applied.startDate,
    endDate: filters.applied.endDate,
    sortField,
    sortOrder,
  });

  const [phaseTarget, setPhaseTarget] = useState<{ order: RtoOrder; nextPhase: string } | null>(null);
  const [phaseRemarks, setPhaseRemarks] = useState("");
  const [rtoCharges, setRtoCharges] = useState<number | null>(null);
  const updatePhase = useUpdateRtoPhase();

  const handlePhaseUpdate = () => {
    if (!phaseTarget) return;
    updatePhase.mutate(
      {
        id: phaseTarget.order.id,
        phase: phaseTarget.nextPhase as "initiated" | "in_transit" | "delivered",
        remarks: phaseRemarks,
        rtoCharges: rtoCharges ?? undefined,
      },
      { onSuccess: () => { setPhaseTarget(null); setPhaseRemarks(""); setRtoCharges(null); } },
    );
  };

  const getNextPhase = (order: RtoOrder): string | null => {
    if (order.status === "rto_initiated") return "in_transit";
    if (order.status === "rto_in_transit") return "delivered";
    return null;
  };

  const columns: ResponsiveColumnsType<RtoOrder> = [
    {
      title: "Order",
      key: "orderId",
      width: 190,
      mobileTitle: true,
      render: (_: unknown, r: RtoOrder) => {
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
      render: (_: unknown, r: RtoOrder) =>
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
      title: "RTO Phase",
      key: "rtoPhase",
      width: 120,
      render: (_: unknown, r: RtoOrder) => {
        const phase = r.rtoStatus || PHASE_BY_STATUS[r.status] || "initiated";
        return <Tag color={PHASE_COLORS[phase]} bordered={false}>{PHASE_LABELS[phase] ?? formatKeyword(phase)}</Tag>;
      },
    },
    {
      title: "Customer",
      key: "customer",
      width: 160,
      render: (_: unknown, r: RtoOrder) => (
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
      render: (_: unknown, r: RtoOrder) => (
        <Tooltip title={formatAddress(r.deliveryAddress)}>
          <span className="text-xs text-muted flex items-center gap-1.5 min-w-0">
            <MapPin size={13} className="text-muted shrink-0" />
            <span className="truncate">{formatCityPincode(r.deliveryAddress)}</span>
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Returning To",
      key: "returnTo",
      width: 170,
      // Where the parcel is heading back to — the order's RTO address if it has
      // one, otherwise the pickup location it shipped from.
      render: (_: unknown, r: RtoOrder) => {
        const back = r.rtoAddress ?? r.pickupAddress;
        return (
          <Tooltip title={formatAddress(back)}>
            <span className="text-xs text-muted flex items-center gap-1.5 min-w-0">
              <Undo2 size={13} className="text-muted shrink-0" />
              <span className="truncate">{back?.nickname || formatCityPincode(back)}</span>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Courier",
      key: "sp",
      width: 160,
      render: (_: unknown, r: RtoOrder) => {
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
      render: (_: unknown, r: RtoOrder) => (
        <Tooltip title={r.weight ? `${r.weight} g` : undefined}>
          <span className="text-xs text-foreground tabular-nums">{formatWeight(r.weight)}</span>
        </Tooltip>
      ),
    },
    {
      title: "Amount",
      dataIndex: "orderAmount",
      // Must match the server's allowed sort field.
      key: "orderAmount",
      width: 120,
      align: "right" as const,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_: unknown, r: RtoOrder) => (
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
      title: "RTO Charge",
      key: "rtoCharge",
      width: 110,
      align: "right" as const,
      render: (_: unknown, r: RtoOrder) => (
        <span className="text-xs text-foreground tabular-nums">
          {formatCurrency(r.rtoCharges ?? r.rate?.rto)}
        </span>
      ),
    },
    {
      title: "Reason",
      key: "rtoReason",
      width: 200,
      render: (_: unknown, r: RtoOrder) => {
        const reason = r.rtoReason || r.rtoRemarks;
        if (!reason) return <span className="text-xs text-muted">—</span>;
        const full = [r.rtoReason, r.rtoRemarks].filter(Boolean).join(" · ");
        return (
          <Tooltip title={full}>
            {/* The px cap is what actually makes `truncate` bite in an antd cell. */}
            <span className="text-xs text-foreground block truncate max-w-[200px]">
              {formatKeyword(reason)}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "RTO Date",
      key: "updatedAt",
      width: 130,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_: unknown, r: RtoOrder) => {
        const date = r.rtoUpdatedAt ?? r.updatedAt;
        return (
          <Tooltip title={date ? formatDateTime(date) : undefined}>
            <span className="text-xs text-muted">{formatDate(date)}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      align: "right" as const,
      // Fits "Move to In Transit" without the fixed cell riding over RTO Date.
      width: 200,
      fixed: "right" as const,
      mobileActions: true,
      render: (_: unknown, record: RtoOrder) => {
        const next = getNextPhase(record);
        if (!next) return <Tag color="default" bordered={false}>Completed</Tag>;
        return (
          <Button
            size="small"
            type="primary"
            icon={<ArrowRight size={14} />}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setPhaseTarget({ order: record, nextPhase: next }); }}
          >
            Move to {next === "in_transit" ? "In Transit" : "Delivered"}
          </Button>
        );
      },
    },
  ];

  const activeFilterCount = [
    filters.draft.rtoPhase,
    filters.draft.courierId,
    filters.draft.userId,
    filters.draft.paymentType,
    filters.draft.orderType,
    filters.draft.startDate || filters.draft.endDate,
  ].filter(Boolean).length + (filters.draft.search ? 1 : 0);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={RotateCcw}
        title="RTO Management"
        subtitle="Return to origin — track and manage returned shipments"
        stats={[
          { label: "Total RTO", value: data?.total ?? 0, icon: RotateCcw, iconColor: "text-purple-500" },
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
                    placeholder="Order ID, AWB, customer, remarks..."
                    value={filters.draft.search}
                    onChange={(e) => filters.setFilter("search", e.target.value)}
                    allowClear
                    className="w-full"
                  />
                ),
              },
              {
                key: "rtoPhase",
                label: "Phase",
                width: "160px",
                render: (
                  <Select
                    allowClear
                    placeholder="All phases"
                    value={filters.draft.rtoPhase}
                    onChange={(val) => filters.setFilter("rtoPhase", val || undefined)}
                    className="w-full"
                    options={RTO_PHASE_OPTIONS}
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
            ]}
            secondary={[
              {
                key: "dateRange",
                label: "RTO Date",
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
                {data?.total ?? 0} RTO{(data?.total ?? 0) !== 1 ? "s" : ""}
              </span>
            }
          />
        }
      />

      <ResponsiveTable
        columns={columns}
        dataSource={(data?.orders ?? []) as RtoOrder[]}
        rowKey="id"
        loading={isLoading}
        size="middle"
        // >= the sum of the column widths (1985) so the fixed Actions column
        // sits beside RTO Date rather than on top of it.
        scroll={{ x: 2050 }}
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
        locale={{ emptyText: "No RTO orders found" }}
        mobileHref={(record) => `/orders/${record.id}`}
        onRow={(record) => ({
          onClick: () => navigate(`/orders/${record.id}`),
          className: "cursor-pointer",
        })}
      />

      {/* Phase Update Modal */}
      <Modal
        title={`Update RTO Phase → ${phaseTarget?.nextPhase === "in_transit" ? "In Transit" : "Delivered"}`}
        open={!!phaseTarget}
        onCancel={() => { setPhaseTarget(null); setPhaseRemarks(""); setRtoCharges(null); }}
        onOk={handlePhaseUpdate}
        confirmLoading={updatePhase.isPending}
        okText="Update Phase"
      >
        <div className="space-y-3 py-2">
          <div className="text-sm text-muted-foreground">
            Order: <span className="font-mono font-semibold">{phaseTarget?.order?.orderId}</span> — AWB: <span className="font-mono">{phaseTarget?.order?.awb}</span>
          </div>
          <Input.TextArea
            placeholder="Remarks (optional)"
            value={phaseRemarks}
            onChange={(e) => setPhaseRemarks(e.target.value)}
            rows={2}
          />
          <InputNumber
            className="w-full"
            min={0}
            prefix="₹"
            placeholder="RTO charges to debit (optional)"
            value={rtoCharges}
            onChange={(val) => setRtoCharges(val)}
          />
          {phaseTarget?.nextPhase === "delivered" && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Package will be marked as returned to origin.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
