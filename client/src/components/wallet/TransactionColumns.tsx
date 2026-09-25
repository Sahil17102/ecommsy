import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { ResponsiveColumnsType } from "@/components/common";
import type { WalletTransaction } from "@/lib/walletApi";
import { formatCurrency, formatDate, formatTime, humanize } from "@/lib/utils";

// ── Shared sub-components ──

export function TxnTypeIcon({ type }: { type: "credit" | "debit" }) {
  const isCredit = type === "credit";
  return (
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isCredit ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
      }`}
    >
      {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
    </div>
  );
}

export function TxnTypeBadge({ type, size = "md" }: { type: "credit" | "debit"; size?: "sm" | "md" }) {
  const isCredit = type === "credit";
  const sizeClasses = size === "sm"
    ? "px-1.5 py-0.5 text-[9px] gap-1"
    : "px-2 py-0.5 text-[10px] gap-1";
  const dotSize = size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5";

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${sizeClasses} ${
        isCredit
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          : "bg-red-500/10 text-red-500 border-red-500/20"
      }`}
    >
      <span className={`${dotSize} rounded-full bg-current opacity-70`} />
      {isCredit ? "Credit" : "Debit"}
    </span>
  );
}

export function TxnAmount({ type, amount }: { type: "credit" | "debit"; amount: number }) {
  const isCredit = type === "credit";
  return (
    <p className={`text-sm font-bold tabular-nums ${isCredit ? "text-emerald-600" : "text-red-500"}`}>
      {isCredit ? "+" : "-"}
      {formatCurrency(amount)}
    </p>
  );
}

// ── Column definitions ──

export const transactionColumns: ResponsiveColumnsType<WalletTransaction> = [
  {
    title: "Transaction",
    key: "reason",
    dataIndex: "reason",
    mobileTitle: true,
    render: (_: unknown, record: WalletTransaction) => (
      <div className="flex items-center gap-2.5">
        <TxnTypeIcon type={record.type} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {humanize(record.reason)}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {record.ref ? `Ref: ${record.ref}` : record.id.slice(-8).toUpperCase()}
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Date",
    key: "createdAt",
    dataIndex: "createdAt",
    width: 140,
    sorter: true,
    sortDirections: ["descend", "ascend"] as const,
    render: (val: string) => (
      <div>
        <p className="text-xs font-medium text-foreground">{formatDate(val)}</p>
        <p className="text-[11px] text-muted">{formatTime(val)}</p>
      </div>
    ),
  },
  {
    title: "Type",
    key: "type",
    dataIndex: "type",
    width: 100,
    render: (val: string) => <TxnTypeBadge type={val as "credit" | "debit"} />,
  },
  {
    title: "Amount",
    key: "amount",
    dataIndex: "amount",
    width: 130,
    align: "right" as const,
    mobileActions: true,
    sorter: true,
    sortDirections: ["descend", "ascend"] as const,
    render: (_: unknown, record: WalletTransaction) => (
      <TxnAmount type={record.type} amount={record.amount} />
    ),
  },
];
