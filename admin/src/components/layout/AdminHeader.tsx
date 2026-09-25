import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Bell,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCheck,
  Settings as SettingsIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { getActiveLabel } from "./sidebarConfig";
import { useAuth } from "@/contexts/AuthContext";
import {
  useNotifications,
  useUnreadCount,
  useMarkAllRead,
  useMarkRead,
  NOTIFICATIONS_KEY,
  NOTIFICATIONS_UNREAD_KEY,
} from "@/features/notifications/queries";
import { connectSocket } from "@/lib/socket";
import type { User } from "@/features/auth/types";
import { timeAgo } from "@/lib/utils";

interface AdminHeaderProps {
  onMobileMenuOpen: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

function getDisplayName(user: User): string {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  return user.name ?? "Admin";
}

function getInitials(user: User | null): string {
  if (!user) return "AD";
  const name = getDisplayName(user);
  if (name !== "Admin") {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }
  return (user.email?.[0] ?? "A").toUpperCase();
}

export default function AdminHeader({ onMobileMenuOpen, sidebarCollapsed, onToggleSidebar }: AdminHeaderProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pageTitle = getActiveLabel(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const { user, logout, isLoggingOut } = useAuth();
  const qc = useQueryClient();

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data, isLoading } = useNotifications({ limit: 15 });
  const markAllRead = useMarkAllRead();
  const markRead = useMarkRead();

  const items = data?.items ?? [];

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

  useEffect(() => {
    if (!menuOpen && !bellOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (bellOpen && bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, bellOpen]);

  const handleItemClick = (id: string, readAt: string | null, link?: string) => {
    if (!readAt) markRead.mutate(id);
    setBellOpen(false);
    if (link) navigate(link);
  };

  return (
    <header className="sticky top-0 z-20 h-14 bg-background-elevated border-b border-border-light flex items-center justify-between px-4 sm:px-6 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-1">
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors duration-150"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex p-2 -ml-2 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors duration-150"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-[18px] h-[18px]" />
          ) : (
            <PanelLeftClose className="w-[18px] h-[18px]" />
          )}
        </button>
        <h1 className="text-sm font-semibold text-foreground ml-1">{pageTitle}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        <ThemeToggle />

        {/* Notification bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative p-2 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors duration-150"
            title="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-accent text-white rounded-full flex items-center justify-center ring-2 ring-background-elevated">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 mt-2 w-[360px] max-h-[480px] rounded-lg border border-border-light bg-background-elevated shadow-lg overflow-hidden flex flex-col">
              <div className="px-3 py-2.5 border-b border-border-light flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Notifications</span>
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
                    to="/notifications/settings"
                    onClick={() => setBellOpen(false)}
                    className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-background transition-colors"
                    title="Preferences"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="py-8 text-center text-xs text-muted">Loading…</div>
                ) : items.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-muted/40 mx-auto mb-2" />
                    <p className="text-xs text-muted">You're all caught up</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border-light">
                    {items.map((n) => (
                      <li
                        key={n.id}
                        onClick={() => handleItemClick(n.id, n.readAt, n.link)}
                        className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-background ${
                          !n.readAt ? "bg-primary/[0.04]" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                              !n.readAt ? "bg-accent" : "bg-transparent"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {n.title}
                              </p>
                              <span className="text-[10px] text-muted shrink-0">
                                {timeAgo(n.createdAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted mt-0.5 line-clamp-2">{n.body}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Link
                to="/notifications"
                onClick={() => setBellOpen(false)}
                className="px-3 py-2 border-t border-border-light text-xs text-primary font-medium hover:bg-background transition-colors duration-100 text-center no-underline"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>

        {/* Avatar + Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-primary-bg flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all duration-150"
          >
            <span className="text-xs font-semibold text-primary">{getInitials(user)}</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-lg border border-border-light bg-background-elevated shadow-lg py-1">
              {user && (
                <div className="px-3 py-2 border-b border-border-light">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {getDisplayName(user)}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {user.email ?? user.phone}
                  </p>
                </div>
              )}
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  try {
                    await logout();
                  } finally {
                    navigate("/login", { replace: true });
                  }
                }}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-background transition-colors duration-150 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
