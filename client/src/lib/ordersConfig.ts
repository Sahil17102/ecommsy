import type { OrderStatus } from "./ordersTypes";

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  created: { label: "Pending", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  processing: { label: "Processing", className: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
  booked: { label: "Booked", className: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
  pickup_initiated: { label: "Pickup Initiated", className: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  shipped: { label: "Shipped", className: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  in_transit: { label: "In Transit", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  out_for_delivery: {
    label: "Out for Delivery",
    className: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  },
  delivered: { label: "Delivered", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  ndr: { label: "NDR", className: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  rto_initiated: {
    label: "RTO Initiated",
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  rto_in_transit: {
    label: "RTO In Transit",
    className: "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20",
  },
  rto_delivered: {
    label: "RTO Delivered",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  cancelled: { label: "Cancelled", className: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  lost: { label: "Lost", className: "bg-red-500/10 text-red-500 border-red-500/20" },
};
