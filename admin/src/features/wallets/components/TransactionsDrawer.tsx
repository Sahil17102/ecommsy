import { useState } from "react";
import { Drawer, Tag, Select, DatePicker } from "antd";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useWalletTransactions } from "../queries";
import type { WalletTransaction } from "../types";
import dayjs from "dayjs";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string | null;
}

export default function TransactionsDrawer({
  open,
  onClose,
  userId,
  userName,
}: Props) {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<"credit" | "debit" | undefined>();
  const [dateRange, setDateRange] = useState<[string?, string?]>([]);

  const { data, isLoading } = useWalletTransactions({
    userId: userId ?? "",
    type,
    dateFrom: dateRange[0],
    dateTo: dateRange[1],
    page,
    limit: 15,
  });

  const columns: ResponsiveColumnsType<WalletTransaction> = [
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (val: string) => (
        <span className="text-xs text-muted">
          {dayjs(val).format("DD MMM YYYY, hh:mm A")}
        </span>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 80,
      render: (t: string) => (
        <Tag color={t === "credit" ? "green" : "red"}>
          {t === "credit" ? "+ Credit" : "− Debit"}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      align: "right",
      render: (amt: number, record) => (
        <span
          className={`text-sm font-medium ${record.type === "credit" ? "text-green-600" : "text-red-600"}`}
        >
          {record.type === "credit" ? "+" : "−"}₹
          {amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (reason: string) => (
        <span className="text-sm text-foreground">{reason}</span>
      ),
    },
    {
      title: "Ref",
      dataIndex: "ref",
      key: "ref",
      width: 140,
      render: (ref: string) =>
        ref ? (
          <span className="text-xs text-muted font-mono">{ref}</span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
  ];

  return (
    <Drawer
      title={`Transactions — ${userName ?? "User"}`}
      open={open}
      onClose={onClose}
      width={800}
      destroyOnClose
    >
      <div className="flex items-center gap-3 mb-4">
        <Select
          placeholder="All types"
          allowClear
          style={{ width: 140 }}
          value={type}
          onChange={(val) => {
            setType(val);
            setPage(1);
          }}
          options={[
            { label: "Credit", value: "credit" },
            { label: "Debit", value: "debit" },
          ]}
        />
        <DatePicker.RangePicker
          onChange={(dates) => {
            setDateRange([
              dates?.[0]?.toISOString(),
              dates?.[1]?.toISOString(),
            ]);
            setPage(1);
          }}
        />
      </div>

      <ResponsiveTable
        columns={columns}
        dataSource={data?.transactions ?? []}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{
          current: page,
          pageSize: 15,
          total: data?.pagination.total ?? 0,
          showTotal: (t: number) => `${t} transactions`,
          onChange: setPage,
          showSizeChanger: false,
        }}
        scroll={{ x: 700 }}
      />
    </Drawer>
  );
}
