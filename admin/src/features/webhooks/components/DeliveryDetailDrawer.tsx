import { Button, Drawer, Tag, Tooltip } from "antd";
import { AlertTriangle, ArrowRight, Radar, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CopyButton } from "@/components/common/CopyButton";
import AppSpinner from "@/components/common/AppSpinner";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { useAdminDelivery, useAdminRedeliver } from "../queries";
import { MAX_ATTEMPTS, STATUS_META, eventLabel, explainFailure } from "../config";
import type { DeliveryStatus } from "../types";

interface DeliveryDetailDrawerProps {
  deliveryId: string | null;
  onClose: () => void;
}

/**
 * Everything about one attempt: what we sent, what came back, and — when it
 * failed — a plain-language read on whose problem it is.
 */
export default function DeliveryDetailDrawer({ deliveryId, onClose }: DeliveryDetailDrawerProps) {
  const { data: delivery, isLoading } = useAdminDelivery(deliveryId);
  const redeliverMutation = useAdminRedeliver();

  const status = delivery ? STATUS_META[delivery.status as DeliveryStatus] : null;
  const advice = delivery ? explainFailure(delivery.error, delivery.responseStatus) : null;

  async function handleRedeliver() {
    if (!delivery) return;
    try {
      await redeliverMutation.mutateAsync(delivery.id);
      toast.success("Redelivery queued — it will be attempted within a minute");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Could not queue a redelivery");
    }
  }

  return (
    <Drawer
      open={!!deliveryId}
      onClose={onClose}
      width={640}
      title={
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">
            {delivery ? eventLabel(delivery.event) : "Delivery"}
          </span>
          {status && (
            <Tag color={status.color} bordered={false} className="!m-0">
              {status.label}
            </Tag>
          )}
        </div>
      }
      styles={{ body: { padding: 0 } }}
    >
      {isLoading || !delivery ? (
        <div className="py-20">
          <AppSpinner />
        </div>
      ) : (
        <div className="px-5 py-4 space-y-5">
          {/* Verdict */}
          <div
            className={`rounded-xl border px-4 py-3 ${
              delivery.status === "success"
                ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                : "border-red-500/30 bg-red-500/[0.06]"
            }`}
          >
            <p className="text-xs font-semibold text-foreground">{status?.hint}</p>
            {delivery.error && (
              <p className="text-[11px] font-mono text-red-500 mt-1.5 break-words">
                {delivery.error}
              </p>
            )}
            {advice && (
              <p className="flex items-start gap-1.5 text-[11px] text-muted mt-1.5 leading-relaxed">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                {advice}
              </p>
            )}
            {delivery.status === "pending" && delivery.nextRetryAt && (
              <p className="text-[11px] text-muted mt-1.5">
                Next attempt around {formatDateTime(delivery.nextRetryAt)}.
              </p>
            )}
          </div>

          {/* Facts */}
          <Facts
            rows={[
              ["Seller", delivery.seller?.name ?? "—", delivery.seller?.id ? `/users-management/${delivery.seller.id}` : undefined],
              ["Endpoint", delivery.url],
              ["Event", `${delivery.event} · ${delivery.payload?.api_version ?? "—"}`],
              ["Event ID", delivery.payload?.id ?? "—"],
              ["Delivery ID", delivery.id],
              ["Attempts", `${delivery.attempts} of ${MAX_ATTEMPTS}`],
              ["Response", delivery.responseStatus != null ? `HTTP ${delivery.responseStatus}` : "No response"],
              ["First queued", `${formatDateTime(delivery.createdAt)} (${timeAgo(delivery.createdAt)})`],
              ["Last attempt", `${formatDateTime(delivery.updatedAt)} (${timeAgo(delivery.updatedAt)})`],
            ]}
          />

          {/* Shipment shortcuts */}
          {(delivery.orderId || delivery.awb) && (
            <div className="flex items-center gap-2 flex-wrap">
              {delivery.orderId && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-muted border border-border-light">
                  <span className="text-[10px] text-muted">Order</span>
                  <span className="text-[11px] font-mono text-foreground">{delivery.orderId}</span>
                  <CopyButton text={delivery.orderId} title="Copy order ID" />
                </span>
              )}
              {delivery.awb && (
                <Tooltip title="Open in order tracking">
                  <Link
                    to={`/order-tracking?mode=awb&q=${encodeURIComponent(delivery.awb)}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-muted border border-border-light no-underline"
                  >
                    <Radar size={12} className="text-muted" />
                    <span className="text-[11px] font-mono text-primary">{delivery.awb}</span>
                  </Link>
                </Tooltip>
              )}
            </div>
          )}

          <Payload
            title="Request body we POSTed"
            subtitle="Signed with the seller's secret on the X-Searchcraft-Signature header"
            content={JSON.stringify(delivery.payload, null, 2)}
          />

          <Payload
            title="Response from the seller's server"
            subtitle={
              delivery.responseStatus != null
                ? `HTTP ${delivery.responseStatus} · first 1000 characters`
                : "No response was received"
            }
            content={
              delivery.responseBody?.trim() || delivery.error || "(empty response body)"
            }
          />

          {delivery.status !== "success" && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="primary"
                icon={<RefreshCw size={13} />}
                loading={redeliverMutation.isPending}
                onClick={handleRedeliver}
              >
                Resend this event
              </Button>
              {delivery.endpoint && !delivery.endpoint.isActive && (
                <span className="text-[11px] text-muted">
                  The endpoint is paused — resume it first.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

/** Rows worth copying: identifiers you paste into a ticket or a grep. */
const COPYABLE = new Set(["Endpoint", "Event", "Event ID", "Delivery ID"]);

function Facts({ rows }: { rows: Array<[string, string, string?]> }) {
  return (
    <div className="rounded-xl border border-border-light divide-y divide-border-light">
      {rows.map(([label, value, href]) => (
        <div key={label} className="flex items-start gap-3 px-3.5 py-2">
          <span className="text-[11px] text-muted w-28 shrink-0">{label}</span>
          <span className="min-w-0 flex-1 flex items-center gap-1">
            {href ? (
              <Link
                to={href}
                className="text-[11px] text-primary hover:underline truncate no-underline inline-flex items-center gap-1"
              >
                {value}
                <ArrowRight size={11} />
              </Link>
            ) : (
              <span className="text-[11px] text-foreground font-mono truncate" title={value}>
                {value}
              </span>
            )}
            {!href && COPYABLE.has(label) && value !== "—" && (
              <CopyButton text={value} title={`Copy ${label}`} />
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function Payload({
  title,
  subtitle,
  content,
}: {
  title: string;
  subtitle: string;
  content: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-foreground">{title}</p>
          <p className="text-[10px] text-muted truncate">{subtitle}</p>
        </div>
        <CopyButton text={content} title="Copy" />
      </div>
      <pre className="max-h-72 overflow-auto rounded-xl border border-border-light bg-surface-muted px-3 py-2.5 text-[11px] leading-relaxed text-foreground font-mono whitespace-pre-wrap break-words">
        {content}
      </pre>
    </div>
  );
}
