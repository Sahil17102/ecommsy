import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, MessageCircle } from "lucide-react";
import { formatKeyword } from "@/lib/utils";
import { useSupportTickets } from "@/queries/useSupport";
import type { TicketStatus } from "@/lib/supportApi";
import { NewTicketModal } from "./NewTicketModal";

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "text-emerald-600 bg-emerald-500/10",
  pending: "text-violet-600 bg-violet-500/10",
  resolved: "text-sky-600 bg-sky-500/10",
  closed: "text-muted bg-muted/10",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted bg-muted/10",
  medium: "text-sky-600 bg-sky-500/10",
  high: "text-violet-600 bg-violet-500/10",
  urgent: "text-rose-600 bg-rose-500/10",
};

const FILTERS: { label: string; value: TicketStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

export function SupportListPage() {
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const { data: tickets = [], isLoading } = useSupportTickets(
    status === "all" ? undefined : status,
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Help & Support</h1>
          <p className="text-xs text-muted mt-1">
            Questions, issues or feature requests — we're here.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New ticket
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              status === f.value
                ? "bg-primary text-white"
                : "bg-background-elevated border border-border-light text-muted hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-background-elevated border border-border-light rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-muted">Loading…</div>
        ) : tickets.length === 0 ? (
          <div className="py-20 text-center">
            <MessageCircle className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm text-foreground font-medium">No tickets yet</p>
            <p className="text-xs text-muted mt-1">Open one whenever you need help.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border-light">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/support/${t.id}`}
                  className="block px-4 sm:px-5 py-4 hover:bg-primary/[0.03] transition-colors no-underline"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {t.subject}
                        </p>
                        {t.unreadBySeller > 0 && (
                          <span className="text-[10px] font-semibold bg-accent text-white px-1.5 py-0.5 rounded-full">
                            {t.unreadBySeller} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1.5">
                        <span className="text-[11px] text-muted">{t.ticketNumber}</span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_COLORS[t.status]}`}
                        >
                          {t.status}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${PRIORITY_COLORS[t.priority]}`}
                        >
                          {t.priority}
                        </span>
                        <span className="text-[10px] text-muted">{formatKeyword(t.category)}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted shrink-0">
                      {new Date(t.lastMessageAt).toLocaleString()}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
