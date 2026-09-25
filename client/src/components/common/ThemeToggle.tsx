import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { darkColors, lightColors } from "@/theme";

const TOGGLE_W = 56;
const TOGGLE_H = 28;
const KNOB = 22;
const PAD = 3;

/**
 * Circle-expand reveal transition.
 *
 * 1. A solid circle in the NEW theme's bg color expands from the toggle.
 * 2. Once it fully covers the viewport → calls `onCovered` (theme swap happens here,
 *    hidden behind the overlay so nothing flashes).
 * 3. Overlay fades out to reveal the newly-themed UI underneath.
 */
function triggerCircleReveal(
  btnEl: HTMLButtonElement,
  newMode: "light" | "dark",
  onCovered: () => void,
) {
  const rect = btnEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const newBg = newMode === "dark" ? darkColors.bg : lightColors.bg;

  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    pointer-events: none;
    background: ${newBg};
    clip-path: circle(0px at ${x}px ${y}px);
  `;
  document.body.appendChild(overlay);

  // Phase 1 — circle expands to cover the full viewport
  const expand = overlay.animate(
    {
      clipPath: [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ],
    },
    {
      duration: 450,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    },
  );

  expand.onfinish = () => {
    // Theme swap — overlay is opaque & covers everything, so no flash
    onCovered();

    // Give the browser one frame to paint the new theme behind the overlay
    requestAnimationFrame(() => {
      // Phase 2 — fade out to reveal the freshly-themed UI
      overlay.animate(
        { opacity: [1, 0] },
        { duration: 280, easing: "ease-out", fill: "forwards" },
      ).onfinish = () => overlay.remove();
    });
  };
}

export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const isDark = mode === "dark";
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    const newMode = isDark ? "light" : "dark";

    if (btnRef.current) {
      // Theme swaps only after overlay fully covers the screen
      triggerCircleReveal(btnRef.current, newMode, toggle);
    } else {
      toggle();
    }
  };

  return (
    <motion.button
      ref={btnRef}
      onClick={handleToggle}
      className="relative flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      style={{
        width: TOGGLE_W,
        height: TOGGLE_H,
        padding: PAD,
        backgroundColor: isDark
          ? "rgba(108, 92, 231, 0.25)"
          : "rgba(108, 92, 231, 0.1)",
      }}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.15 }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Sliding knob */}
      <motion.div
        className="absolute flex items-center justify-center rounded-full shadow-sm"
        style={{
          width: KNOB,
          height: KNOB,
          left: PAD,
          backgroundColor: isDark ? darkColors.bgElevated : "#FFFFFF",
        }}
        animate={{
          x: isDark ? TOGGLE_W - KNOB - PAD * 2 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {isDark ? (
              <Moon className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-violet-500" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Faint background icons hinting at opposite state */}
      <div className="flex items-center justify-between w-full px-1.5 pointer-events-none">
        <Sun
          className="w-3 h-3 text-violet-400 transition-opacity duration-300"
          style={{ opacity: isDark ? 0.4 : 0 }}
        />
        <Moon
          className="w-3 h-3 text-primary transition-opacity duration-300"
          style={{ opacity: isDark ? 0 : 0.3 }}
        />
      </div>
    </motion.button>
  );
}
