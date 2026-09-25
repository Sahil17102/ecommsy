import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

/* ── Types ── */

export interface TourStep {
  title: string;
  description: string;
  target: () => HTMLElement | null;
  placement?: "top" | "bottom" | "left" | "right";
  icon?: React.ReactNode;
  /** Called when this step becomes active — use to change app state */
  onEnter?: () => void;
}

interface SpotlightTourProps {
  open: boolean;
  onClose: () => void;
  steps: TourStep[];
}

/* ── Geometry helpers ── */

const PADDING = 10;
const CARD_GAP = 16;
const BORDER_RADIUS = 16;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getTargetRect(el: HTMLElement | null): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: r.left - PADDING,
    y: r.top - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

function getCardPosition(
  rect: Rect | null,
  placement: string,
  cardW: number,
  cardH: number,
) {
  if (!rect) {
    return {
      top: window.innerHeight / 2 - cardH / 2,
      left: window.innerWidth / 2 - cardW / 2,
    };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = 0;
  let left = 0;

  switch (placement) {
    case "bottom":
      top = rect.y + rect.height + CARD_GAP;
      left = rect.x + rect.width / 2 - cardW / 2;
      break;
    case "top":
      top = rect.y - cardH - CARD_GAP;
      left = rect.x + rect.width / 2 - cardW / 2;
      break;
    case "left":
      top = rect.y + rect.height / 2 - cardH / 2;
      left = rect.x - cardW - CARD_GAP;
      break;
    case "right":
      top = rect.y + rect.height / 2 - cardH / 2;
      left = rect.x + rect.width + CARD_GAP;
      break;
    default:
      top = rect.y + rect.height + CARD_GAP;
      left = rect.x + rect.width / 2 - cardW / 2;
  }

  if (left < 16) left = 16;
  if (left + cardW > vw - 16) left = vw - cardW - 16;
  if (top < 16) top = 16;
  if (top + cardH > vh - 16) {
    top = rect.y - cardH - CARD_GAP;
    if (top < 16) top = 16;
  }

  return { top, left };
}

/* ── Component ── */

export function ThemedTour({ open, onClose, steps }: SpotlightTourProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;

  useEffect(() => {
    if (open) {
      setCurrent(0);
      setDirection(1);
    }
  }, [open]);

  const measure = useCallback(() => {
    if (!step) return;
    const el = step.target();
    const rect = getTargetRect(el);
    setTargetRect(rect);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    requestAnimationFrame(() => {
      const cardEl = cardRef.current;
      const w = cardEl?.offsetWidth || 360;
      const h = cardEl?.offsetHeight || 200;
      setCardPos(getCardPosition(rect, step.placement || "bottom", w, h));
    });
  }, [step]);

  // Fire onEnter when step changes
  useEffect(() => {
    if (!open || !step) return;
    step.onEnter?.();
  }, [open, current]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const t1 = setTimeout(measure, 100);
    const t2 = setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, current, measure]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && !isLast) {
        setDirection(1);
        setCurrent((c) => c + 1);
      }
      if (e.key === "ArrowLeft" && !isFirst) {
        setDirection(-1);
        setCurrent((c) => c - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, isFirst, isLast, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open || !step) return null;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setDirection(1);
      setCurrent((c) => c + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setDirection(-1);
      setCurrent((c) => c - 1);
    }
  };

  // Slide animation variants — left/right based on direction
  const slideVariants = {
    enter: { opacity: 0, x: direction > 0 ? 60 : -60 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction > 0 ? -60 : 60 },
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "auto" }}>
          {/* ── Overlay with spotlight cutout ── */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: "none" }}
            >
              <defs>
                <mask id="spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  {targetRect && (
                    <rect
                      x={targetRect.x}
                      y={targetRect.y}
                      width={targetRect.width}
                      height={targetRect.height}
                      rx={BORDER_RADIUS}
                      ry={BORDER_RADIUS}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(15, 23, 42, 0.75)"
                mask="url(#spotlight-mask)"
                style={{ pointerEvents: "auto", cursor: "default" }}
                onClick={(e) => e.stopPropagation()}
              />
            </svg>

            {/* Glow border */}
            {targetRect && (
              <div
                className="absolute pointer-events-none"
                style={{
                  top: targetRect.y,
                  left: targetRect.x,
                  width: targetRect.width,
                  height: targetRect.height,
                  borderRadius: BORDER_RADIUS,
                  border: "2px solid rgba(108, 92, 231, 0.5)",
                  boxShadow:
                    "0 0 20px rgba(108, 92, 231, 0.3), 0 0 40px rgba(108, 92, 231, 0.1)",
                  transition: "top 0.35s ease, left 0.35s ease, width 0.35s ease, height 0.35s ease",
                }}
              />
            )}
          </motion.div>

          {/* ── Tour Card with horizontal slide ── */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              ref={cardRef}
              className="absolute z-10"
              style={{
                top: cardPos.top,
                left: cardPos.left,
                width: "min(380px, calc(100vw - 32px))",
              }}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-light)",
                  boxShadow:
                    "0 20px 60px rgba(108, 92, 231, 0.15), 0 8px 24px rgba(0, 0, 0, 0.12)",
                }}
              >
                {/* Gradient bar */}
                <div
                  className="h-1"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%)",
                  }}
                />

                <div className="p-5">
                  {/* Step badge + close */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: "var(--color-primary-bg)",
                        color: "var(--color-primary)",
                      }}
                    >
                      Step {current + 1} of {steps.length}
                    </span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-foreground transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-base font-bold mb-1.5"
                    style={{ color: "var(--color-text)" }}
                  >
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-sm leading-relaxed mb-5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {step.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    {/* Progress dots */}
                    <div className="flex items-center gap-1.5">
                      {steps.map((_, i) => (
                        <motion.div
                          key={i}
                          className="rounded-full"
                          animate={{
                            width: i === current ? 20 : 6,
                            height: i === current ? 8 : 6,
                            background:
                              i === current
                                ? "var(--color-primary)"
                                : i < current
                                  ? "var(--color-accent)"
                                  : "var(--color-border)",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        />
                      ))}
                    </div>

                    {/* Nav */}
                    <div className="flex items-center gap-2">
                      {!isFirst && (
                        <button
                          type="button"
                          onClick={handlePrev}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                          style={{
                            color: "var(--color-text-secondary)",
                            border: "1px solid var(--color-border-light)",
                          }}
                        >
                          <ChevronLeft size={14} />
                          Back
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm font-bold text-white transition-colors"
                        style={{
                          background: isLast
                            ? "linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)"
                            : "var(--color-primary)",
                          boxShadow: "0 2px 12px rgba(108, 92, 231, 0.3)",
                        }}
                      >
                        {isLast ? "Got it!" : "Next"}
                        {!isLast && <ChevronRight size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skip */}
              {!isLast && (
                <div className="text-center mt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-medium transition-colors"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "rgba(255,255,255,0.8)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
                    }
                  >
                    Skip tour
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
