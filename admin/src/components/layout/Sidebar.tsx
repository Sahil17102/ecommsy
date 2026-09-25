import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { visibleSidebarConfig, isGroup, type NavItem, type NavGroup } from "./sidebarConfig";
import { AppLogo } from "@/components/common/AppLogo";
import { useIsSuperadmin } from "@/contexts/AuthContext";

/* ── Single nav link ── */

function SidebarNavLink({ item, onClick, collapsed }: { item: NavItem; onClick?: () => void; collapsed?: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          collapsed ? "justify-center" : ""
        } ${
          isActive
            ? "bg-primary-bg text-primary"
            : "text-muted hover:text-foreground hover:bg-surface-muted"
        }`
      }
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

/* ── Collapsible group ── */

function SidebarNavGroup({
  group,
  isOpen,
  onToggle,
  onItemClick,
  collapsed,
}: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  onItemClick?: () => void;
  collapsed?: boolean;
}) {
  const location = useLocation();
  const Icon = group.icon;
  const hasActiveChild = group.items.some((item) => location.pathname === item.path);

  // Collapsed: show only the group icon
  if (collapsed) {
    return (
      <NavLink
        to={group.items[0].path}
        title={group.label}
        onClick={onItemClick}
        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          hasActiveChild
            ? "bg-primary-bg text-primary"
            : "text-muted hover:text-foreground hover:bg-surface-muted"
        }`}
      >
        <Icon size={18} className="shrink-0" />
      </NavLink>
    );
  }

  return (
    <div>
      {/* Group header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          hasActiveChild
            ? "text-primary"
            : "text-muted hover:text-foreground hover:bg-surface-muted"
        }`}
      >
        <Icon size={18} className="shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="shrink-0"
        >
          <ChevronRight size={14} className="text-tertiary" />
        </motion.span>
      </button>

      {/* Collapsible children */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pl-4 mt-0.5 space-y-0.5 border-l border-border-light ml-[21px]">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                      isActive
                        ? "text-primary font-medium bg-primary-bg"
                        : "text-muted hover:text-foreground hover:bg-surface-muted"
                    }`
                  }
                >
                  <item.icon size={15} className="shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sidebar content (shared between desktop & mobile) ── */

function SidebarContent({ onItemClick, collapsed }: { onItemClick?: () => void; collapsed?: boolean }) {
  const location = useLocation();
  const isSuperadmin = useIsSuperadmin();
  const config = useMemo(() => visibleSidebarConfig(isSuperadmin), [isSuperadmin]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    config.forEach((entry) => {
      if (isGroup(entry) && entry.items.some((item) => location.pathname === item.path)) {
        initial.add(entry.label);
      }
    });
    return initial;
  });

  // Auto-expand when navigating to a child route
  useEffect(() => {
    config.forEach((entry) => {
      if (isGroup(entry) && entry.items.some((item) => location.pathname === item.path)) {
        setOpenGroups((prev) => {
          if (prev.has(entry.label)) return prev;
          return new Set(prev).add(entry.label);
        });
      }
    });
  }, [location.pathname, config]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {config.map((entry) => {
        if (isGroup(entry)) {
          return (
            <SidebarNavGroup
              key={entry.label}
              group={entry}
              isOpen={openGroups.has(entry.label)}
              onToggle={() => toggleGroup(entry.label)}
              onItemClick={onItemClick}
              collapsed={collapsed}
            />
          );
        }
        return <SidebarNavLink key={entry.path} item={entry} onClick={onItemClick} collapsed={collapsed} />;
      })}
    </nav>
  );
}

/* ── Main sidebar ── */

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
}

export default function Sidebar({ mobileOpen, onMobileClose, collapsed }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-background-elevated border-r border-border-light h-screen sticky top-0 shrink-0 transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-[68px]" : "w-60"
      }`}>
        {/* Header */}
        <div className={`flex items-center h-14 px-4 border-b border-border-light shrink-0 ${collapsed ? "justify-center px-2" : ""}`}>
          <AppLogo size="sm" showText={!collapsed} />
        </div>

        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              drag="x"
              dragConstraints={{ left: -260, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) onMobileClose();
              }}
              className="fixed inset-y-0 left-0 w-60 bg-background-elevated z-50 shadow-xl lg:hidden flex flex-col"
            >
              <div className="flex items-center h-14 px-4 border-b border-border-light shrink-0">
                <AppLogo size="sm" />
              </div>

              <SidebarContent onItemClick={onMobileClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
