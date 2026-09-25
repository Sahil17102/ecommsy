/**
 * App-wide configuration constants (SSOT).
 * Change a value here to update it across the entire application.
 */

/** Default number of rows per page for all paginated tables/lists. */
export const DEFAULT_PAGE_SIZE = Number(
  import.meta.env.VITE_DEFAULT_PAGE_SIZE ?? 20,
);

/** Ant Design Tag color per plan slug — single source of truth. */
export const PLAN_COLORS: Record<string, string> = {
  basic: "default",
  gold: "gold",
  platinum: "purple",
  diamond: "cyan",
};
