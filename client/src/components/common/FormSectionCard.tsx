import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { animationConfig } from "@/config/animations";

interface FormSectionCardProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  index?: number;
  defaultOpen?: boolean;
}

export function FormSectionCard({
  icon,
  iconColor,
  title,
  subtitle,
  children,
  index = 0,
  defaultOpen = true,
}: FormSectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * animationConfig.stagger.normal,
        ease: animationConfig.ease.out,
      }}
      className="bg-background-elevated rounded-2xl border border-border-light"
    >
      {/* Header — always visible, clickable to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-5 sm:p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted"
        >
          <ChevronDown className="w-4.5 h-4.5" />
        </motion.div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: animationConfig.ease.out }}
            onAnimationStart={() => setIsAnimating(true)}
            onAnimationComplete={() => setIsAnimating(false)}
            style={{ overflow: isAnimating ? "hidden" : "visible" }}
          >
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
