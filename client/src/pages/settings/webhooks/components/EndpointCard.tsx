import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  KeyRound,
  Loader2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Send,
  Trash2,
} from "lucide-react";
import { DELIVERY_STATUS, timeAgo } from "../config";
import type { DeliveryStatus, WebhookDelivery, WebhookEndpoint } from "../types";

/** Everything the card needs to know about how this endpoint has been doing. */
export interface EndpointHealth {
  lastDelivery: WebhookDelivery | null;
  failing: number;
  delivered: number;
}

interface EndpointCardProps {
  endpoint: WebhookEndpoint;
  health: EndpointHealth;
  onEdit: () => void;
  onDelete: () => void;
  onViewLog: () => void;
  onTest: () => void;
  onRotate: () => void;
  onToggleActive: () => void;
  isTesting: boolean;
  isToggling: boolean;
}

export function EndpointCard({
  endpoint,
  health,
  onEdit,
  onDelete,
  onViewLog,
  onTest,
  onRotate,
  onToggleActive,
  isTesting,
  isToggling,
}: EndpointCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasTrouble = endpoint.isActive && health.failing > 0;

  return (
    <div
      className={`rounded-2xl border bg-background-elevated overflow-hidden transition-colors ${
        hasTrouble ? "border-error-border" : "border-border-light"
      }`}
    >
      {/* Trouble banner — the one thing that must never be missed */}
      {hasTrouble && (
        <div className="flex items-start gap-2.5 bg-error-bg px-4 py-2.5 border-b border-error-border">
          <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-foreground">
              {health.failing} recent {health.failing === 1 ? "event" : "events"} did not get
              through
            </p>
            {health.lastDelivery?.error && (
              <p className="text-[11px] text-muted truncate font-mono">
                {health.lastDelivery.error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onViewLog}
            className="ml-auto shrink-0 text-[11px] font-bold text-error hover:underline"
          >
            See why
          </button>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  endpoint.isActive ? "bg-success" : "bg-tertiary"
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                {endpoint.isActive ? "Active" : "Paused"}
              </span>
              {endpoint.description && (
                <span className="text-[10px] text-tertiary truncate">
                  · {endpoint.description}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground font-mono break-all leading-snug">
              {endpoint.url}
            </p>
          </div>

          {/* Actions */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-primary/[0.06] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-border-light bg-background shadow-xl z-20 py-1">
                <MenuItem icon={Pencil} label="Edit URL and events" onClick={onEdit} />
                <MenuItem
                  icon={endpoint.isActive ? Pause : Play}
                  label={endpoint.isActive ? "Pause deliveries" : "Resume deliveries"}
                  hint={endpoint.isActive ? "Keeps the endpoint and its history" : undefined}
                  onClick={onToggleActive}
                  busy={isToggling}
                />
                <MenuItem
                  icon={KeyRound}
                  label="Rotate signing secret"
                  hint="The old secret stops working at once"
                  onClick={onRotate}
                />
                <div className="my-1 border-t border-border-light" />
                <MenuItem icon={Trash2} label="Delete endpoint" onClick={onDelete} danger />
              </div>
            )}
          </div>
        </div>

        {/* Last result + actions */}
        <div className="flex items-center justify-between gap-3 mt-3.5 pt-3.5 border-t border-border-light flex-wrap">
          <LastResult health={health} isActive={endpoint.isActive} />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTest}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-muted hover:text-foreground hover:bg-primary/[0.06] disabled:opacity-60 transition-colors"
            >
              {isTesting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              Send test
            </button>
            <button
              type="button"
              onClick={onViewLog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-primary border border-primary/30 hover:bg-primary/[0.06] transition-colors"
            >
              <History className="w-3 h-3" />
              View log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LastResult({ health, isActive }: { health: EndpointHealth; isActive: boolean }) {
  if (!isActive) {
    return (
      <p className="text-[11px] text-muted">
        Paused — events are not sent while this is off.
      </p>
    );
  }

  if (!health.lastDelivery) {
    return <p className="text-[11px] text-muted">No events sent to this endpoint yet.</p>;
  }

  const presentation =
    DELIVERY_STATUS[health.lastDelivery.status as DeliveryStatus] ?? DELIVERY_STATUS.pending;
  const Icon = health.failing > 0 ? presentation.icon : CheckCircle2;

  return (
    <p className="flex items-center gap-1.5 text-[11px] text-muted min-w-0">
      <Icon className={`w-3 h-3 shrink-0 ${presentation.text}`} />
      <span className="truncate">
        Last event {presentation.label.toLowerCase()} {timeAgo(health.lastDelivery.createdAt)}
      </span>
    </p>
  );
}

function MenuItem({
  icon: Icon,
  label,
  hint,
  onClick,
  danger,
  busy,
}: {
  icon: typeof Pencil;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${
        danger ? "text-error hover:bg-error-bg" : "text-foreground hover:bg-primary/[0.06]"
      }`}
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 shrink-0 mt-0.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      )}
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{label}</span>
        {hint && <span className="block text-[10px] text-muted">{hint}</span>}
      </span>
    </button>
  );
}
