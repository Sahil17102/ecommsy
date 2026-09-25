import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import type { WalletTransactionStats } from "@/lib/walletApi";
import { formatCurrency } from "@/lib/utils";

function StatCard({
  icon,
  iconBg,
  label,
  value,
  index,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="flex items-center gap-3 p-4 rounded-xl border border-border-light bg-background-elevated"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted">{label}</p>
        <p className="text-base font-bold text-foreground truncate">{value}</p>
      </div>
    </motion.div>
  );
}

interface WalletStatCardsProps {
  balance: number | undefined;
  balanceLoading: boolean;
  stats: WalletTransactionStats | undefined;
}

export function WalletStatCards({ balance, balanceLoading, stats }: WalletStatCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      <StatCard
        index={0}
        icon={<Wallet size={20} className="text-primary" />}
        iconBg="bg-primary/10"
        label="Available Balance"
        value={balanceLoading ? "—" : formatCurrency(balance ?? 0)}
      />
      <StatCard
        index={1}
        icon={<TrendingUp size={20} className="text-emerald-600" />}
        iconBg="bg-emerald-500/10"
        label="Total Credits"
        value={formatCurrency(stats?.totalCredits ?? 0)}
      />
      <StatCard
        index={2}
        icon={<TrendingDown size={20} className="text-red-500" />}
        iconBg="bg-red-500/10"
        label="Total Debits"
        value={formatCurrency(stats?.totalDebits ?? 0)}
      />
    </div>
  );
}
