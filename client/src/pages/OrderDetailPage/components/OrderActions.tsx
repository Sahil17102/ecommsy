import { motion } from "framer-motion";
import {
  Loader2,
  ClipboardCheck,
  Truck,
  Navigation,
  MapPin,
  AlertCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useManifestOrders, useCancelOrder } from "@/queries/useOrders";
import type { Order } from "@/lib/ordersTypes";
import type { OrderStatus } from "@/lib/ordersApi";
import { fadeUp } from "../animations";

const CANCELLABLE_STATUSES = ["created", "processing", "booked", "pickup_initiated"];
const MANIFESTABLE_STATUSES = ["booked", "created"];

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

const STATUS_HINTS: Partial<Record<OrderStatus, { message: string; icon: React.ReactNode; color: string; bg: string; border: string }>> = {
  created: { message: "Initiate pickup to generate documents & schedule the courier pickup.", icon: <ClipboardCheck className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/5", border: "border-primary/15" },
  booked: { message: "Initiate pickup to generate documents & schedule the courier pickup.", icon: <ClipboardCheck className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/5", border: "border-primary/15" },
  pickup_initiated: { message: "Pickup has been scheduled. Courier will collect the package soon.", icon: <Truck className="w-4 h-4" />, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  in_transit: { message: "Package is on the way to the destination.", icon: <Navigation className="w-4 h-4" />, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  out_for_delivery: { message: "Package is out for delivery. It should arrive today.", icon: <MapPin className="w-4 h-4" />, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20" },
  ndr: { message: "Delivery attempt failed. Check NDR details for the reason.", icon: <AlertCircle className="w-4 h-4" />, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  rto_initiated: { message: "Package is being returned to origin.", icon: <RotateCcw className="w-4 h-4" />, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  rto_in_transit: { message: "Return shipment is in transit back to you.", icon: <Navigation className="w-4 h-4" />, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
};

export function OrderActions({ order }: { order: Order }) {
  const manifestOrders = useManifestOrders();
  const cancelOrder = useCancelOrder();
  const showManifest = canManifest(order);
  const showCancel = canCancel(order);
  const hint = STATUS_HINTS[order.status];

  if (!showManifest && !showCancel && !hint) return null;

  return (
    <motion.div
      {...fadeUp(0.07)}
      className="bg-background-elevated rounded-2xl border border-border-light overflow-hidden"
    >
      {/* Status hint banner */}
      {hint && (
        <div className={`flex items-center gap-3 px-4 py-3 sm:px-6 ${hint.bg} border-b ${hint.border}`}>
          <div className={`shrink-0 p-1.5 rounded-lg bg-white/70 ${hint.color}`}>
            {hint.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground leading-tight">What's next?</p>
            <p className="text-[12px] text-muted mt-0.5 leading-snug">{hint.message}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {(showManifest || showCancel) && (
        <div className="px-4 py-3.5 sm:px-6 flex flex-wrap items-center gap-3">
          {showManifest && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={manifestOrders.isPending}
              onClick={() => manifestOrders.mutateAsync([order.id])}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-primary shadow-sm shadow-primary/20 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:ring-offset-1"
            >
              {manifestOrders.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ClipboardCheck className="w-4 h-4" />
              )}
              Initiate Pickup
            </motion.button>
          )}

          {showCancel && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={cancelOrder.isPending}
              onClick={() => cancelOrder.mutateAsync({ id: order.id })}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-red-500 bg-background border border-red-200/70 hover:bg-red-50 hover:border-red-300/70 transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-200/40"
            >
              {cancelOrder.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Cancel Order
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}
