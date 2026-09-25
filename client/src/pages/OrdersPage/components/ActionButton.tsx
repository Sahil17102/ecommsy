import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Row-action button with built-in in-flight state.
 *
 * The button disables itself for the whole duration of `onClick`, which is the
 * only thing standing between a user and firing five "Initiate Pickup" calls by
 * double-clicking. The `inFlight` ref guards the synchronous gap before React
 * re-renders with `loading = true`.
 *
 * Pass `label` for a text button, omit it for an icon-only button.
 */
function ActionButton({
  label,
  icon,
  onClick,
  variant = "primary",
  size = "sm",
  disabled = false,
}: {
  label?: string;
  icon: React.ReactNode;
  onClick: () => Promise<void>;
  variant?: "primary" | "outline" | "danger" | "success" | "ghost";
  size?: "sm" | "xs" | "icon";
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  async function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    setLoading(true);
    try {
      await onClick();
    } catch {
      // Callers surface their own errors (mutation hooks toast, downloads toast).
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  const styles = {
    primary:
      "bg-primary text-white shadow-sm shadow-primary/20 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:ring-offset-1",
    outline:
      "bg-background border border-border-light text-muted hover:text-primary hover:border-primary/30 hover:bg-primary/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/15",
    danger:
      "bg-background border border-red-200/70 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-300/70 focus:outline-none focus:ring-2 focus:ring-red-200/40",
    success:
      "bg-emerald-50 border border-emerald-200/60 text-emerald-600 hover:bg-emerald-100/60 focus:outline-none focus:ring-2 focus:ring-emerald-200/40",
    ghost:
      "text-muted hover:text-foreground hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/15",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-[11px] gap-1.5 rounded-lg",
    xs: "px-2 py-1 text-[11px] gap-1 rounded-md",
    icon: "p-1.5 rounded",
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading || disabled}
      aria-busy={loading}
      className={`inline-flex items-center justify-center font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${styles[variant]} ${sizeStyles[size]}`}
    >
      {loading ? <Loader2 className={`${size === "sm" ? "w-3.5 h-3.5" : "w-3.5 h-3.5"} animate-spin`} /> : icon}
      {label}
    </button>
  );
}

export default ActionButton;
