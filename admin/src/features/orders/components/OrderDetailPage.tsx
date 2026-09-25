import { useParams, Link } from "react-router-dom";
import { Tag, Spin, Table } from "antd";
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  Truck,
  CreditCard,
  Box,
  Calendar,
  Copy,
  Check,
  Phone,
  Mail,
  Hash,
  Activity,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useAdminOrderDetail, useOrderTracking } from "../queries";
import { STATUS_CONFIG } from "../config";
import { formatCurrency, formatDateTime, formatKeyword } from "@/lib/utils";
import type { OrderStatus, OrderProduct } from "../types";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="p-1 rounded hover:bg-background-elevated text-muted hover:text-foreground transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

const TRACKING_COLLAPSED_HEIGHT = 320;

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAdminOrderDetail(id, ["user", "courier", "pickupAddress"]);
  const { data: trackingEvents = [], isLoading: trackingLoading } = useOrderTracking(id);
  const [trackingExpanded, setTrackingExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!data?.order) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">Order not found</p>
        <Link to="/orders" className="text-primary text-sm mt-2 inline-block">
          Back to Orders
        </Link>
      </div>
    );
  }

  const { order } = data;
  const pickupAddress = order.pickupAddress;
  const statusConfig = STATUS_CONFIG[order.status as OrderStatus];
  const user = order.user;
  const addr = order.deliveryAddress;
  const rate = order.rate ?? {
    forward: 0,
    rto: 0,
    codCharges: 0,
    otherCharges: 0,
    freightCharge: 0,
    totalCharge: 0,
    zone: "—",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-background-elevated border border-border-light rounded-xl px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Link
            to="/orders"
            className="p-2 rounded-lg hover:bg-background transition-colors text-muted hover:text-foreground self-start"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-lg font-semibold text-foreground">
                {order.orderId}
              </h1>
              <Tag color={statusConfig.color} bordered={false}>
                {statusConfig.label}
              </Tag>
              <Tag
                bordered={false}
                color={order.orderType === "B2B" ? "geekblue" : "purple"}
              >
                {order.orderType}
              </Tag>
              <Tag
                bordered={false}
                color={order.paymentType === "cod" ? "orange" : "green"}
              >
                {order.paymentType.toUpperCase()}
              </Tag>
            </div>
            <p className="text-xs text-muted mt-1">
              Created {formatDateTime(order.createdAt)}
              {order.shippedAt && ` | Shipped ${formatDateTime(order.shippedAt)}`}
              {order.deliveredAt && ` | Delivered ${formatDateTime(order.deliveredAt)}`}
            </p>
          </div>
          <div className="text-right sm:shrink-0">
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(order.rate?.totalCharge)}
            </p>
            <p className="text-xs text-muted">Total Charge</p>
          </div>
        </div>
      </div>

      {/* Main grid — 2/3 left, 1/3 right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Shipment Details */}
          <Section icon={Truck} title="Shipment Details">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InfoItem label="Service Provider" value={formatKeyword(order.serviceProvider)} />
              <InfoItem
                label="AWB Number"
                value={
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono">{order.awb}</span>
                    <CopyBtn text={order.awb} />
                  </span>
                }
              />
              <InfoItem label="Zone" value={rate.zone || "—"} />
            </div>
          </Section>

          {/* Delivery + Pickup Address — side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Section icon={MapPin} title="Delivery Address">
              <div>
                <p className="text-sm font-medium text-foreground">{addr.contactName}</p>
                <p className="text-[13px] text-muted mt-1 leading-relaxed">
                  {addr.addressLine1}
                  {addr.addressLine2 && `, ${addr.addressLine2}`}
                  <br />
                  {addr.city}, {addr.state} — {addr.pincode}
                </p>
                <div className="flex flex-col gap-1 mt-2.5 pt-2.5 border-t border-border-light/50">
                  {addr.phone && (
                    <p className="text-xs text-muted flex items-center gap-1.5">
                      <Phone size={11} className="shrink-0" />
                      {addr.phone}
                    </p>
                  )}
                  {addr.email && (
                    <p className="text-xs text-muted flex items-center gap-1.5">
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{addr.email}</span>
                    </p>
                  )}
                </div>
              </div>
            </Section>

            {pickupAddress && (
              <Section icon={Package} title="Pickup Address">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {pickupAddress.nickname}
                    <span className="text-muted font-normal"> — {pickupAddress.contactName}</span>
                  </p>
                  <p className="text-[13px] text-muted mt-1 leading-relaxed">
                    {pickupAddress.addressLine1}
                    {pickupAddress.addressLine2 && `, ${pickupAddress.addressLine2}`}
                    <br />
                    {pickupAddress.city}, {pickupAddress.state} — {pickupAddress.pincode}
                  </p>
                  {pickupAddress.phone && (
                    <div className="mt-2.5 pt-2.5 border-t border-border-light/50">
                      <p className="text-xs text-muted flex items-center gap-1.5">
                        <Phone size={11} className="shrink-0" />
                        {pickupAddress.phone}
                      </p>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </div>

          {/* Products */}
          <Section icon={Hash} title="Products">
            <div className="themed-table rounded-lg border border-border-light overflow-hidden">
              <Table<OrderProduct>
                columns={[
                  {
                    title: "Product",
                    dataIndex: "name",
                    key: "name",
                    render: (v: string) => <span className="text-sm text-foreground">{v}</span>,
                  },
                  {
                    title: "Unit Price",
                    dataIndex: "unitPrice",
                    key: "unitPrice",
                    width: 120,
                    align: "right",
                    render: (v: number) => (
                      <span className="text-sm text-foreground">{formatCurrency(v)}</span>
                    ),
                  },
                  {
                    title: "Qty",
                    dataIndex: "quantity",
                    key: "quantity",
                    width: 60,
                    align: "center",
                    render: (v: number) => <span className="text-sm text-foreground">{v}</span>,
                  },
                  {
                    title: "Total",
                    key: "total",
                    width: 120,
                    align: "right",
                    render: (_, r) => (
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(r.unitPrice * r.quantity)}
                      </span>
                    ),
                  },
                  ...(order.orderType === "B2B"
                    ? [
                        {
                          title: "HSN",
                          dataIndex: "hsn" as keyof OrderProduct,
                          key: "hsn",
                          width: 80,
                          render: (v: unknown) => (
                            <span className="text-xs text-muted font-mono">
                              {(v as string) || "—"}
                            </span>
                          ),
                        },
                        {
                          title: "Tax %",
                          dataIndex: "taxRate" as keyof OrderProduct,
                          key: "taxRate",
                          width: 70,
                          render: (v: unknown) => (
                            <span className="text-xs text-muted">
                              {(v as number) ? `${v}%` : "—"}
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
                dataSource={order.products}
                rowKey={(_, i) => String(i)}
                pagination={false}
                size="small"
              />
            </div>
          </Section>

          {/* Tracking History — capped height */}
          <Section icon={Activity} title="Tracking History">
            {trackingLoading ? (
              <div className="flex justify-center py-6"><Spin /></div>
            ) : trackingEvents.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">No tracking events yet</p>
            ) : (
              <>
                <div
                  className="relative pl-4 overflow-hidden transition-[max-height] duration-300"
                  style={{ maxHeight: trackingExpanded ? `${trackingEvents.length * 120}px` : `${TRACKING_COLLAPSED_HEIGHT}px` }}
                >
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border-light" />
                  <div className="space-y-4">
                    {trackingEvents.map((evt) => {
                      const evtStatus = STATUS_CONFIG[evt.statusCode as OrderStatus];
                      return (
                        <div key={evt.id} className="relative flex gap-3">
                          <div className="absolute -left-4 top-1 w-3.5 h-3.5 rounded-full border-2 border-primary bg-background-elevated z-10" />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {evtStatus && (
                                <Tag color={evtStatus.color} bordered={false} className="text-xs">
                                  {evtStatus.label}
                                </Tag>
                              )}
                              <span className="text-xs text-muted">
                                {formatDateTime(evt.eventTimestamp || evt.createdAt)}
                              </span>
                              <Tag bordered={false} className="text-[10px]">{evt.source}</Tag>
                            </div>
                            {evt.statusText && (
                              <p className="text-sm text-foreground mt-1">{evt.statusText}</p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                              {evt.location && (
                                <span className="text-xs text-muted flex items-center gap-1">
                                  <MapPin size={11} /> {evt.location}
                                </span>
                              )}
                              {evt.remarks && (
                                <span className="text-xs text-muted">{evt.remarks}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Fade overlay when collapsed */}
                  {!trackingExpanded && trackingEvents.length > 3 && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background-elevated to-transparent pointer-events-none" />
                  )}
                </div>

                {trackingEvents.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setTrackingExpanded((p) => !p)}
                    className="flex items-center gap-1.5 mx-auto text-xs font-medium text-primary hover:text-primary/80 transition-colors pt-1"
                  >
                    {trackingExpanded ? "Show less" : `View all ${trackingEvents.length} events`}
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${trackingExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                )}
              </>
            )}
          </Section>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Customer */}
          <Section icon={User} title="Customer">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {user?.name || user?.businessName || "—"}
              </p>
              {user?.email && (
                <p className="text-xs text-muted flex items-center gap-1.5">
                  <Mail size={12} />
                  {user.email}
                </p>
              )}
              {user?.phone && (
                <p className="text-xs text-muted flex items-center gap-1.5">
                  <Phone size={12} />
                  {user.phone}
                </p>
              )}
              {user?.businessName && (
                <p className="text-xs text-muted">Business: {user.businessName}</p>
              )}
            </div>
          </Section>

          {/* Package Details */}
          <Section icon={Box} title="Package Details">
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label="Weight" value={`${order.weight}g`} />
              <InfoItem label="Chargeable" value={`${order.chargeableWeight}g`} />
              <InfoItem label="Length" value={`${order.length ?? "—"} cm`} />
              <InfoItem label="Breadth" value={`${order.breadth ?? "—"} cm`} />
              <InfoItem label="Height" value={`${order.height ?? "—"} cm`} />
            </div>
          </Section>

          {/* B2B Boxes */}
          {order.orderType === "B2B" && order.packages && order.packages.length > 0 && (
            <Section icon={Box} title="Boxes">
              <Table
                size="small"
                pagination={false}
                rowKey={(row, i) => `${row.boxId}-${i}`}
                dataSource={order.packages}
                columns={[
                  { title: "Box ID", dataIndex: "boxId", key: "boxId" },
                  {
                    title: "Qty",
                    key: "quantity",
                    align: "right",
                    render: (_, r) => r.quantity ?? 1,
                  },
                  {
                    title: "Wt (kg)",
                    dataIndex: "weight",
                    key: "weight",
                    align: "right",
                  },
                  {
                    title: "L × B × H (cm)",
                    key: "dims",
                    align: "right",
                    render: (_, r) => `${r.length} × ${r.breadth} × ${r.height}`,
                  },
                ]}
                summary={(rows) => {
                  const totalBoxes = rows.reduce((s, r) => s + (r.quantity ?? 1), 0);
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={1}>
                        <strong>Total</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong>{totalBoxes}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} colSpan={2} />
                    </Table.Summary.Row>
                  );
                }}
              />
            </Section>
          )}

          {/* Rate Breakdown */}
          <Section icon={CreditCard} title="Rate Breakdown">
            <div className="space-y-1.5">
              <RateRow label="Forward" value={rate.forward} />
              <RateRow label="RTO" value={rate.rto} />
              <RateRow label="COD Charges" value={rate.codCharges} />
              <RateRow label="Other Charges" value={rate.otherCharges} />
              <RateRow label="Freight" value={rate.freightCharge} />
              <div className="border-t border-border-light pt-2 mt-1">
                <RateRow label="Total Charge" value={rate.totalCharge} bold />
              </div>
            </div>
          </Section>

          {/* Payment Info */}
          <Section icon={Calendar} title="Payment Info">
            <div className="space-y-1.5">
              <RateRow label="Order Amount" value={order.orderAmount} />
              {order.codAmount > 0 && (
                <RateRow label="COD Amount" value={order.codAmount} />
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border-light rounded-xl bg-background-elevated overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-light/60 bg-surface-muted/30">
        <Icon size={14} className="text-primary" />
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted uppercase tracking-wide">{label}</p>
      <div className="text-sm text-foreground mt-0.5">{value}</div>
    </div>
  );
}

function RateRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between text-sm ${bold ? "font-semibold text-foreground" : "text-muted"}`}
    >
      <span>{label}</span>
      <span className={`tabular-nums ${bold ? "text-foreground" : "text-foreground/80"}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}
