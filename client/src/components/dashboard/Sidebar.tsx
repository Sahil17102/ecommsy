import { motion, AnimatePresence } from "framer-motion";
import { SidebarNavGroup } from "./SidebarNavGroup";
import { AppLogo } from "@/components/common/AppLogo";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarUserMenu } from "./SidebarUserMenu";
import { navGroups, bottomNavItems } from "./sidebarConfig";

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
}

function SidebarContent({
  collapsed,
  onItemClick,
}: {
  collapsed?: boolean;
  onItemClick?: () => void;
}) {
  return (
    <>
      {/* Scrollable nav groups */}
      <nav className={`flex-1 overflow-y-auto px-3 ${collapsed ? "pt-3" : "pt-1"}`}>
        {navGroups.map((group) => (
          <SidebarNavGroup
            key={group.label}
            label={group.label}
            items={group.items}
            collapsed={collapsed}
            onItemClick={onItemClick}
          />
        ))}
      </nav>

      {/* Bottom pinned items */}
      <div className={`border-t border-border-light px-3 pt-2 pb-1 shrink-0 space-y-0.5 ${collapsed ? "flex flex-col items-center" : ""}`}>
        {bottomNavItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            label={item.label}
            href={item.href}
            icon={item.icon}
            collapsed={collapsed}
            onClick={onItemClick}
          />
        ))}
      </div>

      {/* User section */}
      <SidebarUserMenu collapsed={collapsed} />
    </>
  );
}

export function Sidebar({ mobileOpen, onMobileClose, collapsed }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-background-elevated border-r border-border-light h-screen sticky top-0 shrink-0 transition-[width] duration-200 ease-in-out ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center h-14 px-3 border-b border-border-light shrink-0 ${collapsed ? "justify-center" : ""}`}>
          <AppLogo size="sm" showText={!collapsed} to="/home" />
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
                <AppLogo size="sm" to="/home" />
              </div>

              <SidebarContent onItemClick={onMobileClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
