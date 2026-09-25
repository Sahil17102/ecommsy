import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";

export function CopyButton({
  text,
  label,
  size = "sm",
}: {
  text: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <motion.button
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy ${label ?? text}`}
      whileTap={{ scale: 0.88 }}
      className={`inline-flex items-center gap-1.5 rounded-lg transition-all ${
        size === "md"
          ? "px-3 py-1.5 text-xs font-semibold bg-background border border-border-light hover:border-primary/25 hover:bg-primary/[0.04] text-muted hover:text-primary"
          : "p-1.5 text-tertiary hover:text-primary hover:bg-primary/[0.06]"
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="text-success inline-flex"
          >
            <Check className={size === "md" ? "w-3.5 h-3.5" : "w-3 h-3"} />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="inline-flex"
          >
            <Copy className={size === "md" ? "w-3.5 h-3.5" : "w-3 h-3"} />
          </motion.span>
        )}
      </AnimatePresence>
      {size === "md" && <span>{copied ? "Copied!" : "Copy"}</span>}
    </motion.button>
  );
}
