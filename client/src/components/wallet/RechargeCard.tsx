import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

interface RechargeCardProps {
  amount: string;
  onAmountChange: (value: string) => void;
  onRecharge: () => void;
  isProcessing: boolean;
}

export function RechargeCard({ amount, onAmountChange, onRecharge, isProcessing }: RechargeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="lg:col-span-3 bg-background-elevated rounded-2xl border border-border-light p-6 border-t-2 border-t-accent/40"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center">
          <Plus className="w-3.5 h-3.5 text-accent" />
        </div>
        Recharge Wallet
      </h3>

      {/* Quick amount buttons */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {QUICK_AMOUNTS.map((qa) => (
          <button
            key={qa}
            onClick={() => onAmountChange(String(qa))}
            className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
              amount === String(qa)
                ? "bg-accent/10 border-accent/50 text-accent-hover"
                : "bg-background border-border-light text-foreground hover:border-accent/30"
            }`}
          >
            {formatCurrency(qa).replace(".00", "")}
          </button>
        ))}
      </div>

      {/* Custom amount input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-accent text-sm font-medium">₹</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="Enter amount"
            min={100}
            max={500000}
            className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-border-light bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          />
        </div>
        <button
          onClick={onRecharge}
          disabled={isProcessing || !amount || Number(amount) < 100}
          className="px-6 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0"
        >
          {isProcessing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Money
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-muted mt-3">
        Min ₹100 &bull; Max ₹5,00,000 &bull; Powered by Razorpay
      </p>
    </motion.div>
  );
}
