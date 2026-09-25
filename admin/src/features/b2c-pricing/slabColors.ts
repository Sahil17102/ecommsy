/**
 * Visual palette for weight slabs. Each slab in a pricing form gets a colour
 * from this list (by index, cycling) so the user can scan vertically and tell
 * which inputs belong to which slab at a glance.
 */
export interface SlabColor {
  /** Subtle row/cell tint for inputs */
  bg: string;
  /** Stronger header tint */
  header: string;
  /** Border for the column-group accent */
  border: string;
  /** Foreground text colour for the slab label */
  text: string;
  /** AntD Tag colour name (used in slab editor + listing) */
  tag: string;
  /** Hex used for the column-group's accent bar */
  accent: string;
}

export const SLAB_COLORS: SlabColor[] = [
  { bg: "bg-sky-50 dark:bg-sky-950/40",         header: "bg-sky-100 dark:bg-sky-900/50",         border: "border-sky-300 dark:border-sky-700/70",         text: "text-sky-700 dark:text-sky-300",         tag: "blue",    accent: "#0ea5e9" },
  { bg: "bg-violet-50 dark:bg-violet-950/40",     header: "bg-violet-100 dark:bg-violet-900/50",     border: "border-violet-300 dark:border-violet-700/70",     text: "text-violet-700 dark:text-violet-300",     tag: "purple",  accent: "#f59e0b" },
  { bg: "bg-emerald-50 dark:bg-emerald-950/40", header: "bg-emerald-100 dark:bg-emerald-900/50", border: "border-emerald-300 dark:border-emerald-700/70", text: "text-emerald-700 dark:text-emerald-300", tag: "green",   accent: "#10b981" },
  { bg: "bg-violet-50 dark:bg-violet-950/40",   header: "bg-violet-100 dark:bg-violet-900/50",   border: "border-violet-300 dark:border-violet-700/70",   text: "text-violet-700 dark:text-violet-300",   tag: "purple",  accent: "#8b5cf6" },
  { bg: "bg-pink-50 dark:bg-pink-950/40",       header: "bg-pink-100 dark:bg-pink-900/50",       border: "border-pink-300 dark:border-pink-700/70",       text: "text-pink-700 dark:text-pink-300",       tag: "magenta", accent: "#ec4899" },
  { bg: "bg-cyan-50 dark:bg-cyan-950/40",       header: "bg-cyan-100 dark:bg-cyan-900/50",       border: "border-cyan-300 dark:border-cyan-700/70",       text: "text-cyan-700 dark:text-cyan-300",       tag: "cyan",    accent: "#06b6d4" },
];

export function getSlabColor(index: number): SlabColor {
  return SLAB_COLORS[index % SLAB_COLORS.length];
}
