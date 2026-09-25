import { motion } from "framer-motion";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Navigation,
  MapPin,
  AlertCircle,
  RotateCcw,
  XCircle,
  Check,
} from "lucide-react";
import type { OrderStatus } from "@/lib/ordersApi";

export const NORMAL_JOURNEY: { status: OrderStatus; label: string; short: string }[] = [
  { status: "created",          label: "Pending",            short: "Pending"   },
  { status: "booked",           label: "Booked",             short: "Booked"    },
  { status: "pickup_initiated", label: "Pickup Initiated",   short: "Pickup"    },
  { status: "in_transit",       label: "In Transit",         short: "Transit"   },
  { status: "out_for_delivery", label: "Out for Delivery",   short: "OFD"       },
  { status: "delivered",        label: "Delivered",          short: "Delivered" },
];

const JOURNEY_ICONS: Partial<Record<OrderStatus, React.ReactNode>> = {
  created:          <Package className="w-3.5 h-3.5" />,
  processing:       <Clock className="w-3.5 h-3.5" />,
  booked:           <CheckCircle2 className="w-3.5 h-3.5" />,
  pickup_initiated: <Truck className="w-3.5 h-3.5" />,
  shipped:          <Truck className="w-3.5 h-3.5" />,
  in_transit:       <Navigation className="w-3.5 h-3.5" />,
  out_for_delivery: <MapPin className="w-3.5 h-3.5" />,
  delivered:        <CheckCircle2 className="w-3.5 h-3.5" />,
  ndr:              <AlertCircle className="w-3.5 h-3.5" />,
  rto_initiated:    <RotateCcw className="w-3.5 h-3.5" />,
  rto_in_transit:   <Navigation className="w-3.5 h-3.5" />,
  rto_delivered:    <Package className="w-3.5 h-3.5" />,
  cancelled:        <XCircle className="w-3.5 h-3.5" />,
  lost:             <AlertCircle className="w-3.5 h-3.5" />,
};

export function StatusJourney({ status }: { status: OrderStatus }) {
  const isRTO = status === "rto_initiated" || status === "rto_in_transit" || status === "rto_delivered";
  const isNDR = status === "ndr";
  const isCancelled = status === "cancelled";
  const isLost = status === "lost";

  if (isCancelled || isLost) {
    return (
      <div className="flex items-center justify-center gap-3 py-6">
        <div className="w-10 h-10 rounded-full bg-surface-muted border-2 border-border-light flex items-center justify-center">
          {isLost ? <AlertCircle className="w-5 h-5 text-red-500" /> : <XCircle className="w-5 h-5 text-muted" />}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{isLost ? "Shipment Lost" : "Order Cancelled"}</p>
          <p className="text-xs text-muted mt-0.5">
            {isLost ? "This shipment has been marked as lost" : "This order has been cancelled"}
          </p>
        </div>
      </div>
    );
  }

  const steps = isRTO
    ? [
        NORMAL_JOURNEY[0],  // Pending
        NORMAL_JOURNEY[1],  // Booked
        NORMAL_JOURNEY[2],  // Pickup
        NORMAL_JOURNEY[3],  // In Transit
        NORMAL_JOURNEY[4],  // OFD
        { status: "ndr" as OrderStatus, label: "NDR", short: "NDR" },
        { status: "rto_initiated" as OrderStatus, label: "RTO Initiated", short: "RTO Init" },
        { status: "rto_in_transit" as OrderStatus, label: "RTO In Transit", short: "RTO Transit" },
        { status: "rto_delivered" as OrderStatus, label: "RTO Delivered", short: "RTO Dlvd" },
      ]
    : isNDR
      ? [
          ...NORMAL_JOURNEY.slice(0, 5),  // up to OFD
          { status: "ndr" as OrderStatus, label: "NDR - Failed Delivery", short: "NDR" },
        ]
      : NORMAL_JOURNEY;

  const activeIdx = steps.findIndex((s) => s.status === status);

  return (
    <div className="overflow-x-auto pb-1 -mx-1 px-1">
      <div className="flex items-start min-w-max gap-0 py-2">
        {steps.map((step, i) => {
          const isCompleted = i < activeIdx;
          const isActive = i === activeIdx;
          const isPending = i > activeIdx;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.status} className="flex items-start">
              {/* Step node + label */}
              <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-12 sm:w-20">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.06 + 0.1, duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                  className="relative flex items-center justify-center"
                >
                  {/* Pulse ring for active step */}
                  {isActive && (
                    <motion.div
                      className="absolute w-12 h-12 rounded-full bg-primary/15"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                    />
                  )}
                  <div
                    className={[
                      "w-9 h-9 rounded-full flex items-center justify-center border-2 relative z-10 transition-all",
                      isCompleted && "bg-primary border-primary text-white",
                      isActive && "bg-primary border-primary text-white shadow-md shadow-primary/30",
                      isPending && "bg-background border-border-light text-tertiary",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      JOURNEY_ICONS[step.status]
                    )}
                  </div>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 + 0.18, duration: 0.22 }}
                  className={[
                    "text-[9px] font-bold text-center leading-tight whitespace-nowrap",
                    isActive && "text-primary",
                    isCompleted && "text-foreground",
                    isPending && "text-tertiary",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="hidden sm:block">{step.label}</span>
                  <span className="sm:hidden">{step.short}</span>
                </motion.p>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="relative h-0.5 w-3 sm:w-10 mt-[18px] mx-0.5 overflow-hidden rounded-full bg-border-light/50">
                  {i < activeIdx && (
                    <motion.div
                      className="absolute inset-0 bg-primary rounded-full origin-left"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: i * 0.06 + 0.22, duration: 0.35, ease: "easeOut" }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
