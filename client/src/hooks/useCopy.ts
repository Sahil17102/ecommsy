import { useState, useCallback } from "react";

/**
 * Reusable clipboard copy hook.
 * Returns `{ copied, copy }` — call `copy(text)` to write to clipboard,
 * `copied` flips to true for `resetMs` ms then resets.
 */
export function useCopy(resetMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), resetMs);
      });
    },
    [resetMs],
  );

  return { copied, copy };
}
