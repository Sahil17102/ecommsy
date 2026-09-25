import {
  Home,
  ShoppingCart,
  LayoutDashboard,
  BarChart3,
  Receipt,
  ArrowLeftRight,
  Briefcase,
  Settings,
  HelpCircle,
  Plus,
  Building2,
  UserRound,
  PackageX,
  RotateCcw,
  Wallet,
  Banknote,
  List,
  Calculator,
  Search,
  CreditCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavChildItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Render as a CTA button instead of a link */
  isAction?: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavChildItem[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Home", href: "/home", icon: Home },
      {
        label: "Orders",
        href: "/orders",
        icon: ShoppingCart,
        children: [
          { label: "Create Order", href: "/orders/create", icon: Plus, isAction: true },
          { label: "All Orders", href: "/orders", icon: List },
          { label: "B2B Orders", href: "/orders/b2b", icon: Building2 },
          { label: "B2C Orders", href: "/orders/b2c", icon: UserRound },
        ],
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Dashboard", href: "/analytics", icon: LayoutDashboard },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Wallet", href: "/wallet", icon: Wallet },
      { label: "COD Remittance", href: "/cod-remittance", icon: Banknote },
      { label: "Billings", href: "/billings", icon: Receipt },
      // { label: "Reconciliation", href: "/reconciliation", icon: Scale },
    ],
  },
  {
    label: "Other",
    items: [
      {
        label: "Operations",
        href: "/operations",
        icon: ArrowLeftRight,
        children: [
          { label: "NDR", href: "/operations/ndr", icon: PackageX },
          { label: "RTO", href: "/operations/rto", icon: RotateCcw },
        ],
      },
      {
        label: "Tools",
        href: "/tools",
        icon: Briefcase,
        children: [
          { label: "Rate Card", href: "/tools/rate-card", icon: CreditCard },
          { label: "Rate Calculator", href: "/tools/rate-calculator", icon: Calculator },
          { label: "Order Tracking", href: "/tools/order-tracking", icon: Search },
        ],
      },
      { label: "Help & Support", href: "/support", icon: HelpCircle },
    ],
  },
];

export const bottomNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];

/** Find the label of the currently active nav item */
export function getActiveLabel(pathname: string): string {
  const allItems = [...navGroups.flatMap((g) => g.items), ...bottomNavItems];
  // Check children first for more specific matches
  for (const item of allItems) {
    if (item.children) {
      for (const child of item.children) {
        if (pathname.startsWith(child.href)) return child.label;
      }
    }
  }
  for (const item of allItems) {
    if (item.href === "/home" && pathname === "/home") return item.label;
    if (item.href !== "/home" && pathname.startsWith(item.href)) return item.label;
  }
  return "Home";
}
