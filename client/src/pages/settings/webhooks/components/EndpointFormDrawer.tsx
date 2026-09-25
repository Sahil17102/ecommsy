import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2, Lock, X } from "lucide-react";
import { animationConfig } from "@/config/animations";
import { LIFECYCLE_EVENTS } from "../config";
import type { WebhookEndpoint, WebhookFormValues } from "../types";

interface EndpointFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: WebhookFormValues) => Promise<void>;
  editing?: WebhookEndpoint | null;
  isSubmitting?: boolean;
}

/** Mirrors the server's rule so a bad URL is caught before a round trip. */
function validateUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Endpoint URL is required";
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "Enter a full URL, including https://";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return "The URL must start with https://";
  }
  if (parsed.protocol === "http:" && !/^(localhost|127\.)/.test(parsed.hostname)) {
    return "Use https:// — plain http endpoints are rejected";
  }
  return null;
}

export function EndpointFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  editing,
  isSubmitting = false,
}: EndpointFormDrawerProps) {
  const isEditing = !!editing;
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ url?: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setUrl(editing?.url ?? "");
    setDescription(editing?.description ?? "");
  }, [isOpen, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const urlError = validateUrl(url);
    if (urlError) {
      setErrors({ url: urlError });
      return;
    }
    setErrors({});
    await onSubmit({ url: url.trim(), description: description.trim() });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: animationConfig.ease.out }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-background z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    {isEditing ? "Edit endpoint" : "Add endpoint"}
                  </h2>
                  <p className="text-[11px] text-muted">
                    {isEditing
                      ? "Change where we send your order updates"
                      : "We will POST every order status change to this URL"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-primary/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Endpoint URL <span className="text-error">*</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourbrand.in/hooks/box-and-beyond"
                  autoComplete="off"
                  spellCheck={false}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-background-elevated border text-sm text-foreground font-mono placeholder:font-sans placeholder:text-tertiary outline-none transition-colors ${
                    errors.url ? "border-error" : "border-border focus:border-primary"
                  }`}
                />
                {errors.url ? (
                  <p className="text-[11px] font-medium text-error mt-1.5">{errors.url}</p>
                ) : (
                  <p className="text-[11px] text-muted mt-1.5">
                    Must be publicly reachable over HTTPS. Redirects are not followed, so give us
                    the final URL.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Label <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Production order feed"
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background-elevated border border-border focus:border-primary text-sm text-foreground placeholder:text-tertiary outline-none transition-colors"
                />
                <p className="text-[11px] text-muted mt-1.5">
                  Only for you — helps tell endpoints apart later.
                </p>
              </div>

              <WhatYouWillReceive />

              {!isEditing && (
                <div className="flex gap-2.5 rounded-xl border border-border-light bg-surface-muted px-3.5 py-3">
                  <Lock className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted leading-relaxed">
                    We will show you a signing secret once this endpoint is created. Every request
                    we send is signed with it — store it somewhere safe, because it is shown in
                    full only that one time.
                  </p>
                </div>
              )}
            </form>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-light shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted hover:text-foreground disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20 disabled:opacity-60 transition-shadow"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isEditing ? "Save changes" : "Create endpoint"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Replaces the old event picker. There is nothing to choose any more, so this
 * simply sets the expectation of what will land on the URL.
 */
function WhatYouWillReceive() {
  return (
    <div>
      <p className="text-xs font-bold text-foreground">What you will receive</p>
      <p className="text-[11px] text-muted mt-0.5 mb-2.5">
        Every status change on your orders, pushed as it happens. No setup needed.
      </p>
      <div className="rounded-xl border border-border-light bg-background-elevated divide-y divide-border-light">
        {LIFECYCLE_EVENTS.map((entry) => (
          <div key={entry.event} className="flex items-baseline gap-3 px-3.5 py-1.5">
            <span className="text-xs font-semibold text-foreground w-32 shrink-0">
              {entry.label}
            </span>
            <span className="text-[11px] text-muted truncate">{entry.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
