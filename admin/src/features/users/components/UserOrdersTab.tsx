import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Tooltip, Input } from "antd";
import { Search, MapPin } from "lucide-react";
import ResponsiveTable, {
  type ResponsiveColumnsType,
} from "@/components/common/ResponsiveTable";
import { CopyButton } from "@/components/common/CopyButton";
import { formatCurrency, formatDate, formatDateTime, formatKeyword } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useAdminOrders } from "@/features/orders/queries";
import { STATUS_CONFIG } from "@/features/orders/config";
import { SERVICE_PROVIDER_VARIANTS } from "@/lib/constants";
import type { OrderListItem } from "@/features/orders/types";

interface UserOrdersTabProps {
  userId: string;
}

export function UserOrdersTab({ userId }: UserOrdersTabProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const { data, isLoading } = useAdminOrders({
    userId,
    search: debouncedSearch || undefined,
    page,
    limit: 10,
  });

  const orders = data?.orders ?? [];
  const pagination = data?.pagination;

  const columns: ResponsiveColumnsType<OrderListItem> = [
    {
      title: "Order",
      key: "order",
      width: 160,
      mobileTitle: true,
      render: (_, record) => (
        <div>
          <span className="text-sm font-medium text-foreground">
            {record.orderId}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Tag
              bordered={false}
              className="!text-[10px] !px-1.5 !m-0"
              color={record.orderType === "B2C" ? "purple" : "blue"}
            >
              {record.orderType}
            </Tag>
            <Tag
              bordered={false}
              className="!text-[10px] !px-1.5 !m-0"
              color={record.paymentType === "cod" ? "gold" : "green"}
            >
              {record.paymentType === "cod" ? "COD" : "Prepaid"}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 130,
      render: (_, record) => {
        const cfg = STATUS_CONFIG[record.status];
        return (
          <Tag color={cfg?.color ?? "default"} bordered={false} className="!text-xs">
            {cfg?.label ?? record.status}
          </Tag>
        );
      },
    },
    {
      title: "Destination",
      key: "destination",
      width: 160,
      render: (_, record) => (
        <span className="text-sm text-foreground flex items-center gap-1.5">
          <MapPin size={12} className="text-muted shrink-0" />
          <span className="truncate">
            {record.deliveryAddress.city}, {record.deliveryAddress.state}
          </span>
        </span>
      ),
    },
    {
      title: "Provider",
      key: "provider",
      width: 120,
      render: (_, record) => {
        const variant = SERVICE_PROVIDER_VARIANTS[record.serviceProvider];
        return variant ? (
          <Tag color={variant.color} bordered={false} className="!text-xs">
            {variant.label}
          </Tag>
        ) : (
          <span className="text-sm text-muted">
            {formatKeyword(record.serviceProvider)}
          </span>
        );
      },
    },
    {
      title: "AWB",
      key: "awb",
      width: 140,
      render: (_, record) =>
        record.awb ? (
          <div className="flex items-center gap-1.5">
            <code className="text-xs px-1.5 py-0.5 rounded bg-surface-muted font-mono truncate max-w-[100px]">
              {record.awb}
            </code>
            <CopyButton text={record.awb} title="Copy AWB" />
          </div>
        ) : (
          <span className="text-sm text-muted/40">—</span>
        ),
    },
    {
      title: "Charge",
      key: "charge",
      width: 100,
      render: (_, record) => (
        <span className="text-sm font-medium text-foreground">
          {formatCurrency(record.rate?.totalCharge ?? 0)}
        </span>
      ),
    },
    {
      title: "Date",
      key: "createdAt",
      width: 110,
      render: (_, record) => (
        <Tooltip title={formatDateTime(record.createdAt)}>
          <span className="text-sm text-muted">{formatDate(record.createdAt)}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="space-y-3 pt-1">

      {/* Search */}
      <Input
        prefix={<Search size={14} className="text-muted" />}
        placeholder="Search by Order ID, AWB, city..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        allowClear
        className="max-w-xs"
        size="middle"
      />

      {/* Table */}
      <ResponsiveTable
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={
          pagination && pagination.totalPages > 1
            ? {
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                onChange: setPage,
                showSizeChanger: false,
              }
            : false
        }
        locale={{ emptyText: "No orders found for this user" }}
        scroll={{ x: 800 }}
        onRow={(record) => ({
          style: { cursor: "pointer" },
          onClick: () => navigate(`/orders/${record.id}`),
        })}
      />
    </div>
  );
}
