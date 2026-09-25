import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/common";
import { animationConfig } from "@/config/animations";
import { useRedeliver, useWebhookDeliveries } from "../queries";
import { DELIVERY_STATUS, MAX_ATTEMPTS, eventLabel, formatDateTime, timeAgo, timeUntil } from "../config";
import type { DeliveryStatus, WebhookDelivery, WebhookEndpoint } from "../types";

interface DeliveryLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** null renders the log across every endpoint. */
  endpoint: WebhookEndpoint | null;
}

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "failed", label: "Failed" },
  { key: "pending", label: "Retrying" },
  { key: "success", label: "Delivered" },
];

const PAGE_SIZE = 20;

export function DeliveryLogDrawer({ isOpen, onClose, endpoint }: DeliveryLogDrawerProps) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStatus("");
    setPage(1);
    setExpandedId(null);
  }, [isOpen, endpoint?.id]);

  const { data, isLoading, isFetching } = useWebhookDeliveries(
    { webhookId: endpoint?.id, status: status || undefined, page, limit: PAGE_SIZE },
    isOpen,
  );

  const deliveries = data?.deliveries ?? [];
  const pagination = data?.pagination;

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
            className="fixed right-0 top-0 h-full w-full max-w-3xl bg-background z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border-light shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <History className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-foreground">Delivery log</h2>
                  <p className="text-[11px] text-muted font-mono truncate">
                    {endpoint?.url ?? "All endpoints"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-primary/[0.06] transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border-light shrink-0 flex-wrap">
              <div className="flex items-center gap-1">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => {
                      setStatus(filter.key);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      status === filter.key
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:text-foreground hover:bg-primary/[0.06]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted">
                {isFetching && !isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Auto-refreshing every 15s</span>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : deliveries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <History className="w-8 h-8 text-tertiary mb-3" />
                  <p className="text-sm font-semibold text-foreground">
                    {status ? "Nothing matches this filter" : "No events sent yet"}
                  </p>
                  <p className="text-xs text-muted mt-1 max-w-xs">
                    {status
                      ? "Try another filter."
                      : "Once a shipment moves, every event we push shows up here with the exact response your server gave."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border-light">
                  {deliveries.map((delivery) => (
                    <DeliveryRow
                      key={delivery.id}
                      delivery={delivery}
                      expanded={expandedId === delivery.id}
                      onToggle={() =>
                        setExpandedId(expandedId === delivery.id ? null : delivery.id)
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border-light shrink-0">
                <p className="text-[11px] text-muted">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} events
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-primary/[0.06] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-primary/[0.06] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────── Row ───────────────────────────────────── */

function DeliveryRow({
  delivery,
  expanded,
  onToggle,
}: {
  delivery: WebhookDelivery;
  expanded: boolean;
  onToggle: () => void;
}) {
  const redeliverMutation = useRedeliver();
  const presentation = DELIVERY_STATUS[delivery.status as DeliveryStatus] ?? DELIVERY_STATUS.pending;
  const Icon = presentation.icon;
  const orderId = (delivery.payload?.data?.order_id as string | undefined) ?? null;

  async function handleResend(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await redeliverMutation.mutateAsync(delivery.id);
      toast.success("Queued — we will retry within a minute");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Could not queue a resend");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-primary/[0.03] transition-colors"
      >
        <span
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold shrink-0 ${presentation.bg} ${presentation.text}`}
        >
          <Icon className="w-3 h-3" />
          {presentation.label}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-foreground truncate">
            {eventLabel(delivery.event)}
            {orderId && <span className="text-muted font-normal"> · {orderId}</span>}
          </span>
          <span className="block text-[11px] text-muted truncate">
            {timeAgo(delivery.createdAt)}
            {delivery.responseStatus != null && ` · HTTP ${delivery.responseStatus}`}
            {delivery.attempts > 1 && ` · attempt ${delivery.attempts} of ${MAX_ATTEMPTS}`}
          </span>
        </span>

        <ChevronDown
          className={`w-4 h-4 text-tertiary shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-surface-muted/50"
          >
            <div className="px-6 py-4 space-y-4 border-t border-border-light">
              {/* What it means */}
              <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 ${presentation.bg} ${presentation.border}`}>
                <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${presentation.text}`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-foreground">{presentation.hint}</p>
                  {delivery.error && (
                    <p className="text-[11px] text-muted mt-1 break-words">
                      Reason: <span className="font-mono">{delivery.error}</span>
                    </p>
                  )}
                  {delivery.status === "pending" && delivery.nextRetryAt && (
                    <p className="text-[11px] text-muted mt-1">
                      Next attempt {timeUntil(delivery.nextRetryAt)} ·{" "}
                      {formatDateTime(delivery.nextRetryAt)}
                    </p>
                  )}
                </div>
              </div>

              <DetailGrid delivery={delivery} />

              <Section
                title="What we sent"
                subtitle="The event body we sent, signed with your secret"
                copyText={JSON.stringify(delivery.payload, null, 2)}
              >
                {JSON.stringify(delivery.payload, null, 2)}
              </Section>

              <Section
                title="What your server replied"
                subtitle={
                  delivery.responseStatus != null
                    ? `HTTP ${delivery.responseStatus}`
                    : "No response received"
                }
                copyText={delivery.responseBody ?? ""}
              >
                {delivery.responseBody?.trim()
                  ? delivery.responseBody
                  : delivery.error ?? "(empty response body)"}
              </Section>

              {delivery.status !== "success" && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={redeliverMutation.isPending}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-primary border border-primary/30 hover:bg-primary/[0.06] disabled:opacity-60 transition-colors"
                >
                  {redeliverMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Send this event again
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailGrid({ delivery }: { delivery: WebhookDelivery }) {
  const rows: Array<[string, string]> = [
    ["Event ID", delivery.payload?.id ?? "—"],
    ["Delivery ID", delivery.id],
    ["First sent", formatDateTime(delivery.createdAt)],
    ["Last attempt", formatDateTime(delivery.updatedAt)],
    ["Attempts", `${delivery.attempts} of ${MAX_ATTEMPTS}`],
    ["Endpoint", delivery.url],
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-2 min-w-0">
          <span className="text-[11px] text-muted shrink-0 w-24">{label}</span>
          <span className="text-[11px] text-foreground font-mono truncate" title={value}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  subtitle,
  copyText,
  children,
}: {
  title: string;
  subtitle: string;
  copyText: string;
  children: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-foreground">{title}</p>
          <p className="text-[10px] text-muted truncate">{subtitle}</p>
        </div>
        {copyText && <CopyButton text={copyText} />}
      </div>
      <pre className="max-h-64 overflow-auto rounded-xl border border-border-light bg-background px-3 py-2.5 text-[11px] leading-relaxed text-foreground font-mono whitespace-pre-wrap break-words">
        {children}
      </pre>
    </div>
  );
}
