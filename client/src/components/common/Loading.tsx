import { Spin } from "antd";
import type { SpinSize } from "antd/es/spin";

export type LoadingVariant = "inline" | "fullPage";

interface LoadingProps {
  /** "inline" = block/section loading; "fullPage" = overlay over entire app */
  variant?: LoadingVariant;
  /** Spinner size (uses theme primary color via ConfigProvider) */
  size?: SpinSize;
  /** Text below spinner — uses theme muted color */
  tip?: string;
  className?: string;
}

const variantClasses: Record<LoadingVariant, string> = {
  inline:
    "flex items-center justify-center min-h-loading-min-height w-full bg-background-elevated rounded-lg border border-border",
  fullPage:
    "fixed inset-0 z-[9999] flex items-center justify-center w-full h-full bg-loading-overlay backdrop-blur-[2px]",
};

/**
 * App-wide theme-based loading. Use everywhere instead of ad-hoc spinners.
 * Spinner color comes from theme (Ant Design token); wrapper and tip use theme vars.
 */
export function Loading({
  variant = "inline",
  size = "large",
  tip = "Loading...",
  className = "",
}: LoadingProps) {
  return (
    <div
      className={`${variantClasses[variant]} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={tip}
    >
      <Spin size={size} tip={tip ? <span className="text-muted">{tip}</span> : undefined} />
    </div>
  );
}
