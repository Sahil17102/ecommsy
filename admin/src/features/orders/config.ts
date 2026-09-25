import type { OrderStatus } from "./types";

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  created: { label: "Pending", color: "blue" },
  processing: { label: "Processing", color: "gold" },
  booked: { label: "Booked", color: "cyan" },
  pickup_initiated: { label: "Pickup Initiated", color: "geekblue" },
  shipped: { label: "Shipped", color: "geekblue" },
  in_transit: { label: "In Transit", color: "purple" },
  out_for_delivery: { label: "Out for Delivery", color: "cyan" },
  delivered: { label: "Delivered", color: "green" },
  ndr: { label: "NDR", color: "volcano" },
  rto_initiated: { label: "RTO Initiated", color: "purple" },
  rto_in_transit: { label: "RTO In Transit", color: "magenta" },
  rto_delivered: { label: "RTO Delivered", color: "red" },
  cancelled: { label: "Cancelled", color: "default" },
  lost: { label: "Lost", color: "red" },
};

export const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({
  label,
  value,
}));
