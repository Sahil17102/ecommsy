import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tag, Input, Select, Tooltip, Button, DatePicker } from "antd";
import dayjs from "dayjs";
import {
  Package,
  Search,
  MapPin,
  Truck,
  CheckCircle2,
  PackageX,
  RotateCcw,
  IndianRupee,
  Download,
  History,
} from "lucide-react";
import ServiceProviderBadge from "@/components/common/ServiceProviderBadge";
import PageHeader from "@/components/common/PageHeader";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import { CopyButton } from "@/components/common/CopyButton";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { DEFAULT_PAGE_SIZE } from "@/lib/config";
import { useAdminOrders, useOrderExports, useStartOrderExport } from "./queries";
import ExportHistoryDrawer from "./components/ExportHistoryDrawer";
import { useUsers } from "@/features/users/queries";
import { useCouriers } from "@/features/couriers/queries";
import type { OrderListItem, OrderStatus } from "./types";
import { STATUS_CONFIG, STATUS_OPTIONS } from "./config";

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>();

  const filters = useDeferredFilters(
    { search: (searchParams.get("search") || "") as string, status: (searchParams.get("status") || undefined) as string | undefined, orderType: undefined as string | undefined, paymentType: undefined as string | undefined, courierId: undefined as string | undefined, userId: undefined as string | undefined, startDate: undefined as string | undefined, endDate: undefined as string | undefined },
    () => setPage(1),
  );
  const debouncedSearch = useDebounce(filters.applied.search);

  const { data: usersData } = useUsers({ limit: 500 });
  const userOptions = (usersData?.users ?? []).map((u) => ({
    label: u.businessName || u.name || u.email || u.phone || u.id,
    value: u.id,
  }));

  const { data: couriersData } = useCouriers({ limit: 200 });
  const courierOptions = (couriersData?.couriers ?? []).map((c) => ({
    label: c.name,
    value: c.id,
  }));

  // Every filter except pagination — shared by the table query and the export
  // so the CSV always mirrors exactly what the admin is looking at.
  const activeFilters = {
    search: debouncedSearch || undefined,
    status: filters.applied.status,
    orderType: filters.applied.orderType,
    paymentType: filters.applied.paymentType,
    courierId: filters.applied.courierId,
    userId: filters.applied.userId,
    startDate: filters.applied.startDate,
    endDate: filters.applied.endDate,
    sortField,
    sortOrder,
  };

  const { data, isLoading } = useAdminOrders({
    ...activeFilters,
    page,
    limit: pageSize,
    expand: ["user"],
  });

  const orders = data?.orders ?? [];
  const pagination = data?.pagination;
  const stats = data?.stats;

  const [historyOpen, setHistoryOpen] = useState(false);
  const startExport = useStartOrderExport();
  // Poll in the background so the toolbar can show a live "building" pill even
  // while the drawer is shut.
  const { data: exportsData } = useOrderExports(true, { limit: 20 });
  const activeExports = (exportsData?.jobs ?? []).filter(
    (j) => j.status === "queued" || j.status === "processing",
  ).length;

  /**
   * Queue a server-side export of every order matching the active filters —
   * not just the page on screen. The request returns immediately; the file is
   * built in the background and shows up in the history panel, which is what
   * keeps a large export from dying on the gateway timeout.
   */
  function handleExportCsv() {
    startExport.mutate(activeFilters, { onSuccess: () => setHistoryOpen(true) });
  }

  const columns: ResponsiveColumnsType<OrderListItem> = [
    {
      title: "Order",
      key: "order",
      width: 200,
      render: (_, record) => {
        const user = record.user;
        const displayName = user?.businessName || user?.name || user?.email || user?.phone || "—";
        return (
          <div className="min-w-0">
            <span className="text-sm font-semibold text-foreground block truncate">
              {record.orderId}
            </span>
            <span className="text-xs text-muted truncate block mt-0.5">
              {displayName}
            </span>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: OrderStatus) => {
        const config = STATUS_CONFIG[status];
        return (
          <Tag color={config.color} bordered={false}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: "Type",
      key: "type",
      width: 100,
      render: (_, record) => (
        <div className="flex flex-wrap gap-1">
          <Tag bordered={false} color={record.orderType === "B2B" ? "geekblue" : "purple"}>
            {record.orderType}
          </Tag>
          <Tag bordered={false} color={record.paymentType === "cod" ? "orange" : "green"} className="!text-[10px]">
            {record.paymentType.toUpperCase()}
          </Tag>
        </div>
      ),
    },
    {
      title: "Destination",
      key: "destination",
      width: 160,
      render: (_, record) => (
        <span className="text-sm text-foreground flex items-center gap-1.5">
          <MapPin size={13} className="text-muted shrink-0" />
          <span className="truncate">
            {record.deliveryAddress.city}, {record.deliveryAddress.state}
          </span>
        </span>
      ),
    },
    {
      title: "Courier",
      key: "serviceProvider",
      width: 180,
      render: (_, record) => (
        <div className="min-w-0">
          <ServiceProviderBadge
            slug={record.serviceProvider}
            label={record.courierName || record.serviceProvider}
          />
          {record.courierName && (
            <span className="block text-[10px] text-muted truncate mt-0.5">
              {record.serviceProvider}
            </span>
          )}
        </div>
      ),
    },
    {
      title: "AWB",
      dataIndex: "awb",
      key: "awb",
      width: 160,
      render: (awb: string) =>
        awb ? (
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono text-foreground">{awb}</span>
            <CopyButton text={awb} title="Copy AWB" />
          </div>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      title: "Charge",
      key: "charge",
      width: 100,
      align: "right",
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_, record) => (
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {formatCurrency(record.rate?.totalCharge)}
        </span>
      ),
    },
    {
      title: "Created",
      key: "createdAt",
      width: 150,
      sorter: true,
      sortDirections: ["descend", "ascend"] as const,
      render: (_, record) => (
        <Tooltip title={record.createdAt}>
          <span className="text-sm text-muted">{formatDate(record.createdAt)}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Package}
        title="Orders"
        subtitle="View and manage all orders across users"
        stats={
          stats
            ? [
                { icon: Package, iconColor: "text-indigo-500", value: stats.total, label: "total" },
                { icon: Truck, iconColor: "text-blue-500", value: stats.shipped + stats.in_transit + stats.out_for_delivery, label: "in transit" },
                { icon: CheckCircle2, iconColor: "text-emerald-500", value: stats.delivered, label: "delivered" },
                { icon: PackageX, iconColor: "text-red-400", value: stats.cancelled, label: "cancelled" },
                { icon: RotateCcw, iconColor: "text-purple-500", value: stats.rto_initiated + stats.rto_delivered, label: "RTO" },
                { icon: IndianRupee, iconColor: "text-emerald-600", value: Math.round(stats.totalRevenue), label: "revenue" },
              ]
            : undefined
        }
        filters={
          <CollapsibleFilters
            activeCount={[filters.draft.status, filters.draft.orderType, filters.draft.paymentType, filters.draft.courierId, filters.draft.userId, filters.draft.startDate || filters.draft.endDate].filter(Boolean).length}
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
                    placeholder="Order ID, AWB, name, city..."
                    value={filters.draft.search}
                    onChange={(e) => filters.setFilter("search", e.target.value)}
                    allowClear
                    className="w-full"
                    size="middle"
                  />
                ),
              },
              {
                key: "status",
                label: "Status",
                width: "160px",
                render: (
                  <Select
                    allowClear
                    placeholder="All statuses"
                    value={filters.draft.status}
                    onChange={(val) => filters.setFilter("status", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={STATUS_OPTIONS}
                  />
                ),
              },
            ]}
            secondary={[
              {
                key: "dateRange",
                label: "Order Date",
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
                    size="middle"
                    format="DD MMM YYYY"
                  />
                ),
              },
              {
                key: "userId",
                label: "User",
                width: "200px",
                render: (
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="All users"
                    value={filters.draft.userId}
                    onChange={(val) => filters.setFilter("userId", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={userOptions}
                  />
                ),
              },
              {
                key: "courierId",
                label: "Courier",
                width: "220px",
                render: (
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="All couriers"
                    value={filters.draft.courierId}
                    onChange={(val) => filters.setFilter("courierId", val || undefined)}
                    className="w-full"
                    size="middle"
                    options={courierOptions}
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
                    size="middle"
                    options={[
                      { label: "B2B", value: "B2B" },
                      { label: "B2C", value: "B2C" },
                    ]}
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
                    size="middle"
                    options={[
                      { label: "Prepaid", value: "prepaid" },
                      { label: "COD", value: "cod" },
                    ]}
                  />
                ),
              },
            ]}
            extra={
              <div className="flex items-center gap-2 sm:gap-3">
                {pagination && (
                  <span className="text-xs text-muted whitespace-nowrap">
                    {pagination.total} order{pagination.total !== 1 ? "s" : ""}
                  </span>
                )}
                <Tooltip title="Export history">
                  <Button
                    onClick={() => setHistoryOpen(true)}
                    variant="outlined"
                    icon={<History size={13} />}
                  >
                    {activeExports > 0 ? `${activeExports} building…` : undefined}
                  </Button>
                </Tooltip>
                <Button
                  onClick={handleExportCsv}
                  disabled={!orders.length}
                  loading={startExport.isPending}
                  variant="outlined"
                  size="small"
                  className="sm:!hidden"
                  icon={<Download size={13} />}
                />
                <Button
                  onClick={handleExportCsv}
                  disabled={!orders.length}
                  loading={startExport.isPending}
                  variant="outlined"
                  className="!hidden sm:!inline-flex"
                >
                  {!startExport.isPending && <Download size={13} />}
                  Export CSV
                </Button>
              </div>
            }
          />
        }
      />

      <ResponsiveTable
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={isLoading}
        size="middle"
        onChange={(_p, _f, sorter) => {
          if (!Array.isArray(sorter) && sorter.order) {
            const fieldMap: Record<string, string> = { charge: "rate.totalCharge", createdAt: "createdAt" };
            setSortField(fieldMap[sorter.columnKey as string] ?? "createdAt");
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
              }
            : false
        }
        locale={{ emptyText: "No orders found" }}
        scroll={{ x: 1100 }}
        mobileHref={(record) => `/orders/${record.id}`}
        onRow={(record) => ({
          onClick: () => navigate(`/orders/${record.id}`),
          className: "cursor-pointer",
        })}
      />

      <ExportHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}
