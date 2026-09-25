import { responsiveConfig } from "./responsive";
import type { Breakpoint } from "./responsive";

/** Tailwind responsive prefix for a breakpoint (e.g. sm -> "sm:") */
function prefix(bp: Breakpoint): string {
  return `${bp}:`;
}

/**
 * Visibility: hidden below breakpoint, visible from breakpoint up (inline).
 * Use for nav links that hide on mobile.
 */
export function visibleFrom(bp: Breakpoint): string {
  return `hidden ${prefix(bp)}:inline`;
}

/**
 * Visibility: visible below breakpoint, hidden from breakpoint up.
 * Use for mobile-only elements (e.g. hamburger).
 */
export function hiddenFrom(bp: Breakpoint): string {
  return `${prefix(bp)}:hidden`;
}

/**
 * Grid class from config key. Add new presets in responsiveConfig.grid and here.
 * Keeps responsive grid classes DRY and config-driven.
 */
const gridColsMap: Record<keyof typeof responsiveConfig.grid, string> = {
  featureCards: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  twoCols: "grid grid-cols-1 sm:grid-cols-2",
  threeCols: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  fourCols: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function getGridColsClasses(key: keyof typeof responsiveConfig.grid): string {
  return gridColsMap[key];
}

export const section = responsiveConfig.section;
export const typography = responsiveConfig.typography;
export const layout = responsiveConfig.layout;
