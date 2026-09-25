import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Settings as SettingsIcon } from "lucide-react";
import {
  useNotifications,
  useUnreadCount,
  useMarkAllRead,
  useMarkRead,
} from "./queries";
import { formatKeyword, timeAgo } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  orders: "text-primary bg-primary/10",
  payments: "text-accent bg-accent/10",
  account: "text-emerald-600 bg-emerald-500/10",
  support: "text-sky-600 bg-sky-500/10",
  system: "text-muted bg-muted/10",
};

export default function NotificationsInboxPage() {
  const { data, isLoading } = useNotifications({ limit: 100 });
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAllRead = useMarkAllRead();
  const markRead = useMarkRead();
  const navigate = useNavigate();

  const items = data?.items ?? [];

  const handleClick = (id: string, readAt: string | null, link?: string) => {
    if (!readAt) markRead.mutate(id);
    if (link) navigate(link);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-xs text-muted mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-background-elevated border border-border-light rounded-lg hover:border-primary/40 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <Link
            to="/notifications/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-background-elevated border border-border-light rounded-lg hover:border-primary/40 transition-colors no-underline"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            Preferences
          </Link>
        </div>
      </div>

      <div className="bg-background-elevated border border-border-light rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <Bell className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm text-foreground font-medium">No notifications yet</p>
            <p className="text-xs text-muted mt-1">
              Updates about orders, sellers and account events will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border-light">
            {items.map((n) => (
              <li
                key={n.id}
                onClick={() => handleClick(n.id, n.readAt, n.link)}
                className={`px-4 sm:px-5 py-4 cursor-pointer transition-colors hover:bg-primary/[0.03] ${
                  !n.readAt ? "bg-primary/[0.02]" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      !n.readAt ? "bg-accent" : "bg-transparent"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                            CATEGORY_COLORS[n.category] ?? CATEGORY_COLORS.system
                          }`}
                        >
                          {formatKeyword(n.category)}
                        </span>
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      </div>
                      <span className="text-[11px] text-muted shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted mt-1">{n.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
