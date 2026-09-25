import { SidebarNavItem } from "./SidebarNavItem";
import type { NavItem } from "./sidebarConfig";

interface SidebarNavGroupProps {
  label: string;
  items: NavItem[];
  collapsed?: boolean;
  onItemClick?: () => void;
}

export function SidebarNavGroup({ label, items, collapsed, onItemClick }: SidebarNavGroupProps) {
  return (
    <div className={collapsed ? "" : "py-3"}>
      {!collapsed && (
        <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-tertiary select-none">
          {label}
        </p>
      )}
      <div className="space-y-0.5">
        {items.map((item) => (
          <SidebarNavItem
            key={item.href}
            label={item.label}
            href={item.href}
            icon={item.icon}
            collapsed={collapsed}
            onClick={onItemClick}
            children={item.children}
          />
        ))}
      </div>
    </div>
  );
}
