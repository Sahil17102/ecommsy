import { useState, useEffect, useRef } from "react";
import { Button, Input, Segmented, Tag, Timeline } from "antd";
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  XCircle,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { ordersApi, type Order, type TrackingEvent } from "@/lib/ordersApi";
import { formatCurrency, formatDate, formatTime, formatKeyword } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

type SearchMode = "orderId" | "awb" | "email" | "phone";

const searchPlaceholders: Record<SearchMode, string> = {
  orderId: "Enter Order ID",
  awb: "Enter AWB Number",
  email: "Enter Email Address",
  phone: "Enter Phone Number",
};

export function OrderTrackingPage() {
  // `?mode=awb&q=<awb>` lets the NDR / RTO tables deep-link a shipment straight
  // into the tracker instead of making the seller retype the AWB.
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialMode = (searchParams.get("mode") as SearchMode) || "orderId";

  const [mode, setMode] = useState<SearchMode>(
    ["orderId", "awb", "email", "phone"].includes(initialMode) ? initialMode : "orderId",
  );
  const [query, setQuery] = useState(initialQuery);

  // Search for orders matching the query
  const searchMutation = useMutation({
    mutationFn: (q: string) => ordersApi.getAll({ search: q, limit: 10 }),
  });

  // Fire the deep-linked search once, on arrival.
  const autoSearched = useRef(false);
  useEffect(() => {
    if (autoSearched.current || !initialQuery.trim()) return;
    autoSearched.current = true;
    searchMutation.mutate(initialQuery.trim());
  }, [initialQuery, searchMutation]);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Fetch tracking for selected order
  const trackingQuery = useQuery({
    queryKey: ["tracking", selectedOrderId],
    queryFn: () => ordersApi.getTracking(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const selectedOrder = searchMutation.data?.orders.find(
    (o) => o.id === selectedOrderId,
  );

  function handleSearch() {
    if (!query.trim()) return;
    setSelectedOrderId(null);
    searchMutation.mutate(query.trim());
  }

  function handleSelectOrder(order: Order) {
    setSelectedOrderId(order.id);
  }

  return (
    <div>
      <PageHeader
        title="Order Tracking"
        subtitle="Track shipments by Order ID, AWB number, email, or phone"
      />

      {/* Search */}
      <div className="bg-background-elevated border border-border rounded-xl p-5 mb-6">
        <div className="mb-4">
          <Segmented
            value={mode}
            onChange={(v) => {
              setMode(v as SearchMode);
              setQuery("");
              searchMutation.reset();
              setSelectedOrderId(null);
            }}
            options={[
              { label: "Order ID", value: "orderId" },
              { label: "AWB", value: "awb" },
              { label: "Email", value: "email" },
              { label: "Phone", value: "phone" },
            ]}
          />
        </div>
        <div className="flex gap-3">
          <Input
            size="large"
            prefix={<Search className="w-4 h-4 text-muted" />}
            placeholder={searchPlaceholders[mode]}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPressEnter={handleSearch}
            className="max-w-lg"
          />
          <Button
            type="primary"
            size="large"
            loading={searchMutation.isPending}
            disabled={!query.trim()}
            onClick={handleSearch}
          >
            Track
          </Button>
        </div>
      </div>

      {/* Search results */}
      {searchMutation.isPending && <Loading tip="Searching orders..." />}

      {searchMutation.data && searchMutation.data.orders.length === 0 && (
        <EmptyState description="No orders found matching your search. Try a different search term." />
      )}

      {searchMutation.data && searchMutation.data.orders.length > 0 && !selectedOrderId && (
        <div>
          <p className="text-sm text-muted mb-3">
            Found {searchMutation.data.orders.length} order{searchMutation.data.orders.length > 1 ? "s" : ""}
          </p>
          <div className="grid gap-3">
            {searchMutation.data.orders.map((order) => (
              <OrderSearchResult
                key={order.id}
                order={order}
                onSelect={() => handleSelectOrder(order)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tracking detail */}
      {selectedOrder && (
        <div>
          <Button
            type="link"
            className="!px-0 mb-4"
            onClick={() => setSelectedOrderId(null)}
          >
            &larr; Back to results
          </Button>
          <OrderTrackingDetail
            order={selectedOrder}
            events={trackingQuery.data ?? []}
            isLoading={trackingQuery.isLoading}
          />
        </div>
      )}
    </div>
  );
}

function OrderSearchResult({
  order,
  onSelect,
}: {
  order: Order;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-background-elevated border border-border rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground">{order.orderId}</span>
            <StatusTag status={order.status} />
          </div>
          <div className="text-sm text-muted flex flex-wrap gap-3">
            <span>AWB: <strong className="text-foreground">{order.awb || "—"}</strong></span>
            <span>Courier: <strong className="text-foreground">{formatKeyword(order.serviceProvider)}</strong></span>
            <span>{order.deliveryAddress.contactName} &middot; {order.deliveryAddress.city}</span>
          </div>
        </div>
        <div className="text-sm text-muted">
          {formatDate(order.createdAt)}
        </div>
      </div>
    </button>
  );
}

function OrderTrackingDetail({
  order,
  events,
  isLoading,
}: {
  order: Order;
  events: TrackingEvent[];
  isLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Order summary */}
      <div className="bg-background-elevated border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Order Details</h3>
        <div className="space-y-3 text-sm">
          <DetailRow label="Order ID" value={order.orderId} />
          <DetailRow label="AWB" value={order.awb || "—"} />
          <DetailRow label="Status" value={<StatusTag status={order.status} />} />
          <DetailRow label="Courier" value={formatKeyword(order.serviceProvider)} />
          <DetailRow label="Payment" value={<Tag>{order.paymentType.toUpperCase()}</Tag>} />
          <DetailRow label="Weight" value={`${order.weight}g`} />
          <DetailRow label="Total Charge" value={formatCurrency(order.rate?.totalCharge)} />

          <div className="border-t border-border-light pt-3 mt-3">
            <p className="text-muted text-xs mb-1">Delivery Address</p>
            <p className="text-foreground">
              {order.deliveryAddress.contactName}<br />
              {order.deliveryAddress.addressLine1}<br />
              {order.deliveryAddress.addressLine2 && <>{order.deliveryAddress.addressLine2}<br /></>}
              {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
            </p>
          </div>

          <Link
            to={`/orders/${order.id}`}
            className="inline-block mt-2 text-primary text-sm hover:underline"
          >
            View full order &rarr;
          </Link>
        </div>
      </div>

      {/* Tracking timeline */}
      <div className="lg:col-span-2 bg-background-elevated border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Tracking Timeline</h3>

        {isLoading ? (
          <Loading tip="Loading tracking..." />
        ) : events.length === 0 ? (
          <EmptyState description="No tracking events yet." />
        ) : (
          <Timeline
            items={events.map((event) => ({
              color: getEventColor(event.statusCode),
              dot: getEventDot(event.statusCode),
              children: (
                <div className="pb-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-foreground">
                      {formatKeyword(event.statusCode)}
                    </span>
                    <span className="text-xs text-muted">
                      {event.eventTimestamp
                        ? `${formatDate(event.eventTimestamp)} ${formatTime(event.eventTimestamp)}`
                        : formatDate(event.createdAt)}
                    </span>
                  </div>
                  {event.statusText && (
                    <p className="text-sm text-muted">{event.statusText}</p>
                  )}
                  {event.location && (
                    <p className="text-xs text-muted mt-0.5">
                      <MapPin className="inline w-3 h-3 mr-0.5" />
                      {event.location}
                    </p>
                  )}
                  {event.remarks && (
                    <p className="text-xs text-muted italic mt-0.5">{event.remarks}</p>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

const statusColors: Record<string, string> = {
  created: "default",
  processing: "processing",
  booked: "blue",
  pickup_initiated: "cyan",
  shipped: "blue",
  in_transit: "blue",
  out_for_delivery: "purple",
  delivered: "green",
  ndr: "red",
  rto_initiated: "volcano",
  rto_in_transit: "volcano",
  rto_delivered: "purple",
  cancelled: "default",
  lost: "red",
};

function StatusTag({ status }: { status: string }) {
  return (
    <Tag color={statusColors[status] ?? "default"}>
      {formatKeyword(status)}
    </Tag>
  );
}

function getEventColor(statusCode: string): string {
  if (statusCode === "delivered") return "green";
  if (statusCode.includes("rto") || statusCode === "ndr" || statusCode === "lost") return "red";
  if (statusCode === "cancelled") return "gray";
  return "blue";
}

function getEventDot(statusCode: string): React.ReactNode {
  const size = "w-4 h-4";
  switch (statusCode) {
    case "delivered":
      return <CheckCircle2 className={`${size} text-green-500`} />;
    case "in_transit":
    case "shipped":
      return <Truck className={`${size} text-blue-500`} />;
    case "out_for_delivery":
      return <Package className={`${size} text-purple-500`} />;
    case "ndr":
      return <AlertTriangle className={`${size} text-red-500`} />;
    case "rto_initiated":
    case "rto_in_transit":
    case "rto_delivered":
      return <RotateCcw className={`${size} text-red-500`} />;
    case "cancelled":
      return <XCircle className={`${size} text-gray-400`} />;
    default:
      return <Clock className={`${size} text-blue-500`} />;
  }
}

export default OrderTrackingPage;
