import { motion } from "framer-motion";
import { fadeUp } from "../animations";

export function Section({
  title,
  icon,
  iconBg = "bg-primary/10 text-primary",
  children,
  delay = 0,
  headerRight,
}: {
  title: string;
  icon: React.ReactNode;
  iconBg?: string;
  children: React.ReactNode;
  delay?: number;
  headerRight?: React.ReactNode;
}) {
  return (
    <motion.div
      {...fadeUp(delay)}
      whileHover={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.06)", transition: { duration: 0.2 } }}
      className="bg-background-elevated rounded-2xl border border-border-light overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border-light/60 bg-surface-muted/20">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </motion.div>
  );
}

export function InfoRow({
  label,
  value,
  mono,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
      className="flex items-start justify-between gap-4 py-2.5 border-b border-border-light/40 last:border-0"
    >
      <span className="text-[11px] text-muted shrink-0">{label}</span>
      <span
        className={`text-[12px] font-semibold text-foreground text-right ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </motion.div>
  );
}
