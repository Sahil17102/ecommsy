import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react";
import { useCopy } from "@/hooks/useCopy";
import { docsUrl } from "../config";

interface SecretModalProps {
  secret: string | null;
  /** "created" changes the copy from a rotation warning to a welcome. */
  reason: "created" | "rotated";
  onClose: () => void;
}

/**
 * The one moment the full signing secret exists in the browser.
 *
 * Closing is gated on an explicit "I've saved it" so nobody dismisses this by
 * reflex and loses the only copy — rotating is the only way back.
 */
export function SecretModal({ secret, reason, onClose }: SecretModalProps) {
  const { copied, copy } = useCopy();
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <AnimatePresence>
      {secret && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60]"
          />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border-light overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-border-light">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-success-bg flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {reason === "created" ? "Endpoint created" : "New signing secret"}
                    </h3>
                    <p className="text-[11px] text-muted">
                      Copy your signing secret now — this is the only time we show it.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wide mb-1.5">
                    Signing secret
                  </label>
                  <div className="flex items-stretch gap-2">
                    <code className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-surface-muted border border-border-light text-[11px] text-foreground font-mono break-all">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => copy(secret)}
                      className="shrink-0 flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold text-primary border border-primary/30 hover:bg-primary/[0.06] transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {reason === "rotated" && (
                  <div className="flex gap-2.5 rounded-xl border border-error-border bg-error-bg px-3.5 py-3">
                    <ShieldAlert className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
                    <p className="text-[11px] text-foreground leading-relaxed">
                      The previous secret stopped working the moment you rotated. Deploy this one
                      now, or your endpoint will reject every event as an invalid signature.
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-muted leading-relaxed">
                  Verify it on the <code className="font-mono">X-Searchcraft-Signature</code> header of
                  every request.{" "}
                  <a
                    href={docsUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-semibold hover:underline"
                  >
                    See the verification samples
                  </a>{" "}
                  for Node, Python and PHP.
                </p>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                  />
                  <span className="text-xs text-foreground">
                    I have saved this secret somewhere safe
                  </span>
                </label>
              </div>

              <div className="flex justify-end px-6 py-4 border-t border-border-light">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={!acknowledged}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
