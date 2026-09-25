import { Tag, Tooltip } from "antd";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { CopyButton } from "@/components/common/CopyButton";
import { timeAgo } from "@/lib/utils";
import { explainFailure } from "../config";
import type { WebhookHealth } from "../types";

interface HealthPanelProps {
  health?: WebhookHealth;
  /** Jump the deliveries tab to one endpoint's failures. */
  onInspectEndpoint: (webhookId: string) => void;
}

/**
 * The answer to "is anything broken", above everything else on the page.
 *
 * When nothing is failing this collapses to a single reassuring line — an ops
 * screen that shouts every time it loads stops being read.
 */
export function HealthPanel({ health, onInspectEndpoint }: HealthPanelProps) {
  if (!health) return null;

  const { totals, endpoints, failingEndpoints, topErrors } = health;
  const healthy = endpoints.failing === 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          value={totals.delivered.toLocaleString("en-IN")}
          label="delivered"
        />
        <Metric
          icon={AlertTriangle}
          iconColor={totals.failed > 0 ? "text-red-500" : "text-muted"}
          value={totals.failed.toLocaleString("en-IN")}
          label="gave up after 5 tries"
          tone={totals.failed > 0 ? "danger" : undefined}
        />
        <Metric
          icon={Clock}
          iconColor={totals.pending > 0 ? "text-purple-500" : "text-muted"}
          value={totals.pending.toLocaleString("en-IN")}
          label="waiting to retry"
        />
        <Metric
          icon={TrendingUp}
          iconColor="text-primary"
          value={totals.successRate == null ? "—" : `${totals.successRate}%`}
          label="of settled deliveries got through"
        />
      </div>

      {healthy ? (
        <div className="flex items-center gap-2 rounded-xl border border-border-light bg-background-elevated px-4 py-3">
          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
          <p className="text-xs text-foreground">
            Every endpoint is delivering.{" "}
            <span className="text-muted">
              {endpoints.active} active, {endpoints.paused} paused.
            </span>
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/20">
            <AlertTriangle size={15} className="text-red-500 shrink-0" />
            <p className="text-xs font-semibold text-foreground">
              {endpoints.failing} {endpoints.failing === 1 ? "endpoint is" : "endpoints are"} not
              receiving events
            </p>
          </div>

          <div className="divide-y divide-red-500/10">
            {failingEndpoints.slice(0, 5).map((endpoint) => {
              const advice = explainFailure(endpoint.lastError, endpoint.lastResponseStatus);
              return (
                <div
                  key={endpoint.webhookId}
                  className="flex items-start gap-3 px-4 py-2.5 flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {endpoint.seller?.name ?? "Unknown seller"}
                      </span>
                      <Tag color="red" bordered={false} className="!text-[10px] !leading-4 !m-0">
                        {endpoint.failed} failed
                      </Tag>
                    </div>
                    <div className="flex items-center gap-1 min-w-0 mt-0.5">
                      <span className="text-[11px] text-muted font-mono truncate">
                        {endpoint.url}
                      </span>
                      <CopyButton text={endpoint.url} title="Copy endpoint URL" />
                    </div>
                    {endpoint.lastError && (
                      <Tooltip title={advice ?? undefined}>
                        <p className="text-[11px] text-red-500 font-mono truncate mt-0.5">
                          {endpoint.lastError}
                        </p>
                      </Tooltip>
                    )}
                    {advice && (
                      <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{advice}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-muted whitespace-nowrap">
                      {endpoint.lastFailedAt ? timeAgo(endpoint.lastFailedAt) : "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onInspectEndpoint(endpoint.webhookId)}
                      className="text-[11px] font-semibold text-primary hover:underline whitespace-nowrap"
                    >
                      View log
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {failingEndpoints.length > 5 && (
            <p className="px-4 py-2 text-[11px] text-muted border-t border-red-500/10">
              and {failingEndpoints.length - 5} more — filter the delivery log by Failed to see
              them all.
            </p>
          )}
        </div>
      )}

      {topErrors.length > 0 && (
        <div className="rounded-xl border border-border-light bg-background-elevated px-4 py-3">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">
            Most common failure reasons
          </p>
          <div className="flex flex-wrap gap-2">
            {topErrors.map((entry, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-muted border border-border-light"
              >
                <span className="text-[11px] font-mono text-foreground max-w-[22rem] truncate">
                  {entry.error ?? "Unknown"}
                </span>
                <span className="text-[10px] font-bold text-muted tabular-nums">
                  ×{entry.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  iconColor,
  value,
  label,
  tone,
}: {
  icon: typeof CheckCircle2;
  iconColor: string;
  value: string;
  label: string;
  tone?: "danger";
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        tone === "danger"
          ? "border-red-500/30 bg-red-500/[0.06]"
          : "border-border-light bg-background-elevated"
      }`}
    >
      <Icon size={15} className={iconColor} />
      <p className="text-xl font-semibold text-foreground tabular-nums leading-none mt-2">
        {value}
      </p>
      <p className="text-[11px] text-muted mt-1 leading-snug">{label}</p>
    </div>
  );
}
