import { useState, useEffect, useCallback, type ReactNode } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";
import { createPortal } from "react-dom";

export interface FilterItem {
  /** Unique key for the filter */
  key: string;
  /** Label shown above the input */
  label: string;
  /** The filter input element (Select, InputNumber, etc.) */
  render: ReactNode;
  /** Fixed width for this filter item on desktop (e.g. "160px"). Defaults to "180px". */
  width?: string;
}

interface CollapsibleFiltersProps {
  /** Filters always visible on desktop */
  primary: FilterItem[];
  /** Filters hidden behind "More filters" toggle on desktop */
  secondary?: FilterItem[];
  /** Content rendered at the far right (e.g. action buttons, result count) */
  extra?: ReactNode;
  /** Number of currently active filters — shown as badge on mobile filter icon */
  activeCount?: number;
  /** Called when user taps "Show results" in the mobile bottom sheet — use to commit draft filters */
  onApply?: () => void;
  /** Called when user taps "Clear all" in the mobile bottom sheet */
  onClearAll?: () => void;
}

export default function CollapsibleFilters({
  primary,
  secondary = [],
  extra,
  activeCount = 0,
  onApply,
  onClearAll,
}: CollapsibleFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when bottom sheet is open
  useEffect(() => {
    if (mobileOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [mobileOpen]);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const allFilters = [...primary, ...secondary];

  return (
    <div className="w-full">
      {/* ── Mobile layout (< lg) ── */}
      <div className="lg:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setMobileOpen(true)}
            className={`
              relative flex items-center justify-center w-9 h-9 rounded-lg border transition-colors shrink-0
              ${mobileOpen
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-background-elevated border-border-light text-muted hover:text-foreground hover:border-border"}
            `}
          >
            <SlidersHorizontal size={16} />
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
          {extra && <div className="flex items-center gap-2 ml-auto min-w-0">{extra}</div>}
        </div>

        {/* Bottom sheet (portal) */}
        {mobileOpen &&
          createPortal(
            <MobileBottomSheet
              filters={allFilters}
              activeCount={activeCount}
              onClose={closeMobile}
              onApply={onApply}
              onClearAll={onClearAll}
            />,
            document.body,
          )}
      </div>

      {/* ── Desktop layout (lg+) ── */}
      <div className="hidden lg:block space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          {primary.map((f) => (
            <div key={f.key} className="space-y-1" style={{ width: f.width ?? "180px" }}>
              <label className="text-[11px] font-medium text-muted">{f.label}</label>
              {f.render}
            </div>
          ))}
          {secondary.length > 0 && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors h-[32px]"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "Less filters" : "More filters"}
            </button>
          )}
          {activeCount > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors h-[32px]"
            >
              <X size={12} />
              Clear all
            </button>
          )}
          {extra && <div className="flex items-center gap-2 ml-auto">{extra}</div>}
        </div>

        {expanded && secondary.length > 0 && (
          <div className="flex items-end gap-3 flex-wrap">
            {secondary.map((f) => (
              <div key={f.key} className="space-y-1" style={{ width: f.width ?? "180px" }}>
                <label className="text-[11px] font-medium text-muted">{f.label}</label>
                {f.render}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Bottom Sheet sub-component ── */

function MobileBottomSheet({
  filters,
  activeCount,
  onClose,
  onApply,
  onClearAll,
}: {
  filters: FilterItem[];
  activeCount: number;
  onClose: () => void;
  onApply?: () => void;
  onClearAll?: () => void;
}) {
  const [visible, setVisible] = useState(false);

  // Trigger enter animation on mount
  useEffect(() => {
    // Force a reflow before adding the class so the transition plays
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    // Wait for exit animation
    setTimeout(onClose, 250);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-250 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Sheet */}
      <div
        className={`relative bg-background-elevated rounded-t-2xl shadow-2xl transition-transform duration-250 ease-out max-h-[85vh] flex flex-col ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-border-light">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal size={16} className="text-foreground" />
            <span className="text-sm font-semibold text-foreground">Filters</span>
            {activeCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-[11px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-8 h-8 rounded-full text-muted hover:text-foreground hover:bg-background transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter list — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {filters.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted">{f.label}</label>
              {f.render}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border-light flex items-center gap-3">
          {onClearAll && (
            <button
              onClick={() => {
                onClearAll();
                handleClose();
              }}
              className="flex-1 h-10 rounded-xl border border-border-light text-sm font-medium text-muted hover:text-foreground hover:border-border transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => {
              onApply?.();
              handleClose();
            }}
            className={`${onClearAll ? "flex-1" : "w-full"} h-10 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary/90 transition-colors`}
          >
            Show results
          </button>
        </div>

        {/* Safe area padding for notched phones */}
        <div className="pb-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
