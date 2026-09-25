import { useMemo, useState } from "react";
import { DatePicker, Input, Select, Tag, Tooltip } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import AsyncSelect from "@/components/common/AsyncSelect";
import { CopyButton } from "@/components/common/CopyButton";
import { useUsers } from "@/features/users/queries";
import { useDebounce } from "@/hooks/useDebounce";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { DEFAULT_PAGE_SIZE } from "@/lib/config";
import { timeAgo, formatDateTime } from "@/lib/utils";
import { useAdminDeliveries, useAdminRedeliver, useWebhookEventCatalogue } from "../queries";
import { MAX_ATTEMPTS, STATUS_META, STATUS_OPTIONS, eventLabel } from "../config";
import type { AdminDeliveryRow, DeliveryStatus } from "../types";

const { RangePicker } = DatePicker;

interface DeliveriesTabProps {
  /** Set when the health panel drilled into one endpoint. */
  webhookId?: string;
  onClearEndpointFilter: () => void;
  onOpenDelivery: (id: string) => void;
}

export default function DeliveriesTab({
  webhookId,
  onClearEndpointFilter,
  onOpenDelivery,
}: DeliveriesTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sellerSearch, setSellerSearch] = useState("");

  const filters = useDeferredFilters(
    {
      search: "",
      status: undefined as string | undefined,
      event: undefined as string | undefined,
      userId: undefined as string | undefined,
      range: undefined as [Dayjs, Dayjs] | undefined,
    },
    () => setPage(1),
  );

  const debouncedSearch = useDebounce(filters.applied.search, 400);
  const debouncedSellerSearch = useDebounce(sellerSearch, 400);

  const { data: catalogue } = useWebhookEventCatalogue();
  const { data: sellers, isFetching: sellersLoading } = useUsers({
    search: debouncedSellerSearch || undefined,
    limit: 20,
  });
  const redeliverMutation = useAdminRedeliver();

  const query = useMemo(
    () => ({
      webhookId,
      search: debouncedSearch || undefined,
      status: filters.applied.status,
      event: filters.applied.event,
      userId: filters.applied.userId,
      from: filters.applied.range?.[0]?.startOf("day").toISOString(),
      to: filters.applied.range?.[1]?.endOf("day").toISOString(),
      page,
      limit: pageSize,
    }),
    [webhookId, debouncedSearch, filters.applied, page, pageSize],
  );

  const { data, isLoading } = useAdminDeliveries(query);

  const activeFilterCount = [
    filters.draft.search,
    filters.draft.status,
    filters.draft.event,
    filters.draft.userId,
    filters.draft.range,
  ].filter(Boolean).length;

  async function handleRedeliver(row: AdminDeliveryRow) {
    try {
      await redeliverMutation.mutateAsync(row.id);
      toast.success("Redelivery queued");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Could not queue a redelivery");
    }
  }

  const columns: ResponsiveColumnsType<AdminDeliveryRow> = [
    {
      title: "When",
      key: "createdAt",
      width: 140,
      mobileTitle: true,
      render: (_: unknown, r) => (
        <Tooltip title={formatDateTime(r.createdAt)}>
          <span className="text-xs text-foreground whitespace-nowrap">{timeAgo(r.createdAt)}</span>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: (_: unknown, r) => {
        const meta = STATUS_META[r.status as DeliveryStatus];
        return (
          <Tooltip title={meta?.hint}>
            <Tag color={meta?.color} bordered={false}>
              {meta?.label ?? r.status}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Seller",
      key: "seller",
      width: 180,
      render: (_: unknown, r) => (
        <div className="min-w-0">
          <span className="block text-xs text-foreground truncate">
            {r.seller?.name ?? "—"}
          </span>
          {r.seller?.email && (
            <span className="block text-[10px] text-muted truncate mt-0.5">{r.seller.email}</span>
          )}
        </div>
      ),
    },
    {
      title: "Event",
      key: "event",
      width: 175,
      render: (_: unknown, r) => (
        <div className="min-w-0">
          <span className="block text-xs font-medium text-foreground truncate">
            {eventLabel(r.event)}
          </span>
          <span className="block text-[10px] text-muted font-mono truncate mt-0.5">{r.event}</span>
        </div>
      ),
    },
    {
      title: "Shipment",
      key: "shipment",
      width: 160,
      render: (_: unknown, r) =>
        r.orderId || r.awb ? (
          <div className="min-w-0">
            {r.orderId && (
              <span className="flex items-center gap-1 min-w-0">
                <span className="text-xs font-mono text-foreground truncate">{r.orderId}</span>
                <CopyButton text={r.orderId} title="Copy order ID" />
              </span>
            )}
            {r.awb && (
              <span className="block text-[10px] text-muted font-mono truncate mt-0.5">
                {r.awb}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      title: "Endpoint",
      key: "url",
      width: 240,
      render: (_: unknown, r) => (
        <Tooltip title={r.url}>
          <span className="text-[11px] text-muted font-mono truncate block">{r.url}</span>
        </Tooltip>
      ),
    },
    {
      title: "Result",
      key: "result",
      width: 190,
      render: (_: unknown, r) => (
        <div className="min-w-0">
          <span className="block text-xs text-foreground">
            {r.responseStatus != null ? `HTTP ${r.responseStatus}` : "No response"}
            <span className="text-muted"> · {r.attempts}/{MAX_ATTEMPTS} tries</span>
          </span>
          {r.error && (
            <Tooltip title={r.error}>
              <span className="block text-[10px] text-red-500 font-mono truncate mt-0.5">
                {r.error}
              </span>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 100,
      fixed: "right",
      mobileActions: true,
      render: (_: unknown, r) =>
        r.status === "success" ? null : (
          <Tooltip title="Send this event again">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRedeliver(r);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <RefreshCw size={12} />
              Resend
            </button>
          </Tooltip>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      {webhookId && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-bg px-4 py-2.5">
          <span className="text-xs text-foreground">
            Showing one endpoint only.
          </span>
          <button
            type="button"
            onClick={onClearEndpointFilter}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Show all endpoints
          </button>
        </div>
      )}

      <CollapsibleFilters
        activeCount={activeFilterCount}
        onApply={filters.apply}
        onClearAll={filters.clearAll}
        extra={
          data && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag color="green" bordered={false}>{data.stats.delivered} delivered</Tag>
              <Tag color="purple" bordered={false}>
                {data.stats.pending + data.stats.retrying} retrying
              </Tag>
              <Tag color="red" bordered={false}>{data.stats.failed} failed</Tag>
            </div>
          )
        }
        primary={[
          {
            key: "search",
            label: "Search",
            width: "260px",
            render: (
              <Input
                prefix={<Search size={14} className="text-muted" />}
                placeholder="Order ID, AWB, URL, error, event ID..."
                value={filters.draft.search}
                onChange={(e) => filters.setFilter("search", e.target.value)}
                allowClear
                className="w-full"
              />
            ),
          },
          {
            key: "status",
            label: "Status",
            width: "150px",
            render: (
              <Select
                allowClear
                placeholder="Any status"
                value={filters.draft.status}
                onChange={(val) => filters.setFilter("status", val || undefined)}
                options={STATUS_OPTIONS}
                className="w-full"
              />
            ),
          },
          {
            key: "userId",
            label: "Seller",
            width: "220px",
            render: (
              <AsyncSelect
                allowClear
                placeholder="Any seller"
                value={filters.draft.userId}
                onAsyncSearch={setSellerSearch}
                loading={sellersLoading}
                onChange={(val) => filters.setFilter("userId", (val as string) || undefined)}
                options={(sellers?.users ?? []).map((u) => ({
                  value: u.id,
                  label: u.businessName || u.name || u.email || u.id,
                }))}
                className="w-full"
              />
            ),
          },
        ]}
        secondary={[
          {
            key: "event",
            label: "Event",
            width: "220px",
            render: (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Any event"
                value={filters.draft.event}
                onChange={(val) => filters.setFilter("event", val || undefined)}
                options={(catalogue ?? []).map((e) => ({
                  value: e.event,
                  label: `${eventLabel(e.event)} — ${e.event}`,
                }))}
                className="w-full"
              />
            ),
          },
          {
            key: "range",
            label: "Sent between",
            width: "260px",
            render: (
              <RangePicker
                value={filters.draft.range}
                onChange={(val) => filters.setFilter("range", (val as [Dayjs, Dayjs]) || undefined)}
                disabledDate={(current) => current && current > dayjs().endOf("day")}
                className="w-full"
              />
            ),
          },
        ]}
      />

      <ResponsiveTable
        columns={columns}
        dataSource={data?.deliveries ?? []}
        rowKey="id"
        loading={isLoading}
        size="middle"
        scroll={{ x: 1305 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.pagination.total ?? 0,
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
        locale={{
          emptyText: activeFilterCount > 0 || webhookId
            ? "No deliveries match these filters"
            : "No webhooks have been dispatched yet",
        }}
        onRow={(record) => ({
          onClick: () => onOpenDelivery(record.id),
          className: "cursor-pointer",
        })}
      />
    </div>
  );
}
