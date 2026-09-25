import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ChevronUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarUserMenuProps {
  collapsed?: boolean;
}

export function SidebarUserMenu({ collapsed }: SidebarUserMenuProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  if (collapsed) {
    return (
      <div className="relative border-t border-border-light p-3 flex flex-col items-center gap-2" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          title={user?.name ?? "User"}
          className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/15 transition-colors duration-150"
        >
          <span className="text-xs font-semibold text-primary">{initials}</span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-2 mb-2 w-36 bg-background-elevated border border-border-light rounded-lg shadow-lg overflow-hidden z-10"
            >
              <div className="px-3 py-2 border-b border-border-light">
                <p className="text-[13px] font-medium text-foreground truncate">{user?.name ?? "User"}</p>
                <p className="text-[11px] text-muted truncate">{user?.email ?? user?.phone ?? ""}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-[13px] font-medium text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative border-t border-border-light p-3" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-background transition-colors duration-150 text-left"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-primary">{initials}</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-foreground truncate leading-tight">
            {user?.name ?? "User"}
          </p>
          <p className="text-[11px] text-muted truncate leading-tight">
            {user?.email ?? user?.phone ?? ""}
          </p>
        </div>

        <ChevronUp
          className={`w-3.5 h-3.5 text-tertiary shrink-0 transition-transform duration-150 ${
            open ? "" : "rotate-180"
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-3 right-3 mb-2 bg-background-elevated border border-border-light rounded-lg shadow-lg overflow-hidden z-10"
          >
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-[13px] font-medium text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors duration-150"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
