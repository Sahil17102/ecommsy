# Theme (single source of truth)

**Do not use hardcoded colors, spacing, or radii in the client.** All visual tokens live here and are exposed as CSS variables.

## Usage

- **Tailwind:** Use semantic classes from `tailwind.config.js`: `text-foreground`, `bg-primary`, `text-muted`, `border-border`, `bg-background`, `bg-background-elevated`, `rounded-md`, `px-container`, `gap-content-gap`, etc.
- **Ant Design:** Theme is derived from `theme.ts` in `antd.ts`; no extra config needed.
- **Custom CSS:** Use `var(--color-primary)`, `var(--radius-md)`, etc. (see `cssVars` in `theme.ts`).

## Adding tokens

1. Add the value to `theme` in `theme.ts`.
2. Add the CSS variable to `cssVars` in `theme.ts`.
3. If you need Tailwind classes, add to `tailwind.config.js` under `theme.extend` (colors, spacing, borderRadius, minHeight, etc.).

## Loading

Use the common `<Loading />` component from `@/components/common` everywhere. It is theme-based (spinner uses `colorPrimary`, wrapper and tip use theme vars). Supports `variant="inline"` (default) and `variant="fullPage"` for app-level overlay.

## Files

- `theme.ts` — Token values and `injectThemeVars()` (called in `main.tsx`).
- `antd.ts` — Ant Design theme built from `theme` (including Spin).
- `index.ts` — Re-exports.
