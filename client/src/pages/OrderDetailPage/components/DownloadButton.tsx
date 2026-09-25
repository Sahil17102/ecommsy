import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, Download } from "lucide-react";

type DownloadButtonVariant = "default" | "primary" | "dark";

const variantClasses: Record<DownloadButtonVariant, string> = {
  default:
    "bg-background border border-border-light text-foreground hover:border-primary/40 hover:text-primary",
  primary:
    "bg-primary border border-primary text-white hover:bg-primary/90",
  dark:
    "bg-foreground border border-foreground text-background hover:bg-foreground/90",
};

export function DownloadButton({
  label,
  icon,
  onClick,
  className,
  variant = "default",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => Promise<void>;
  className?: string;
  variant?: DownloadButtonVariant;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setDone(false);
    setLoading(true);
    try {
      await onClick();
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      // silent — user sees the spinner revert
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={loading}
      whileTap={{ scale: 0.96 }}
      className={
        className ??
        `inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-60 ${variantClasses[variant]}`
      }
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span key="spin" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
            <Loader2 className="w-4 h-4 animate-spin" />
          </motion.span>
        ) : done ? (
          <motion.span key="done" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
            <Check className="w-4 h-4" />
          </motion.span>
        ) : (
          <motion.span key="icon" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
            {icon}
          </motion.span>
        )}
      </AnimatePresence>
      {done ? "Downloaded" : label}
      {!done && <Download className="w-3.5 h-3.5 opacity-60" />}
    </motion.button>
  );
}
