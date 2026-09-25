import { memo, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/* ── Exported types ── */

export interface PageHeaderStat {
  /** Lucide icon displayed beside the value */
  icon: LucideIcon;
  /** Tailwind color class for the icon, e.g. "text-emerald-500" */
  iconColor: string;
  /** Numeric value — animated from 0 on mount, re-animated on change */
  value: number;
  /** Label shown after the number, e.g. "total", "active" */
  label: string;
}

export interface PageHeaderProps {
  /** Lucide icon rendered inside the badge */
  icon: LucideIcon;
  /** Page title */
  title: string;
  /** Subtitle / description below the title */
  subtitle: string;
  /** Inline stat pills to the right of the title row */
  stats?: PageHeaderStat[];
  /** Wrap in an elevated card. @default true */
  card?: boolean;
  /**
   * Size variant.
   * - `"compact"`: 36px badge, text-base title, text-xs subtitle
   * - `"default"`: 40px badge, text-lg title, text-sm subtitle
   * @default "compact"
   */
  size?: "compact" | "default";
  /** Content rendered to the right of the title row (e.g. a primary action button) */
  titleExtra?: ReactNode;
  /** Filter row content below a thin divider */
  filters?: ReactNode;
  /** Right-aligned content in the filter row (result count, action buttons) */
  filtersExtra?: ReactNode;
}

/* ── Animation variants ── */

const STAGGER = 0.06;

const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: STAGGER,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const filterRowVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut", delay: 0.15 },
  },
};

/* ── Animated counter hook ── */

function useAnimatedCounter(rawTarget: number, duration = 600): number {
  // A stat fed an undefined/NaN value would otherwise animate to "NaN".
  const target = Number.isFinite(rawTarget) ? rawTarget : 0;
  const [count, setCount] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;

    if (target === 0) {
      setCount(0);
      return;
    }

    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return count;
}

/* ── Sub-components ── */

const StatItem = memo(function StatItem({ stat }: { stat: PageHeaderStat }) {
  const animated = useAnimatedCounter(stat.value);
  const Icon = stat.icon;

  return (
    <motion.div variants={itemVariants} className="flex items-center gap-1.5">
      <Icon size={14} className={stat.iconColor} />
      <span className="text-sm font-medium text-foreground tabular-nums">
        {animated.toLocaleString("en-IN")}
      </span>
      <span className="text-xs text-muted">{stat.label}</span>
    </motion.div>
  );
});

function IconBadge({
  icon: Icon,
  compact,
}: {
  icon: LucideIcon;
  compact: boolean;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`
        ${compact ? "w-9 h-9 rounded-lg" : "w-10 h-10 rounded-xl"}
        bg-primary-bg flex items-center justify-center shrink-0
        ring-0 hover:ring-2 ring-accent/15 transition-shadow duration-200
      `}
    >
      <Icon size={compact ? 18 : 20} className="text-primary" />
    </motion.div>
  );
}

/* ── Main component ── */

export default function PageHeader({
  icon,
  title,
  subtitle,
  stats,
  card = true,
  size = "compact",
  titleExtra,
  filters,
  filtersExtra,
}: PageHeaderProps) {
  const compact = size === "compact";
  const hasStats = stats && stats.length > 0;
  const hasFilters = !!(filters || filtersExtra);

  const content = (
    <>
      {/* Top row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <IconBadge icon={icon} compact={compact} />
          <motion.div variants={itemVariants} className="min-w-0">
            <h2
              className={`${
                compact ? "text-base" : "text-lg"
              } font-semibold text-foreground leading-tight truncate`}
            >
              {title}
            </h2>
            <p
              className={`${
                compact ? "text-xs" : "text-sm"
              } text-muted mt-0.5`}
            >
              {subtitle}
            </p>
          </motion.div>
        </div>

        {/* Right side: stats and/or titleExtra */}
        {(hasStats || titleExtra) && (
          <div className="flex items-center gap-x-4 gap-y-1.5 sm:gap-5 flex-wrap">
            {hasStats &&
              stats!.map((s, i) => <StatItem key={i} stat={s} />)}
            {titleExtra}
          </div>
        )}
      </motion.div>

      {/* Filter row */}
      {hasFilters && (
        <motion.div
          variants={filterRowVariants}
          initial="hidden"
          animate="visible"
          className={`border-t border-border-light ${
            compact ? "mt-3 pt-3" : "mt-4 pt-4"
          } flex flex-col sm:flex-row sm:items-center gap-3`}
        >
          <div className="flex-1 min-w-0">{filters}</div>
          {filtersExtra && (
            <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
              {filtersExtra}
            </div>
          )}
        </motion.div>
      )}
    </>
  );

  if (card) {
    return (
      <div className="bg-background-elevated border border-border-light rounded-xl px-3 py-3 sm:px-5 sm:py-4">
        {content}
      </div>
    );
  }

  return <div>{content}</div>;
}
