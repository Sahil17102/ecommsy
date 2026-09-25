# Config

Single place for **responsive behavior**, **animations**, and layout rules. Change here to update the app in seconds.

## Responsive (`responsive.ts`)

- **Breakpoints:** Match Tailwind (`sm`, `md`, `lg`, `xl`, `2xl`). Keep in sync with `tailwind.config.js` if you change `screens`.
- **layout.header:** `navVisibleFrom` / `mobileMenuBelow` — control when nav links vs mobile menu show.
- **grid:** Presets for feature cards, two/three/four columns. Use `getGridColsClasses("featureCards")` etc.
- **section / typography:** Class names for hero padding, section gaps, title sizes, body max-width.

## Class helpers (`classNames.ts`)

- `visibleFrom(bp)` — hidden below breakpoint, visible from breakpoint up (e.g. desktop nav).
- `hiddenFrom(bp)` — visible below breakpoint, hidden from breakpoint up (e.g. hamburger).
- `getGridColsClasses(key)` — grid class from config (DRY responsive grids).
- Re-exports: `section`, `typography`, `layout` for use in components.

## Adding a new responsive preset

1. Add the column map in `responsive.ts` under `grid`.
2. Add the corresponding Tailwind class string in `classNames.ts` inside `gridColsMap`.
3. Use `getGridColsClasses("yourKey")` in components.

## Animations (`animations.ts`)

- **Library:** Framer Motion. Presets live here so durations and easings are consistent.
- **animationConfig:** `duration` (fast, normal, slow, page), `ease` curves, `stagger` delays.
- **motionVariants:** `fadeIn`, `fadeInUp`, `fadeInDown`, `scaleIn` — use with `AnimatedSection`, `AnimatedItem`, `StaggerContainer` from `@/components/common`.
- **Transitions:** `defaultTransition`, `pageTransition`. Tweak in this file to change feel app-wide.

## UI/UX and code style

- **Mobile first:** Default styles for small screens; use `sm:`, `md:` etc. for larger.
- **DRY:** Use config and helpers instead of repeating responsive class strings.
- **KISS:** Prefer config keys and helpers over inline logic; keep components thin.
- **Touch targets:** Buttons and links use Ant Design / theme sizes (min ~44px tap area where possible).
- **Spacing:** Use theme tokens (`section-gap`, `content-gap`, `container`) so spacing stays consistent and themeable.
