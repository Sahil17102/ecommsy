import { motion } from "framer-motion";
import { ReactNode } from "react";
import {
  animationConfig,
  motionVariants,
  defaultTransition,
  type MotionVariantsKey,
} from "@/config/animations";

const variantMap = {
  fadeIn: motionVariants.fadeIn,
  fadeInUp: motionVariants.fadeInUp,
  fadeInDown: motionVariants.fadeInDown,
  scaleIn: motionVariants.scaleIn,
};

interface AnimatedSectionProps {
  /** Preset from config/animations */
  variant?: MotionVariantsKey;
  transition?: typeof defaultTransition;
  className?: string;
  children: ReactNode;
}

/** Single block that animates on mount (e.g. hero). Uses config presets. */
export function AnimatedSection({
  variant = "fadeInUp",
  transition = defaultTransition,
  className = "",
  children,
}: AnimatedSectionProps) {
  const variants = variantMap[variant];
  return (
    <motion.section
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
      className={className}
    >
      {children}
    </motion.section>
  );
}

interface StaggerContainerProps {
  /** Stagger delay between children (from config) */
  staggerDelay?: keyof typeof animationConfig.stagger;
  transition?: typeof defaultTransition;
  className?: string;
  children: ReactNode;
}

/** Container that staggers its motion children. Use with AnimatedItem as direct children. */
export function StaggerContainer({
  staggerDelay = "normal",
  transition = defaultTransition,
  className = "",
  children,
}: StaggerContainerProps) {
  const variants = {
    animate: {
      transition: { staggerChildren: animationConfig.stagger[staggerDelay] },
    },
  };
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedItemProps {
  variant?: MotionVariantsKey;
  transition?: typeof defaultTransition;
  className?: string;
  children: ReactNode;
}

/** Wraps one child for use inside StaggerContainer so it animates in sequence. */
export function AnimatedItem({
  variant = "fadeInUp",
  transition = defaultTransition,
  className = "",
  children,
}: AnimatedItemProps) {
  const variants = variantMap[variant as MotionVariantsKey];
  return (
    <motion.div variants={variants} transition={transition} className={className}>
      {children}
    </motion.div>
  );
}
