/**
 * Single source for responsive behavior. Change here to affect the whole app.
 * Breakpoint names match Tailwind (sm, md, lg, xl, 2xl). Keep in sync with tailwind.config.js if you customize screens.
 */
export type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

export const responsiveConfig = {
  /** Breakpoint names (Tailwind defaults: sm=640, md=768, lg=1024, xl=1280, 2xl=1536) */
  breakpoints: ["sm", "md", "lg", "xl", "2xl"] as const,

  layout: {
    header: {
      /** Nav links visible from this breakpoint up */
      navVisibleFrom: "sm" as Breakpoint,
      /** Mobile menu (e.g. hamburger) shown below this breakpoint */
      mobileMenuBelow: "sm" as Breakpoint,
    },
  },

  /** Grid column counts per breakpoint (default = mobile first). Used by getGridCols(). */
  grid: {
    featureCards: { default: 1, sm: 2, lg: 3 },
    twoCols: { default: 1, sm: 2 },
    threeCols: { default: 1, md: 2, lg: 3 },
    fourCols: { default: 1, sm: 2, lg: 4 },
  } as const,

  /** Section spacing (theme-based class names). Tweak in theme if values need to change. */
  section: {
    heroPadding: "py-8 sm:py-12",
    contentGap: "gap-content-gap",
    sectionGap: "mb-section-gap",
    /** Larger margin between major page sections (e.g. after first feature block) */
    sectionGapLarge: "mb-16",
  },

  /** Typography: responsive size classes. */
  typography: {
    heroTitle: "text-3xl sm:text-4xl",
    sectionTitle: "text-2xl sm:text-3xl",
    bodyMaxWidth: "max-w-xl",
  },
} as const;

export type ResponsiveConfig = typeof responsiveConfig;
