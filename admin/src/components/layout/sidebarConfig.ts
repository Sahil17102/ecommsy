import {
  AlertTriangle,
  Bell,
  BookOpen,
  Calculator,
  Coins,
  CreditCard,
  FileSpreadsheet,
  HelpCircle,
  LayoutDashboard,
  MapPin,
  PackageOpen,
  PenSquare,
  PenTool,
  Receipt,
  Search,
  Star,
  Truck,
  Undo2,
  UserCircle2,
  Users,
  Wallet,
  Webhook,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** When set, only users with this role see the entry. Default: visible to all admins. */
  requiresRole?: "superadmin";
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  /** When set, only users with this role see the group. */
  requiresRole?: "superadmin";
}

export type SidebarEntry = NavItem | NavGroup;

function isGroup(entry: SidebarEntry): entry is NavGroup {
  return "items" in entry;
}

export { isGroup };

/**
 * Sidebar groups, organized by user task instead of internal data model.
 *
 * Sequence runs from "most-frequent daily work" to "rare admin / setup":
 *   1. Dashboard          — first thing they see
 *   2. Order Management   — day-to-day order work (Orders, NDR, RTO, Tracking)
 *   3. Sellers            — managing seller accounts (Sellers, Plans*, Team Members*)
 *   4. Support            — tickets (sits with seller-facing daily work)
 *   5. Finance            — money flows (Invoices, COD Remittance, Wallet)
 *   6. Reports            — the custom CSV report builder
 *   7. Tools              — utilities (Rate Calculator)
 *   8. Configuration*     — platform setup (couriers, pricing, plans, serviceability)
 *   9. Marketing*         — Blogs
 *   10. Settings          — Account / Notifications
 *
 * Items marked * are superadmin-only.
 */
export const sidebarConfig: SidebarEntry[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },

  {
    label: "Order Management",
    icon: PackageOpen,
    items: [
      { label: "Orders", path: "/orders", icon: PackageOpen },
      { label: "Failed Deliveries (NDR)", path: "/ops/ndr", icon: AlertTriangle },
      { label: "Returns (RTO)", path: "/ops/rto", icon: Undo2 },
      { label: "Order Tracking", path: "/order-tracking", icon: Search },
    ],
  },

  {
    label: "Sellers",
    icon: Users,
    items: [
      { label: "Sellers", path: "/users-management", icon: Users },
      { label: "Plans", path: "/plans", icon: Star, requiresRole: "superadmin" },
    ],
  },

  { label: "Support", path: "/support-tickets", icon: HelpCircle },
  { label: "Webhook Deliveries", path: "/webhooks", icon: Webhook },

  {
    label: "Finance",
    icon: Receipt,
    items: [
      { label: "Invoices", path: "/billing-invoices", icon: Receipt },
      { label: "COD Remittance", path: "/cod-remittance", icon: Wallet },
      { label: "Wallet", path: "/wallet", icon: Coins },
    ],
  },
  { label: "Reports", path: "/reports", icon: FileSpreadsheet },
  { label: "Rate Calculator", path: "/rate-calculator", icon: Calculator },
  {
    label: "Configuration",
    icon: Wrench,
    requiresRole: "superadmin",
    items: [
      { label: "Couriers", path: "/couriers", icon: Truck },
      { label: "Service Providers", path: "/service-providers", icon: Wrench },
      { label: "Serviceability", path: "/serviceability", icon: MapPin },
      { label: "B2C Pricing", path: "/pricing/b2c", icon: CreditCard },
      { label: "B2B Pricing", path: "/pricing/b2b", icon: CreditCard },
    ],
  },

  {
    label: "Marketing",
    icon: PenTool,
    requiresRole: "superadmin",
    items: [
      { label: "All Blogs", path: "/blogs", icon: BookOpen },
      { label: "Create Blog", path: "/create-blog", icon: PenSquare },
    ],
  },

  {
    label: "Settings",
    icon: UserCircle2,
    items: [
      { label: "Notifications", path: "/notifications", icon: Bell },
      { label: "Notification Settings", path: "/notifications/settings", icon: Wrench },
    ],
  },
];

/**
 * Filters the sidebar config for the current viewer's role. Pass `true` for
 * superadmin to see everything; otherwise restricted entries are hidden.
 */
export function visibleSidebarConfig(isSuperadmin: boolean): SidebarEntry[] {
  return sidebarConfig
    .filter((entry) => !entry.requiresRole || (entry.requiresRole === "superadmin" && isSuperadmin))
    .map((entry) => {
      if (!isGroup(entry)) return entry;
      const items = entry.items.filter(
        (item) => !item.requiresRole || (item.requiresRole === "superadmin" && isSuperadmin),
      );
      return { ...entry, items };
    })
    .filter((entry) => !isGroup(entry) || entry.items.length > 0);
}

/** Find the label of the currently active nav item */
export function getActiveLabel(pathname: string): string {
  for (const entry of sidebarConfig) {
    if (isGroup(entry)) {
      for (const item of entry.items) {
        if (pathname === item.path) return item.label;
      }
    } else {
      if (entry.path === "/" && pathname === "/") return entry.label;
      if (entry.path !== "/" && pathname.startsWith(entry.path)) return entry.label;
    }
  }
  return "Dashboard";
}
