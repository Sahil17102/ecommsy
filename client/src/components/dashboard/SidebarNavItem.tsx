import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { NavChildItem } from "./sidebarConfig";

interface SidebarNavItemProps {
  label: string;
  href: string;
  icon: LucideIcon;
  collapsed?: boolean;
  onClick?: () => void;
  children?: NavChildItem[];
}

export function SidebarNavItem({ label, href, icon: Icon, collapsed, onClick, children }: SidebarNavItemProps) {
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isExactActive = href === "/home" ? pathname === "/home" : pathname === href;
  const isParentActive = !isExactActive && pathname.startsWith(href) && href !== "/home";
  const active = isExactActive || isParentActive;

  // Auto-expand when a child route is active
  useEffect(() => {
    if (children && isParentActive && !collapsed) {
      setExpanded(true);
    }
  }, [children, isParentActive, collapsed]);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popoverOpen]);

  // No children — simple nav item
  if (!children) {
    return (
      <Link
        to={href}
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 no-underline ${
          collapsed ? "justify-center" : ""
        } ${
          active
            ? "bg-primary/[0.08] text-primary"
            : "text-slate-600 dark:text-slate-400 hover:bg-background hover:text-foreground"
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
        )}
        <Icon
          className={`w-[18px] h-[18px] shrink-0 transition-colors duration-150 ${
            active ? "text-primary" : "text-slate-500 dark:text-slate-500 group-hover:text-foreground"
          }`}
        />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  }

  // ── Collapsed sidebar: icon + popover on click ──
  if (collapsed) {
    return (
      <div className="relative">
        <button
          ref={triggerRef}
          onClick={() => setPopoverOpen((o) => !o)}
          title={label}
          className={`group relative flex items-center justify-center w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
            active
              ? "bg-primary/[0.08] text-primary"
              : "text-slate-600 dark:text-slate-400 hover:bg-background hover:text-foreground"
          }`}
        >
          {active && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
          )}
          <Icon
            className={`w-[18px] h-[18px] shrink-0 transition-colors duration-150 ${
              active ? "text-primary" : "text-slate-500 dark:text-slate-500 group-hover:text-foreground"
            }`}
          />
        </button>

        <AnimatePresence>
          {popoverOpen && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, x: -4, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute left-full top-0 ml-2 w-48 bg-background-elevated border border-border-light rounded-xl shadow-xl z-50 py-1.5 overflow-hidden"
            >
              <p className="px-3 py-1.5 text-[11px] font-semibold text-tertiary uppercase tracking-wider">
                {label}
              </p>
              {children.map((child) => {
                const ChildIcon = child.icon;
                const childActive = child.href === href ? pathname === child.href : pathname.startsWith(child.href);
                if (child.isAction) {
                  return (
                    <Link
                      key={child.href}
                      to={child.href}
                      onClick={() => { setPopoverOpen(false); onClick?.(); }}
                      className="flex items-center gap-2.5 mx-1.5 mb-1 px-2.5 py-2 rounded-lg text-[13px] font-semibold text-white bg-primary hover:bg-primary-hover transition-colors no-underline"
                    >
                      <ChildIcon className="w-4 h-4" />
                      {child.label}
                    </Link>
                  );
                }
                return (
                  <Link
                    key={child.href}
                    to={child.href}
                    onClick={() => { setPopoverOpen(false); onClick?.(); }}
                    className={`flex items-center gap-2.5 mx-1.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors no-underline ${
                      childActive
                        ? "bg-primary/[0.08] text-primary"
                        : "text-slate-600 dark:text-slate-400 hover:bg-background hover:text-foreground"
                    }`}
                  >
                    <ChildIcon className={`w-4 h-4 shrink-0 ${childActive ? "text-primary" : "text-slate-500 dark:text-slate-500"}`} />
                    {child.label}
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Expanded sidebar: toggle sub-list ──
  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className={`group relative flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
          active
            ? "text-foreground"
            : "text-slate-600 dark:text-slate-400 hover:bg-background hover:text-foreground"
        }`}
      >
        <Icon
          className={`w-[18px] h-[18px] shrink-0 transition-colors duration-150 ${
            active ? "text-foreground" : "text-slate-500 dark:text-slate-500 group-hover:text-foreground"
          }`}
        />
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 text-tertiary shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-[18px] pl-3 border-l border-border-light mt-1 mb-1 space-y-0.5">
              {children.map((child) => {
                const ChildIcon = child.icon;
                const childActive = child.href === href ? pathname === child.href : pathname.startsWith(child.href);

                if (child.isAction) {
                  return (
                    <Link
                      key={child.href}
                      to={child.href}
                      onClick={onClick}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-primary hover:bg-primary/[0.06] transition-colors no-underline"
                    >
                      <ChildIcon className="w-3.5 h-3.5" />
                      {child.label}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={child.href}
                    to={child.href}
                    onClick={onClick}
                    className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors no-underline ${
                      childActive
                        ? "bg-primary/[0.08] text-primary"
                        : "text-slate-600 dark:text-slate-400 hover:bg-background hover:text-foreground"
                    }`}
                  >
                    <ChildIcon className={`w-3.5 h-3.5 shrink-0 ${childActive ? "text-primary" : "text-slate-500 dark:text-slate-500"}`} />
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
