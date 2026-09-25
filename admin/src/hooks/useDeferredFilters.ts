import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Breakpoint must match CollapsibleFilters' `lg:hidden` (1024px).
 */
const LG_BREAKPOINT = 1024;

function useIsLgDown() {
  const [match, setMatch] = useState(
    () => typeof window !== "undefined" && window.innerWidth < LG_BREAKPOINT,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setMatch(e.matches);
    mql.addEventListener("change", handler);
    setMatch(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return match;
}

/**
 * Manages filter state with deferred apply on mobile.
 *
 * - Desktop: every `setFilter` call immediately updates both `draft` and `applied`.
 * - Mobile (< lg): `setFilter` only updates `draft`. Filters are committed to
 *   `applied` when `apply()` is called (i.e. user taps "Show results").
 *
 * Bind filter inputs to `draft`, and pass `applied` to your query hook.
 */
export function useDeferredFilters<T extends Record<string, unknown>>(
  initial: T,
  /** Called whenever `applied` state changes (desktop: on each filter change, mobile: on apply/clear). Useful for resetting page to 1. */
  onApplied?: () => void,
) {
  const initialRef = useRef(initial);
  const isMobile = useIsLgDown();
  const [draft, setDraft] = useState<T>(initial);
  const [applied, setApplied] = useState<T>(initial);

  // Track whether this is the first render to avoid calling onApplied on mount
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    onApplied?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
      if (!isMobile) {
        setApplied((prev) => ({ ...prev, [key]: value }));
      }
    },
    [isMobile],
  );

  const apply = useCallback(() => {
    setApplied(draft);
  }, [draft]);

  const clearAll = useCallback(() => {
    setDraft(initialRef.current);
    setApplied(initialRef.current);
  }, []);

  return { draft, applied, setFilter, apply, clearAll };
}
