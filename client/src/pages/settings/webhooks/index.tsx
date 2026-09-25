import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  History,
  Loader2,
  Plus,
  Webhook,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCreateWebhook,
  useDeleteWebhook,
  useRotateSecret,
  useSendTestWebhook,
  useUpdateWebhook,
  useWebhookDeliveries,
  useWebhooks,
} from "./queries";
import { docsUrl, MAX_ATTEMPTS, RETRY_SCHEDULE } from "./config";
import { EndpointCard, type EndpointHealth } from "./components/EndpointCard";
import { EndpointFormDrawer } from "./components/EndpointFormDrawer";
import { SecretModal } from "./components/SecretModal";
import { DeliveryLogDrawer } from "./components/DeliveryLogDrawer";
import { TestWebhookModal } from "./components/TestWebhookModal";
import type { WebhookEndpoint, WebhookFormValues } from "./types";

/** How many recent deliveries the health strip and per-card summary look at. */
const HEALTH_WINDOW = 100;

function apiError(err: unknown, fallback: string): string {
  const response = (err as { response?: { data?: { error?: string; message?: string } } })?.response;
  return response?.data?.error ?? response?.data?.message ?? fallback;
}

export default function WebhooksPage() {
  const navigate = useNavigate();

  const { data: endpoints = [], isLoading } = useWebhooks();
  const { data: recent } = useWebhookDeliveries({ limit: HEALTH_WINDOW });

  const createMutation = useCreateWebhook();
  const updateMutation = useUpdateWebhook();
  const deleteMutation = useDeleteWebhook();
  const rotateMutation = useRotateSecret();
  const testMutation = useSendTestWebhook();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookEndpoint | null>(null);
  const [logFor, setLogFor] = useState<WebhookEndpoint | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpoint | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<{ secret: string; reason: "created" | "rotated" } | null>(null);
  const [testTarget, setTestTarget] = useState<WebhookEndpoint | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  /**
   * Health is derived from one page of recent deliveries rather than a second
   * round of per-endpoint queries — the seller reads it as "how are things
   * going right now", which is exactly what the latest events describe.
   */
  const { healthByEndpoint, totals } = useMemo(() => {
    const deliveries = recent?.deliveries ?? [];
    const byEndpoint = new Map<string, EndpointHealth>();
    let delivered = 0;
    let failing = 0;

    for (const delivery of deliveries) {
      const entry = byEndpoint.get(delivery.webhookId) ?? {
        lastDelivery: null,
        failing: 0,
        delivered: 0,
      };
      // Deliveries arrive newest-first, so the first one we see is the latest.
      if (!entry.lastDelivery) entry.lastDelivery = delivery;

      if (delivery.status === "success") {
        entry.delivered += 1;
        delivered += 1;
      } else if (delivery.status === "failed" || delivery.status === "pending") {
        entry.failing += 1;
        failing += 1;
      }
      byEndpoint.set(delivery.webhookId, entry);
    }

    return {
      healthByEndpoint: byEndpoint,
      totals: { delivered, failing, count: deliveries.length },
    };
  }, [recent]);

  const activeCount = endpoints.filter((e) => e.isActive).length;

  // Anything that is currently failing sorts to the top — a broken integration
  // should never be below the fold behind healthy ones.
  const orderedEndpoints = useMemo(() => {
    return [...endpoints].sort((a, b) => {
      const aBroken = a.isActive && (healthByEndpoint.get(a.id)?.failing ?? 0) > 0;
      const bBroken = b.isActive && (healthByEndpoint.get(b.id)?.failing ?? 0) > 0;
      if (aBroken !== bBroken) return aBroken ? -1 : 1;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [endpoints, healthByEndpoint]);

  /* ── Handlers ── */

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(endpoint: WebhookEndpoint) {
    setEditing(endpoint);
    setFormOpen(true);
  }

  function openLog(endpoint: WebhookEndpoint | null) {
    setLogFor(endpoint);
    setLogOpen(true);
  }

  async function handleSubmit(values: WebhookFormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload: values });
        toast.success("Endpoint updated");
        setFormOpen(false);
      } else {
        const created = await createMutation.mutateAsync(values);
        setFormOpen(false);
        setRevealedSecret({ secret: created.secret, reason: "created" });
      }
    } catch (err) {
      toast.error(apiError(err, "Could not save the endpoint"));
    }
  }

  /** The modal renders the outcome itself, so errors bubble rather than toast. */
  function handleTest(event: string) {
    return testMutation.mutateAsync({ id: testTarget!.id, event });
  }

  async function handleToggleActive(endpoint: WebhookEndpoint) {
    setTogglingId(endpoint.id);
    try {
      await updateMutation.mutateAsync({
        id: endpoint.id,
        payload: { isActive: !endpoint.isActive },
      });
      toast.success(endpoint.isActive ? "Deliveries paused" : "Deliveries resumed");
    } catch (err) {
      toast.error(apiError(err, "Could not update the endpoint"));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleRotate(endpoint: WebhookEndpoint) {
    try {
      const updated = await rotateMutation.mutateAsync(endpoint.id);
      setRevealedSecret({ secret: updated.secret, reason: "rotated" });
    } catch (err) {
      toast.error(apiError(err, "Could not rotate the secret"));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Endpoint deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(apiError(err, "Could not delete the endpoint"));
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 animate-fade-in-up flex-wrap">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-primary/[0.06] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Webhooks</h1>
            <p className="text-xs text-muted">
              Get shipment updates pushed to your system the moment they happen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={docsUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-muted hover:text-foreground hover:bg-primary/[0.06] transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">API docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          {endpoints.length > 0 && (
            <button
              type="button"
              onClick={() => openLog(null)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-primary border border-primary/30 hover:bg-primary/[0.06] transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">All events</span>
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/25 transition-shadow"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add endpoint</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : endpoints.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <div className="space-y-4">
          {/* Health strip */}
          {totals.count > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Stat
                icon={Webhook}
                iconClass="text-primary"
                value={activeCount}
                label={`active ${activeCount === 1 ? "endpoint" : "endpoints"}`}
              />
              <Stat
                icon={CheckCircle2}
                iconClass="text-success"
                value={totals.delivered}
                label="delivered"
              />
              <Stat
                icon={XCircle}
                iconClass={totals.failing > 0 ? "text-error" : "text-tertiary"}
                value={totals.failing}
                label="not delivered"
                onClick={totals.failing > 0 ? () => openLog(null) : undefined}
              />
            </div>
          )}
          {totals.count > 0 && (
            <p className="text-[11px] text-tertiary -mt-1">
              Across your last {totals.count} {totals.count === 1 ? "event" : "events"}.
            </p>
          )}

          {orderedEndpoints.map((endpoint) => (
            <EndpointCard
              key={endpoint.id}
              endpoint={endpoint}
              health={
                healthByEndpoint.get(endpoint.id) ?? {
                  lastDelivery: null,
                  failing: 0,
                  delivered: 0,
                }
              }
              onEdit={() => openEdit(endpoint)}
              onDelete={() => setDeleteTarget(endpoint)}
              onViewLog={() => openLog(endpoint)}
              onTest={() => setTestTarget(endpoint)}
              onRotate={() => handleRotate(endpoint)}
              onToggleActive={() => handleToggleActive(endpoint)}
              isTesting={testTarget?.id === endpoint.id && testMutation.isPending}
              isToggling={togglingId === endpoint.id}
            />
          ))}

          <HowItWorks />
        </div>
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-3 rounded-xl shadow-lg flex items-center gap-4 z-50 max-w-[calc(100vw-2rem)]"
          >
            <span className="text-sm min-w-0">
              Delete this endpoint and its delivery history?
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-background/60 hover:text-background disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors"
              >
                {deleteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EndpointFormDrawer
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        editing={editing}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <SecretModal
        secret={revealedSecret?.secret ?? null}
        reason={revealedSecret?.reason ?? "created"}
        onClose={() => setRevealedSecret(null)}
      />

      <TestWebhookModal
        endpoint={testTarget}
        onClose={() => setTestTarget(null)}
        onSend={handleTest}
        isSending={testMutation.isPending}
      />

      <DeliveryLogDrawer isOpen={logOpen} onClose={() => setLogOpen(false)} endpoint={logFor} />
    </div>
  );
}

/* ─────────────────────────── Presentational ────────────────────────────── */

function Stat({
  icon: Icon,
  iconClass,
  value,
  label,
  onClick,
}: {
  icon: typeof Webhook;
  iconClass: string;
  value: number;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Icon className={`w-4 h-4 ${iconClass}`} />
      <span className="text-lg font-bold text-foreground tabular-nums leading-none mt-2">
        {value}
      </span>
      <span className="text-[11px] text-muted mt-1">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col items-start rounded-xl border border-error-border bg-error-bg px-4 py-3 text-left hover:opacity-80 transition-opacity"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start rounded-xl border border-border-light bg-background-elevated px-4 py-3">
      {content}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-border-light bg-background-elevated px-6 py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Webhook className="w-5 h-5 text-primary" />
      </div>
      <h2 className="text-base font-bold text-foreground">Stop polling for order status</h2>
      <p className="text-xs text-muted mt-1.5 max-w-md mx-auto leading-relaxed">
        Register one URL. We POST every status change on your orders to it as it happens —
        booked, picked up, out for delivery, delivered, failed attempts and returns.
      </p>
      <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20 transition-shadow"
        >
          <Plus className="w-4 h-4" />
          Add your first endpoint
        </button>
        <a
          href={docsUrl()}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-primary border border-primary/30 hover:bg-primary/[0.06] transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Read the docs
        </a>
      </div>
    </div>
  );
}

function HowItWorks() {
  const points = [
    {
      title: "Answer fast, process later",
      body: "Return any 2xx as soon as you have stored the event. We wait 10 seconds before calling it a failure.",
    },
    {
      title: `We retry ${MAX_ATTEMPTS} times`,
      body: `A failed delivery is retried ${RETRY_SCHEDULE}. The schedule survives our deploys, so nothing is silently dropped.`,
    },
    {
      title: "Verify the signature",
      body: "Every request carries an X-Searchcraft-Signature header computed with your secret. Check it before trusting the body.",
    },
    {
      title: "Expect repeats, not order",
      body: "The same event can arrive twice — de-duplicate on the envelope id. Couriers backfill scans, so trust event_timestamp over arrival order.",
    },
  ];

  return (
    <div className="rounded-2xl border border-border-light bg-surface-muted px-5 py-5">
      <h3 className="text-xs font-bold text-foreground mb-3">Good to know</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {points.map((point) => (
          <div key={point.title}>
            <p className="text-[11px] font-bold text-foreground">{point.title}</p>
            <p className="text-[11px] text-muted leading-relaxed mt-0.5">{point.body}</p>
          </div>
        ))}
      </div>
      <a
        href={docsUrl()}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 mt-4 text-[11px] font-bold text-primary hover:underline"
      >
        Full webhook reference
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
