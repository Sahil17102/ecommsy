import { motion } from "framer-motion";
import { scaleIn } from "../animations";

export function StatChip({
  icon,
  label,
  value,
  iconBg,
  iconColor,
  borderColor,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  borderColor?: string;
  delay?: number;
}) {
  return (
    <motion.div
      {...scaleIn(delay)}
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 400, damping: 22 } }}
      className={`flex items-center gap-3 sm:gap-4 rounded-2xl border bg-background-elevated px-3 py-3 sm:px-5 sm:py-4 ${
        borderColor ?? "border-border-light"
      }`}
    >
      <div
        className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
          iconBg ?? "bg-surface-muted"
        } ${iconColor ?? "text-tertiary"}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-base sm:text-[22px] font-bold leading-none tabular-nums text-foreground">
          {value}
        </p>
        <p className="text-[9px] font-bold mt-1 sm:mt-1.5 uppercase tracking-widest text-muted">
          {label}
        </p>
      </div>
    </motion.div>
  );
}
