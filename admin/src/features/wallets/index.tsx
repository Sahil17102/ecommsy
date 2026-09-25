import { useState } from "react";
import { Link } from "react-router-dom";
import { Input, Tag, Tooltip } from "antd";
import {
  Wallet,
  IndianRupee,
  WalletCards,
  Search,
  ArrowUpDown,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import CollapsibleFilters from "@/components/common/CollapsibleFilters";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useDeferredFilters } from "@/hooks/useDeferredFilters";
import { formatCurrency } from "@/lib/utils";
import { PLAN_COLORS } from "@/lib/config";
import { useWallets } from "./queries";
import type { WalletListItem, ListWalletsParams } from "./types";
import AdjustWalletModal from "./components/AdjustWalletModal";
import TransactionsDrawer from "./components/TransactionsDrawer";

export default function WalletsPage() {
  const [params, setParams] = useState<ListWalletsParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const filters = useDeferredFilters(
    { search: "" as string },
    () => setParams((p) => ({ ...p, page: 1 })),
  );

  // Modal/drawer state
  const [adjustTarget, setAdjustTarget] = useState<{ wallet: WalletListItem; type: "credit" | "debit" } | null>(null);
  const [txnTarget, setTxnTarget] = useState<WalletListItem | null>(null);

  const { data, isLoading } = useWallets({ ...params, search: filters.applied.search || undefined });

  const wallets = data?.wallets ?? [];
  const stats = data?.stats;
  const pagination = data?.pagination;

  const columns: ResponsiveColumnsType<WalletListItem> = [
    {
      title: "User",
      key: "user",
      width: 220,
      render: (_, record) => {
        const displayName = record.userName || "—";
        const initials = displayName !== "—"
          ? displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
          : "?";
        return (
          <Link to={`/users-management/${record.userId}`} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-primary-bg flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{displayName}</div>
              <div className="text-xs text-muted truncate">{record.userEmail || record.userPhone || "—"}</div>
            </div>
          </Link>
        );
      },
    },
    {
      title: "Business",
      dataIndex: "businessName",
      key: "businessName",
      width: 160,
      mobileHidden: true,
      render: (val: string | null) => (
        <span className="text-sm text-foreground">{val || "—"}</span>
      ),
    },
    {
      title: "Plan",
      dataIndex: "plan",
      key: "plan",
      width: 100,
      mobileHidden: true,
      render: (plan: string) => (
        <Tag color={PLAN_COLORS[plan] ?? "default"} bordered={false} className="capitalize">{plan}</Tag>
      ),
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      width: 140,
      align: "right",
      sorter: true,
      render: (balance: number) => (
        <span
          className={`text-sm font-bold tabular-nums ${balance > 0 ? "text-emerald-600" : balance === 0 ? "text-muted" : "text-red-600"}`}
        >
          {formatCurrency(balance)}
        </span>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      mobileHidden: true,
      render: (_, record) => (
        <Tag color={record.isActive ? "green" : "default"} bordered={false}>
          {record.isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "actions",
      width: 120,
      align: "right",
      fixed: "right",
      mobileMenu: (_: WalletListItem) => {
        const record = _ as WalletListItem;
        return [
          {
            key: "history",
            icon: <History size={14} />,
            label: "Transaction History",
            onClick: () => setTxnTarget(record),
          },
          { key: "d1", type: "divider" as const },
          {
            key: "credit",
            icon: <ArrowUpCircle size={14} />,
            label: "Credit Wallet",
            onClick: () => setAdjustTarget({ wallet: record, type: "credit" }),
          },
          {
            key: "debit",
            icon: <ArrowDownCircle size={14} />,
            label: "Debit Wallet",
            onClick: () => setAdjustTarget({ wallet: record, type: "debit" }),
          },
        ];
      },
      render: (_, record) => (
        <div className="flex items-center justify-end gap-1">
          <Tooltip title="Transaction History">
            <button
              type="button"
              onClick={() => setTxnTarget(record)}
              className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
            >
              <History size={15} />
            </button>
          </Tooltip>
          <Tooltip title="Credit">
            <button
              type="button"
              onClick={() => setAdjustTarget({ wallet: record, type: "credit" })}
              className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-emerald-600"
            >
              <ArrowUpCircle size={15} />
            </button>
          </Tooltip>
          <Tooltip title="Debit">
            <button
              type="button"
              onClick={() => setAdjustTarget({ wallet: record, type: "debit" })}
              className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-red-500"
            >
              <ArrowDownCircle size={15} />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Wallet}
        title="Wallet Management"
        subtitle="View and manage merchant wallets"
        stats={[
          {
            icon: WalletCards,
            iconColor: "text-blue-500",
            value: stats?.totalWallets ?? 0,
            label: "total wallets",
          },
          {
            icon: IndianRupee,
            iconColor: "text-green-500",
            value: stats?.totalBalance ?? 0,
            label: "total balance (₹)",
          },
          {
            icon: ArrowUpDown,
            iconColor: "text-violet-500",
            value: stats?.walletsWithBalance ?? 0,
            label: "with balance",
          },
        ]}
        filters={
          <CollapsibleFilters
            activeCount={0}
            onApply={filters.apply}
            onClearAll={filters.clearAll}
            primary={[
              {
                key: "search",
                label: "Search",
                width: "280px",
                render: (
                  <Input
                    placeholder="Search by name, email, phone..."
                    prefix={<Search size={14} className="text-muted" />}
                    value={filters.draft.search}
                    onChange={(e) => filters.setFilter("search", e.target.value)}
                    allowClear
                    className="w-full"
                    size="middle"
                  />
                ),
              },
            ]}
          />
        }
      />

      <ResponsiveTable
        columns={columns}
        dataSource={wallets}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={{
          current: pagination?.page ?? 1,
          pageSize: pagination?.limit ?? 20,
          total: pagination?.total ?? 0,
          showTotal: (t) => `${t} wallets`,
          onChange: (p, ps) =>
            setParams((prev) => ({ ...prev, page: p, limit: ps })),
          showSizeChanger: true,
        }}
        onChange={(_p, _f, sorter: any) => {
          if (!Array.isArray(sorter) && sorter.order) {
            setParams((prev) => ({
              ...prev,
              sortBy: sorter.columnKey as ListWalletsParams["sortBy"],
              sortOrder: sorter.order === "ascend" ? "asc" : "desc",
            }));
          } else {
            setParams((prev) => ({
              ...prev,
              sortBy: "createdAt",
              sortOrder: "desc",
            }));
          }
        }}
        scroll={{ x: 900 }}
        locale={{ emptyText: "No wallets found" }}
      />

      <AdjustWalletModal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        userId={adjustTarget?.wallet.userId ?? null}
        userName={adjustTarget?.wallet.userName ?? null}
        currentBalance={adjustTarget?.wallet.balance ?? 0}
        initialType={adjustTarget?.type ?? "credit"}
      />

      <TransactionsDrawer
        open={!!txnTarget}
        onClose={() => setTxnTarget(null)}
        userId={txnTarget?.userId ?? null}
        userName={txnTarget?.userName ?? null}
      />
    </div>
  );
}
