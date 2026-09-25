import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import type { WalletTransaction } from "@/lib/walletApi";
import { formatCurrency, formatDate, formatTime, humanize } from "@/lib/utils";
import { TxnTypeIcon, TxnTypeBadge } from "./TransactionColumns";

interface MobileTransactionCardProps {
  record: WalletTransaction;
  index: number;
}

export function MobileTransactionCard({ record, index }: MobileTransactionCardProps) {
  const isCredit = record.type === "credit";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="rounded-xl border border-border-light bg-background-elevated p-3.5"
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <TxnTypeIcon type={record.type} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">
              {humanize(record.reason)}
            </p>
            <TxnTypeBadge type={record.type} size="sm" />
          </div>
        </div>
        <p
          className={`text-sm font-bold tabular-nums shrink-0 ${
            isCredit ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {isCredit ? "+" : "-"}
          {formatCurrency(record.amount)}
        </p>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-border-light/60">
        <span className="flex items-center gap-1 text-[11px] text-muted">
          <Calendar size={12} className="text-tertiary" />
          {formatDate(record.createdAt)} {formatTime(record.createdAt)}
        </span>
        {record.ref && (
          <span className="text-[11px] text-muted font-mono truncate max-w-[120px]">
            {record.ref}
          </span>
        )}
      </div>
    </motion.div>
  );
}
