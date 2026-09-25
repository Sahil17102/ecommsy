import { useState } from "react";
import { Spin, Empty, Tag, Tooltip } from "antd";
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { walletsApi } from "../api";
import { WALLETS_KEY } from "../queries";
import { formatCurrency } from "@/lib/utils";
import AdjustWalletModal from "./AdjustWalletModal";
import TransactionsDrawer from "./TransactionsDrawer";

interface WalletPanelProps {
  userId: string;
  userName: string;
}

export function WalletPanel({ userId, userName }: WalletPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: [...WALLETS_KEY, "user", userId],
    queryFn: () => walletsApi.getByUserId(userId),
    enabled: !!userId,
  });

  const [adjustType, setAdjustType] = useState<"credit" | "debit" | null>(null);
  const [showTxns, setShowTxns] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin />
      </div>
    );
  }

  const wallet = data?.wallet;

  if (!wallet) {
    return (
      <div className="py-12">
        <Empty description="No wallet found for this user" />
      </div>
    );
  }

  const balance = wallet.balance ?? 0;

  return (
    <div className="space-y-4 pt-1">
      {/* Balance card */}
      <div className="bg-background-elevated border border-border-light rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-bg flex items-center justify-center">
              <Wallet size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Wallet Balance</p>
              <p
                className={`text-xl font-bold tabular-nums ${
                  balance > 0
                    ? "text-emerald-600"
                    : balance === 0
                      ? "text-muted"
                      : "text-red-600"
                }`}
              >
                {formatCurrency(balance)}
              </p>
            </div>
            <Tag
              bordered={false}
              className="!text-[10px] uppercase self-start mt-0.5"
            >
              {wallet.currency || "INR"}
            </Tag>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Tooltip title="Transaction History">
              <button
                type="button"
                onClick={() => setShowTxns(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-light text-sm font-medium text-muted hover:text-foreground hover:border-border transition-colors"
              >
                <History size={15} />
                <span className="hidden sm:inline">History</span>
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={() => setAdjustType("credit")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <ArrowUpCircle size={15} />
              Credit
            </button>
            <button
              type="button"
              onClick={() => setAdjustType("debit")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <ArrowDownCircle size={15} />
              Debit
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AdjustWalletModal
        open={!!adjustType}
        onClose={() => setAdjustType(null)}
        userId={userId}
        userName={userName}
        currentBalance={balance}
        initialType={adjustType ?? "credit"}
      />

      <TransactionsDrawer
        open={showTxns}
        onClose={() => setShowTxns(false)}
        userId={userId}
        userName={userName}
      />
    </div>
  );
}
