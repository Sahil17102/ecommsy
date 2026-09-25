import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { Tooltip } from "antd";
import { useCopy } from "@/hooks/useCopy";

interface CopyButtonProps {
  text: string;
  title?: string;
}

const ICON_ANIM = {
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.6, opacity: 0 },
  transition: { duration: 0.15 },
};

export function CopyButton({ text, title }: CopyButtonProps) {
  const { copied, copy } = useCopy();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    copy(text);
  }

  return (
    <Tooltip title={copied ? "Copied!" : (title ?? "Copy")}>
      <button
        onClick={handleClick}
        className="p-1 rounded-md hover:bg-foreground/[0.08] transition-colors shrink-0"
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span key="check" {...ICON_ANIM}>
              <Check className="w-3 h-3 text-emerald-500" />
            </motion.span>
          ) : (
            <motion.span key="copy" {...ICON_ANIM}>
              <Copy className="w-3 h-3 text-muted" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </Tooltip>
  );
}
