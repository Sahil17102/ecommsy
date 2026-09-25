import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Send, X, XCircle } from "lucide-react";
import { CopyButton } from "@/components/common";
import { LIFECYCLE_EVENTS, MAX_ATTEMPTS } from "../config";
import type { WebhookDelivery, WebhookEndpoint } from "../types";

interface TestWebhookModalProps {
  endpoint: WebhookEndpoint | null;
  onClose: () => void;
  onSend: (event: string) => Promise<{ delivered: boolean; delivery: WebhookDelivery }>;
  isSending: boolean;
}

const PING = "webhook.ping";

/**
 * Test tool for a single endpoint.
 *
 * The result is shown inline rather than as a toast: the whole point of a test
 * is reading the response your server gave, and a toast disappears before you
 * can. Nothing here is retried — a test is a one-shot check.
 */
export function TestWebhookModal({ endpoint, onClose, onSend, isSending }: TestWebhookModalProps) {
  const [event, setEvent] = useState(PING);
  const [result, setResult] = useState<{ delivered: boolean; delivery: WebhookDelivery } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!endpoint) return;
    setEvent(PING);
    setResult(null);
    setError(null);
  }, [endpoint]);

  async function handleSend() {
    setResult(null);
    setError(null);
    try {
      setResult(await onSend(event));
    } catch (err) {
      const response = (err as { response?: { data?: { error?: string } } })?.response;
      setError(response?.data?.error ?? "Could not send the test event");
    }
  }

  return (
    <AnimatePresence>
      {endpoint && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background rounded-2xl shadow-2xl border border-border-light pointer-events-auto"
            >
              <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border-light">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground">Send a test event</h3>
                  <p className="text-[11px] text-muted font-mono truncate">{endpoint.url}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-primary/[0.06] transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    What should we send?
                  </label>
                  <select
                    value={event}
                    onChange={(e) => {
                      setEvent(e.target.value);
                      setResult(null);
                      setError(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background-elevated border border-border focus:border-primary text-sm text-foreground outline-none transition-colors"
                  >
                    <option value={PING}>Connection test — just checks we can reach you</option>
                    {LIFECYCLE_EVENTS.map((entry) => (
                      <option key={entry.event} value={entry.event}>
                        {entry.label} — a sample {entry.event} payload
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted mt-1.5">
                    {event === PING
                      ? "Confirms your URL is reachable and your signature check passes."
                      : "Sends a realistic payload for this status against a dummy order (TEST-ORDER-0001), so you can exercise your handler without shipping anything."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20 disabled:opacity-60 transition-opacity"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSending ? "Sending…" : "Send test event"}
                </button>

                {error && (
                  <div className="rounded-xl border border-error-border bg-error-bg px-3.5 py-3">
                    <p className="text-[11px] font-semibold text-foreground">{error}</p>
                  </div>
                )}

                {result && <TestResult result={result} />}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function TestResult({
  result,
}: {
  result: { delivered: boolean; delivery: WebhookDelivery };
}) {
  const { delivered, delivery } = result;
  const body = delivery.responseBody?.trim() || delivery.error || "(empty response body)";

  return (
    <div className="space-y-3">
      <div
        className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${
          delivered ? "border-success-border bg-success-bg" : "border-error-border bg-error-bg"
        }`}
      >
        {delivered ? (
          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">
            {delivered ? "Your endpoint accepted it" : "Your endpoint did not accept it"}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {delivery.responseStatus != null
              ? `Answered HTTP ${delivery.responseStatus}`
              : "No response received"}
            {delivery.error ? ` · ${delivery.error}` : ""}
          </p>
          {!delivered && (
            <p className="text-[11px] text-muted mt-1 leading-relaxed">
              Real events are retried {MAX_ATTEMPTS} times. A test is sent once and never retried,
              so nothing is queued behind this.
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-[11px] font-bold text-foreground">What your server replied</p>
          <CopyButton text={body} />
        </div>
        <pre className="max-h-40 overflow-auto rounded-xl border border-border-light bg-surface-muted px-3 py-2.5 text-[11px] leading-relaxed text-foreground font-mono whitespace-pre-wrap break-words">
          {body}
        </pre>
      </div>
    </div>
  );
}
