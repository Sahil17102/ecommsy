import { Package, Building2, UserRound } from "lucide-react";
import { ORDER_STATUS_CONFIG } from "@/lib/ordersConfig";
import type { Order } from "@/lib/ordersApi";

// ── Page labels ──

export const PAGE_LABELS: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
  all: {
    title: "Orders",
    description: "Manage and track all your shipping orders",
    icon: <Package className="w-8 h-8 text-primary" />,
  },
  b2b: {
    title: "B2B Orders",
    description: "Manage your business-to-business shipments",
    icon: <Building2 className="w-8 h-8 text-primary" />,
  },
  b2c: {
    title: "B2C Orders",
    description: "Manage your business-to-consumer shipments",
    icon: <UserRound className="w-8 h-8 text-primary" />,
  },
};

// ── Filter options ──

export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  ...Object.entries(ORDER_STATUS_CONFIG).map(([value, { label }]) => ({ value, label })),
];

export const PAYMENT_OPTIONS = [
  { value: "", label: "All Payments" },
  { value: "prepaid", label: "Prepaid" },
  { value: "cod", label: "COD" },
];

// ── Status helpers ──

const CANCELLABLE_STATUSES = ["created", "processing", "booked", "pickup_initiated"];
const MANIFESTABLE_STATUSES = ["created", "booked"];

export function canManifest(order: Order): boolean {
  return (
    !!order.awb &&
    !order.manifestUrl &&
    !order.serviceProvider?.startsWith("manual") &&
    MANIFESTABLE_STATUSES.includes(order.status)
  );
}

export function canCancel(order: Order): boolean {
  return CANCELLABLE_STATUSES.includes(order.status);
}

// A label can be printed once the order has an AWB assigned.
export function canLabel(order: Order): boolean {
  return !!order.awb;
}
