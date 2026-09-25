import { useOrderTracking } from "@/queries/useOrders";
import { ORDER_STATUS_CONFIG } from "@/lib/ordersConfig";
import { Loader2, MapPin } from "lucide-react";
import type { OrderStatus } from "@/lib/ordersApi";

export function TrackingTimeline({ orderId }: { orderId: string }) {
  const { data: events = [], isLoading } = useOrderTracking(orderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted">
        No tracking events yet
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border-light" />

      <div className="space-y-0">
        {events.map((event, i) => {
          const isFirst = i === 0;
          const statusCfg = ORDER_STATUS_CONFIG[event.statusCode as OrderStatus];
          const date = event.eventTimestamp || event.createdAt;
          const formattedDate = new Date(date).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
          });
          const formattedTime = new Date(date).toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit", hour12: true,
          });

          return (
            <div key={event.id} className="relative flex gap-3 py-2.5">
              {/* Dot */}
              <div
                className={`absolute -left-6 top-3 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                  isFirst
                    ? "bg-primary border-primary text-white"
                    : "bg-background border-border-light text-muted"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isFirst ? "bg-white" : "bg-muted"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[12px] font-bold ${isFirst ? "text-foreground" : "text-muted"}`}>
                    {event.statusText || event.statusCode}
                  </span>
                  {statusCfg && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-tertiary font-medium">
                    {event.source}
                  </span>
                </div>
                {event.remarks && (
                  <p className="text-[11px] text-muted mt-0.5 truncate">{event.remarks}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-tertiary">{formattedDate} {formattedTime}</span>
                  {event.location && (
                    <span className="text-[10px] text-tertiary flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" /> {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
