/**
 * Animation config — single place for durations, easings, and presets.
 * Use with Framer Motion for consistent, tweakable animations across the app.
 */

export const animationConfig = {
  /** Durations (seconds) */
  duration: {
    fast: 0.2,
    normal: 0.35,
    slow: 0.5,
    page: 0.4,
  },

  /** Easing curves (Framer Motion / CSS-friendly) */
  ease: {
    default: [0.25, 0.1, 0.25, 1],
    out: [0, 0, 0.2, 1],
    inOut: [0.4, 0, 0.2, 1],
    bounce: [0.34, 1.56, 0.64, 1],
  },

  /** Stagger delay between children (seconds) */
  stagger: {
    tight: 0.05,
    normal: 0.08,
    relaxed: 0.12,
  },
} as const;

/** Reusable variant presets for motion components */
export const motionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  fadeInDown: {
    initial: { opacity: 0, y: -12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
} as const;

/** Transition presets using animationConfig */
export const defaultTransition = {
  duration: animationConfig.duration.normal,
  ease: animationConfig.ease.out,
} as const;

export const pageTransition = {
  duration: animationConfig.duration.page,
  ease: animationConfig.ease.out,
} as const;

export type MotionVariantsKey = keyof typeof motionVariants;

/**
 * Shared scroll-triggered animation props.
 * Spread directly on motion.div: <motion.div {...scrollFadeUp}>
 */
const viewport = { once: true, margin: "-60px" } as const;

export const scrollFadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport,
  transition: { duration: 0.6, ease: animationConfig.ease.out },
} as const;

export const scrollFadeIn = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport,
  transition: { duration: 0.5 },
} as const;

export const scrollViewport = viewport;

/** Staggered child entrance — use with index * staggerDelay */
export const staggeredChild = (index: number, delay = 0.1) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport,
  transition: {
    duration: 0.5,
    delay: index * delay,
    ease: animationConfig.ease.out,
  },
});
