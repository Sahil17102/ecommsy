import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

export function ChargeBar({
  label,
  value,
  total,
  barClass,
  textClass = "text-foreground",
  show,
}: {
  label: string;
  value: number;
  total: number;
  barClass: string;
  textClass?: string;
  show?: boolean;
}) {
  if (!show && value === 0) return null;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const barPct = total > 0 ? Math.max((value / total) * 100, 3) : 0;

  return (
    <div className="relative bg-background rounded-xl border border-border-light/70 p-3 sm:p-3.5 overflow-hidden">
      {/* colored top accent */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${barClass}`} />
      <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1.5 sm:mb-2">{label}</p>
      <p className={`text-base sm:text-[20px] font-bold tabular-nums leading-none mb-2 sm:mb-3 ${textClass}`}>
        {formatCurrency(value)}
      </p>
      <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${barPct}%` }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
      <p className="text-[9px] font-semibold text-tertiary tabular-nums mt-1.5">{pct}% of total</p>
    </div>
  );
}
