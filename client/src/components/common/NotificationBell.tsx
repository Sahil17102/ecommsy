import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Settings as SettingsIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useNotifications,
  useUnreadCount,
  useMarkAllRead,
  useMarkRead,
  NOTIFICATIONS_KEY,
  NOTIFICATIONS_UNREAD_KEY,
} from "@/queries/useNotifications";
import { connectSocket } from "@/lib/socket";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo } from "@/lib/utils";

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: unreadData } = useUnreadCount();
  const { data, isLoading } = useNotifications({ limit: 15 });
  const markAllRead = useMarkAllRead();
  const markRead = useMarkRead();

  const unreadCount = unreadData ?? 0;
  const items = data?.items ?? [];

  // ── Socket connection for live updates ──
  useEffect(() => {
    if (!user) return;
    let socket;
    try {
      socket = connectSocket();
    } catch {
      return;
    }
    const onNew = () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_KEY });
    };
    socket.on("notification:new", onNew);
    return () => {
      socket?.off("notification:new", onNew);
    };
  }, [user, qc]);

  // ── Click outside ──
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleItemClick = (id: string, link?: string) => {
    markRead.mutate(id);
    setOpen(false);
    if (link) navigate(link);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors"
        title="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-accent text-[10px] font-semibold text-white rounded-full ring-2 ring-background-elevated flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-full sm:mt-1.5 sm:w-[380px] bg-background-elevated border border-border-light rounded-xl shadow-lg z-30 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    title="Mark all read"
                    className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-background transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <Link
                  to="/settings/notifications"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-background transition-colors"
                  title="Preferences"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[420px] overflow-y-auto">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-muted">Loading…</div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <Bell className="w-8 h-8 text-muted mx-auto mb-2 opacity-40" />
                  <p className="text-xs text-muted">You're all caught up</p>
                </div>
              ) : (
                <ul className="divide-y divide-border-light">
                  {items.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => handleItemClick(n.id, n.link)}
                      className={`px-4 py-3 cursor-pointer transition-colors hover:bg-primary/[0.04] ${
                        !n.readAt ? "bg-primary/[0.03]" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                            !n.readAt ? "bg-accent" : "bg-transparent"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                            <span className="text-[10px] text-muted shrink-0">{timeAgo(n.createdAt)}</span>
                          </div>
                          <p className="text-[11px] text-muted mt-0.5 line-clamp-2">{n.body}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border-light">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-primary/[0.04] transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                View all
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
