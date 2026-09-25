import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BalanceCardProps {
  balance: number | undefined;
  isLoading: boolean;
}

export function BalanceCard({ balance, isLoading }: BalanceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="lg:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5 text-white/80" />
          <span className="text-sm font-medium text-white/80">Wallet Balance</span>
        </div>
        <p className="text-3xl font-bold mt-2">
          {isLoading ? "..." : balance != null ? formatCurrency(balance) : "₹0.00"}
        </p>
        <p className="text-xs text-white/60 mt-2">
          Use your wallet balance to pay for shipments
        </p>
      </div>
    </motion.div>
  );
}
