import { useMemo, useState } from "react";
import { Input, Select, Switch, Tag, Tooltip } from "antd";
import { Search } from "lucide-react";
import { toast } from "sonner";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import AsyncSelect from "@/components/common/AsyncSelect";
import { CopyButton } from "@/components/common/CopyButton";
import { useUsers } from "@/features/users/queries";
import { useDebounce } from "@/hooks/useDebounce";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { DEFAULT_PAGE_SIZE } from "@/lib/config";
import { timeAgo } from "@/lib/utils";
import { useAdminEndpoints, useToggleEndpoint } from "../queries";
import { explainFailure, windowLabel } from "../config";
import type { AdminEndpoint } from "../types";

interface EndpointsTabProps {
  windowHours: number;
  onInspectEndpoint: (webhookId: string) => void;
}

const ACTIVE_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Paused" },
];

export default function EndpointsTab({ windowHours, onInspectEndpoint }: EndpointsTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sellerSearch, setSellerSearch] = useState("");

  const filters = useDeferredFilters(
    {
      search: "",
      userId: undefined as string | undefined,
      isActive: undefined as string | undefined,
    },
    () => setPage(1),
  );

  const debouncedSearch = useDebounce(filters.applied.search, 400);
  const debouncedSellerSearch = useDebounce(sellerSearch, 400);

  const { data: sellers, isFetching: sellersLoading } = useUsers({
    search: debouncedSellerSearch || undefined,
    limit: 20,
  });
  const toggleMutation = useToggleEndpoint();

  const query = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      userId: filters.applied.userId,
      isActive: filters.applied.isActive,
      hours: windowHours,
      page,
      limit: pageSize,
    }),
    [debouncedSearch, filters.applied, windowHours, page, pageSize],
  );

  const { data, isLoading } = useAdminEndpoints(query);

  const activeFilterCount = [
    filters.draft.search,
    filters.draft.userId,
    filters.draft.isActive,
  ].filter(Boolean).length;

  async function handleToggle(row: AdminEndpoint, next: boolean) {
    try {
      await toggleMutation.mutateAsync({ id: row.id, isActive: next });
      toast.success(next ? "Deliveries resumed" : "Deliveries paused");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Could not update the endpoint");
    }
  }

  const columns: ResponsiveColumnsType<AdminEndpoint> = [
    {
      title: "Seller",
      key: "seller",
      width: 190,
      mobileTitle: true,
      render: (_: unknown, r) => (
        <div className="min-w-0">
          <span className="block text-xs font-medium text-foreground truncate">
            {r.seller?.name ?? "—"}
          </span>
          {r.seller?.email && (
            <span className="block text-[10px] text-muted truncate mt-0.5">{r.seller.email}</span>
          )}
        </div>
      ),
    },
    {
      title: "Endpoint",
      key: "url",
      width: 280,
      render: (_: unknown, r) => (
        <div className="min-w-0">
          <span className="flex items-center gap-1 min-w-0">
            <Tooltip title={r.url}>
              <span className="text-[11px] font-mono text-foreground truncate">{r.url}</span>
            </Tooltip>
            <CopyButton text={r.url} title="Copy endpoint URL" />
          </span>
          {r.description && (
            <span className="block text-[10px] text-muted truncate mt-0.5">{r.description}</span>
          )}
        </div>
      ),
    },
    {
      title: `Last ${windowLabel(windowHours)}`,
      key: "stats",
      width: 210,
      render: (_: unknown, r) => {
        const quiet = r.stats.delivered + r.stats.failed + r.stats.pending === 0;
        if (quiet) return <span className="text-xs text-muted">No events</span>;
        // Counts are colour-coded, but colour alone is not a label — each pill
        // says what it counts so the column reads without a legend.
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {r.stats.delivered > 0 && (
              <Tag color="green" bordered={false} className="!m-0">
                {r.stats.delivered} sent
              </Tag>
            )}
            {r.stats.pending > 0 && (
              <Tag color="purple" bordered={false} className="!m-0">
                {r.stats.pending} retrying
              </Tag>
            )}
            {r.stats.failed > 0 && (
              <Tag color="red" bordered={false} className="!m-0">
                {r.stats.failed} failed
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Last result",
      key: "last",
      width: 230,
      render: (_: unknown, r) => {
        if (!r.stats.lastDeliveryAt) return <span className="text-xs text-muted">—</span>;
        const advice = explainFailure(r.stats.lastError, null);
        return (
          <div className="min-w-0">
            <span className="block text-xs text-foreground">
              {timeAgo(r.stats.lastDeliveryAt)}
            </span>
            {r.stats.lastError && (
              <Tooltip title={advice ?? r.stats.lastError}>
                <span className="block text-[10px] text-red-500 font-mono truncate mt-0.5">
                  {r.stats.lastError}
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "Active",
      key: "isActive",
      width: 110,
      render: (_: unknown, r) => (
        <Tooltip
          title={
            r.isActive
              ? "Pause to stop sending events without deleting the endpoint"
              : "Resume sending events to this endpoint"
          }
        >
          <span onClick={(e) => e.stopPropagation()}>
            <Switch
              size="small"
              checked={r.isActive}
              loading={toggleMutation.isPending && toggleMutation.variables?.id === r.id}
              onChange={(next) => handleToggle(r, next)}
            />
          </span>
        </Tooltip>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 100,
      fixed: "right",
      mobileActions: true,
      render: (_: unknown, r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspectEndpoint(r.id);
          }}
          className="text-[11px] font-semibold text-primary hover:underline whitespace-nowrap"
        >
          View log
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <CollapsibleFilters
        activeCount={activeFilterCount}
        onApply={filters.apply}
        onClearAll={filters.clearAll}
        extra={
          data && (
            <span className="text-xs text-muted">
              {data.pagination.total} {data.pagination.total === 1 ? "endpoint" : "endpoints"}
            </span>
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
                placeholder="URL, seller name or email..."
                value={filters.draft.search}
                onChange={(e) => filters.setFilter("search", e.target.value)}
                allowClear
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
          {
            key: "isActive",
            label: "State",
            width: "140px",
            render: (
              <Select
                allowClear
                placeholder="Any state"
                value={filters.draft.isActive}
                onChange={(val) => filters.setFilter("isActive", val || undefined)}
                options={ACTIVE_OPTIONS}
                className="w-full"
              />
            ),
          },
        ]}
      />

      <ResponsiveTable
        columns={columns}
        dataSource={data?.endpoints ?? []}
        rowKey="id"
        loading={isLoading}
        size="middle"
        scroll={{ x: 1220 }}
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
          emptyText:
            activeFilterCount > 0
              ? "No endpoints match these filters"
              : "No seller has registered a webhook endpoint yet",
        }}
      />
    </div>
  );
}
