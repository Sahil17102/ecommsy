import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Truck,
  MapPin,
  Package,
  Calendar,
  User,
  Phone,
  Mail,
  Weight,
  IndianRupee,
  Hash,
  AlertCircle,
  Box,
  Ruler,
  BadgeCheck,
  Clock,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  FileText,
  Receipt,
} from "lucide-react";
import { useOrder } from "@/queries/useOrders";
import { formatCurrency, formatKeyword } from "@/lib/utils";
import { ORDER_STATUS_CONFIG } from "@/lib/ordersConfig";
import { ordersApi } from "@/lib/ordersApi";
import type { OrderStatus } from "@/lib/ordersApi";

import { fadeUp } from "./animations";
import { CopyButton } from "./components/CopyButton";
import { DownloadButton } from "./components/DownloadButton";
import { Section, InfoRow } from "./components/Section";
import { ChargeBar } from "./components/ChargeBar";
import { StatChip } from "./components/StatChip";
import { StatusJourney, NORMAL_JOURNEY } from "./components/StatusJourney";
import { TrackingTimeline } from "./components/TrackingTimeline";
import { OrderActions } from "./components/OrderActions";

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError } = useOrder(id ?? "");

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="skeleton h-4 w-28 rounded" />
        <div className="skeleton h-52 rounded-3xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="skeleton h-52 rounded-2xl" />
          <div className="skeleton h-52 rounded-2xl" />
        </div>
        <div className="skeleton h-44 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="skeleton h-44 rounded-2xl" />
          <div className="skeleton h-44 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError || !order) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6 no-underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>
        <div className="bg-background-elevated rounded-2xl border border-border-light p-8 sm:p-14 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-error-bg flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-error" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-2">Order not found</h2>
          <p className="text-sm text-muted">
            This order may have been removed or you don't have access.
          </p>
          <Link
            to="/orders"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary border-2 border-primary/20 hover:bg-primary/[0.04] transition-colors no-underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const status = ORDER_STATUS_CONFIG[order.status];
  const createdDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // Weights are stored and returned in GRAMS everywhere in the API — anything
  // rendered with a "kg" unit has to be divided first.
  const gramsToKg = (g: number) => (Number(g) || 0) / 1000;
  const rate = order.rate ?? {
    forward: 0,
    rto: 0,
    codCharges: 0,
    otherCharges: 0,
    freightCharge: 0,
    totalCharge: 0,
    zone: "—",
  };

  const totalForBars =
    rate.forward + rate.rto + rate.codCharges + rate.otherCharges;

  // Compute journey step info for the header label
  const isRTOStatus =
    order.status === "rto_initiated" || order.status === "rto_delivered";
  const journeySteps = isRTOStatus
    ? [
        ...NORMAL_JOURNEY.slice(0, 3),
        { status: "rto_initiated" as OrderStatus, label: "RTO Initiated", short: "RTO Init" },
        { status: "rto_delivered" as OrderStatus, label: "RTO Delivered", short: "RTO Dlvd" },
      ]
    : NORMAL_JOURNEY;
  const journeyActiveIdx = journeySteps.findIndex((s) => s.status === order.status);
  const journeyStepLabel =
    order.status === "cancelled"
      ? "Cancelled"
      : journeySteps[journeyActiveIdx]?.label ?? status.label;
  const journeyStepNum = order.status === "cancelled" ? null : journeyActiveIdx + 1;
  const journeyTotalSteps = order.status === "cancelled" ? null : journeySteps.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="max-w-5xl mx-auto space-y-4 pb-8"
    >
      {/* ── Back nav ─────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0)}>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors no-underline group"
        >
          <motion.span
            className="inline-flex"
            whileHover={{ x: -3 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.span>
          Back to Orders
        </Link>
      </motion.div>

      {/* ── Hero card ────────────────────────────────────────────────────── */}
      <motion.div
        {...fadeUp(0.05)}
        whileHover={{ boxShadow: "0 6px 32px 0 rgba(0,0,0,0.08)", transition: { duration: 0.22 } }}
        className="bg-background-elevated rounded-2xl border border-border-light overflow-hidden"
      >
        {/* Main content */}
        <div className="flex flex-col sm:flex-row sm:items-stretch">
          {/* Left: Order identity */}
          <div className="flex-1 min-w-0 px-4 pt-4 pb-4 sm:px-7 sm:pt-7 sm:pb-6">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${status.className}`}
              >
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-current"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                />
                {status.label}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-md border ${
                  order.orderType === "B2B"
                    ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                    : "bg-primary/[0.06] text-primary border-primary/[0.15]"
                }`}
              >
                {order.orderType}
              </span>
            </div>

            <h1 className="text-xl sm:text-[28px] font-bold text-foreground tracking-tight leading-none mb-3 font-mono">
              {order.orderId}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-tertiary" />
                Created {createdDate}
              </span>
              {order.shippedAt && (
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-tertiary" />
                  Shipped {formatDate(order.shippedAt)}
                </span>
              )}
              {order.deliveredAt && (
                <span className="flex items-center gap-1.5 text-success font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Delivered {formatDate(order.deliveredAt)}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px bg-border-light/70 my-5" />
          <div className="sm:hidden h-px bg-border-light/60 mx-7" />

          {/* Right: Total charge */}
          <div className="flex flex-col justify-center items-start sm:items-end px-4 pb-4 pt-3 sm:px-7 sm:pb-7 sm:pt-7 sm:min-w-[200px]">
            <p className="text-[10px] font-semibold text-tertiary uppercase tracking-[0.12em] mb-2">
              Total Charge
            </p>
            <motion.p
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="text-2xl sm:text-[32px] font-bold text-foreground tabular-nums leading-none mb-3"
            >
              {formatCurrency(rate.totalCharge)}
            </motion.p>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full border ${
                order.paymentType === "cod"
                  ? "bg-violet-500/10 text-violet-500 border-violet-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              }`}
            >
              <IndianRupee className="w-3 h-3" />
              {order.paymentType === "cod" ? "Cash on Delivery" : "Prepaid"}
            </span>
          </div>
        </div>

        {/* Bottom info strip */}
        <div className="border-t border-border-light bg-surface-muted/30">
          <div className="flex flex-col sm:flex-row sm:divide-x divide-border-light">
            {/* AWB */}
            <div className="flex items-center gap-3.5 px-4 py-3 sm:px-6 sm:py-4 flex-1 min-w-0">
              <Hash className="w-4 h-4 text-tertiary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold text-tertiary uppercase tracking-[0.1em] mb-0.5">
                  AWB Number
                </p>
                <p className="text-[13px] font-bold font-mono text-foreground truncate">
                  {order.awb}
                </p>
              </div>
              <CopyButton text={order.awb} label="AWB" size="md" />
            </div>

            <div className="sm:hidden h-px bg-border-light/60 mx-6" />

            {/* Courier */}
            <div className="flex items-center gap-3.5 px-4 py-3 sm:px-6 sm:py-4 sm:flex-1">
              <Truck className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[9px] font-semibold text-tertiary uppercase tracking-[0.1em] mb-0.5">
                  Courier Partner
                </p>
                <p className="text-[13px] font-bold text-primary capitalize">
                  {formatKeyword(order.serviceProvider)}
                </p>
              </div>
            </div>

            <div className="sm:hidden h-px bg-border-light/60 mx-6" />

            {/* Zone */}
            {/* <div className="flex items-center gap-3.5 px-4 py-3 sm:px-6 sm:py-4 sm:flex-1">
              <BadgeCheck className="w-4 h-4 text-tertiary shrink-0" />
              <div>
                <p className="text-[9px] font-semibold text-tertiary uppercase tracking-[0.1em] mb-0.5">
                  Delivery Zone
                </p>
                <p className="text-[13px] font-bold text-foreground">{order.rate.zone}</p>
              </div>
            </div> */}

            <div className="sm:hidden h-px bg-border-light/60 mx-6" />

            {/* Documents */}
            <div className="flex items-center gap-2.5 px-4 py-3 sm:px-6 sm:py-4">
              <DownloadButton
                label="Shipping Label"
                icon={<FileText className="w-4 h-4" />}
                onClick={() => ordersApi.downloadLabel(order.id, order.awb)}
                variant="primary"
              />
              <DownloadButton
                label="Invoice"
                icon={<Receipt className="w-4 h-4" />}
                onClick={() => ordersApi.downloadInvoice(order.id, order.orderId)}
                variant="dark"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Actions Bar ──────────────────────────────────────────────────── */}
      <OrderActions order={order} />

      {/* ── Status Journey ───────────────────────────────────────────────── */}
      <motion.div
        {...fadeUp(0.1)}
        className="bg-background-elevated rounded-2xl border border-border-light overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border-light/60 bg-surface-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground leading-tight">
                Shipment Journey
              </h3>
              {journeyStepNum && journeyTotalSteps && (
                <p className="text-[10px] text-muted mt-0.5">
                  Step {journeyStepNum} of {journeyTotalSteps} —{" "}
                  <span className="font-semibold text-primary">{journeyStepLabel}</span>
                </p>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${status.className}`}>
            {status.label}
          </span>
        </div>
        <div className="px-4 py-3 sm:px-5 sm:py-4">
          <StatusJourney status={order.status} />
        </div>
      </motion.div>

      {/* ── Tracking Timeline ──────────────────────────────────────────────── */}
      <motion.div
        {...fadeUp(0.12)}
        className="bg-background-elevated rounded-2xl border border-border-light overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border-light/60 bg-surface-muted/20">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-foreground leading-tight">Tracking History</h3>
        </div>
        <div className="px-4 py-3 sm:px-5 sm:py-4">
          <TrackingTimeline orderId={order.id} />
        </div>
      </motion.div>

      {/* ── Stat chips ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip
          icon={<Weight className="w-4 h-4" />}
          label="kg · Chargeable"
          value={gramsToKg(order.chargeableWeight).toFixed(2)}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          borderColor="border-primary/[0.16]"
          delay={0.14}
        />
        <StatChip
          icon={<Ruler className="w-4 h-4" />}
          label="cm · L × B × H"
          value={
            <span className="text-[16px] font-mono tracking-tight">
              {order.length}
              <span className="text-tertiary font-normal text-[13px]">×</span>
              {order.breadth}
              <span className="text-tertiary font-normal text-[13px]">×</span>
              {order.height}
            </span>
          }
          iconBg="bg-sky-500/10"
          iconColor="text-sky-500"
          borderColor="border-sky-500/[0.16]"
          delay={0.17}
        />
        <StatChip
          icon={<Package className="w-4 h-4" />}
          label={`Product${order.products.length !== 1 ? "s" : ""}`}
          value={order.products.length}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
          borderColor="border-emerald-500/[0.16]"
          delay={0.2}
        />
        <StatChip
          icon={<IndianRupee className="w-4 h-4" />}
          label="Order Value"
          value={
            <span className="text-[16px]">{formatCurrency(order.orderAmount)}</span>
          }
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
          borderColor="border-violet-500/[0.16]"
          delay={0.23}
        />
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Delivery address */}
        <Section
          title="Delivery Address"
          icon={<MapPin className="w-3.5 h-3.5" />}
          iconBg="bg-primary/10 text-primary"
          delay={0.18}
        >
          <div className="space-y-4">
            {/* Contact */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {order.deliveryAddress.contactName}
                </p>
                <p className="text-[11px] text-muted">Recipient</p>
              </div>
            </div>

            {/* Address block */}
            <div className="bg-background rounded-xl border border-border-light/70 px-4 py-3.5 space-y-2">
              <p className="text-xs text-muted leading-relaxed">
                {order.deliveryAddress.addressLine1}
                {order.deliveryAddress.addressLine2 &&
                  `, ${order.deliveryAddress.addressLine2}`}
              </p>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-tertiary shrink-0" />
                <p className="text-[12px] font-semibold text-foreground">
                  {order.deliveryAddress.city}, {order.deliveryAddress.state}
                  <span className="text-tertiary font-normal"> — </span>
                  {order.deliveryAddress.pincode}
                </p>
              </div>
              <p className="text-[11px] text-tertiary">{order.deliveryAddress.country}</p>
            </div>

            {/* Contact details */}
            <div className="flex flex-wrap gap-3">
              <a
                href={`tel:${order.deliveryAddress.phone}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border-light hover:border-primary/25 hover:bg-primary/[0.03] transition-all no-underline group"
              >
                <Phone className="w-3.5 h-3.5 text-tertiary group-hover:text-primary transition-colors" />
                <span className="text-[12px] font-semibold text-muted group-hover:text-primary transition-colors">
                  {order.deliveryAddress.phone}
                </span>
              </a>
              {order.deliveryAddress.email && (
                <a
                  href={`mailto:${order.deliveryAddress.email}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border-light hover:border-primary/25 hover:bg-primary/[0.03] transition-all no-underline group"
                >
                  <Mail className="w-3.5 h-3.5 text-tertiary group-hover:text-primary transition-colors" />
                  <span className="text-[12px] font-semibold text-muted group-hover:text-primary transition-colors truncate max-w-[160px]">
                    {order.deliveryAddress.email}
                  </span>
                </a>
              )}
            </div>
          </div>
        </Section>

        {/* Charges breakdown */}
        <Section
          title="Charges Breakdown"
          icon={<IndianRupee className="w-3.5 h-3.5" />}
          iconBg="bg-accent/10 text-accent"
          delay={0.21}
        >
          {/* 2×2 charge card grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <ChargeBar
              label="Forward charge"
              value={rate.forward}
              total={totalForBars}
              barClass="bg-primary"
              textClass="text-primary"
              show
            />
            <ChargeBar
              label="RTO charge"
              value={rate.rto}
              total={totalForBars}
              barClass="bg-accent"
              textClass="text-accent"
              show
            />
            <ChargeBar
              label="COD charges"
              value={rate.codCharges}
              total={totalForBars}
              barClass="bg-violet-400"
              textClass="text-violet-600"
            />
            <ChargeBar
              label="Other charges"
              value={rate.otherCharges}
              total={totalForBars}
              barClass="bg-muted"
            />
          </div>

          {/* Total + Freight row */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="flex gap-2.5"
          >
            {/* Total */}
            <div className="flex-1 flex items-center justify-between px-3 py-3 sm:px-4 sm:py-3.5 rounded-xl bg-gradient-to-br from-primary/[0.08] to-primary/[0.03] border border-primary/[0.15]">
              <div>
                <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.1em] mb-0.5">
                  Total
                </p>
                <p className="text-[10px] text-muted">All charges</p>
              </div>
              <span className="text-base sm:text-[20px] font-bold text-primary tabular-nums">
                {formatCurrency(rate.totalCharge)}
              </span>
            </div>
            {/* Freight */}
            <div className="flex-1 flex items-center justify-between px-3 py-3 sm:px-4 sm:py-3.5 rounded-xl bg-surface-muted/50 border border-border-light/60">
              <div>
                <p className="text-[10px] font-bold text-tertiary uppercase tracking-[0.1em] mb-0.5">
                  Freight
                </p>
                <p className="text-[10px] text-tertiary">By weight</p>
              </div>
              <span className="text-[15px] sm:text-[18px] font-bold text-foreground tabular-nums">
                {formatCurrency(rate.freightCharge)}
              </span>
            </div>
          </motion.div>
        </Section>
      </div>

      {/* ── Products ─────────────────────────────────────────────────────── */}
      <Section
        title="Products"
        icon={<Box className="w-3.5 h-3.5" />}
        iconBg="bg-primary/10 text-primary"
        delay={0.24}
        headerRight={
          <span className="text-[11px] font-bold text-primary bg-primary/[0.08] px-2.5 py-1 rounded-full">
            {order.products.length} item{order.products.length !== 1 ? "s" : ""}
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[360px]">
            <thead>
              <tr className="border-b border-border-light/60">
                <th className="text-[10px] font-bold text-tertiary uppercase tracking-wider pb-3 pr-4">
                  Product
                </th>
                <th className="text-[10px] font-bold text-tertiary uppercase tracking-wider pb-3 pr-4 text-right">
                  Unit Price
                </th>
                <th className="text-[10px] font-bold text-tertiary uppercase tracking-wider pb-3 pr-4 text-right">
                  Qty
                </th>
                <th className="text-[10px] font-bold text-tertiary uppercase tracking-wider pb-3 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {order.products.map((product, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.26 + i * 0.05, duration: 0.24 }}
                  className="border-b border-border-light/40 last:border-0 group hover:bg-surface-muted/30 transition-colors"
                >
                  <td className="py-3.5 pr-4">
                    <p className="text-[13px] font-semibold text-foreground">{product.name}</p>
                    {product.hsn && (
                      <p className="text-[10px] text-tertiary font-mono mt-0.5">
                        HSN {product.hsn}
                      </p>
                    )}
                    {product.taxRate != null && product.taxRate > 0 && (
                      <p className="text-[10px] text-tertiary mt-0.5">
                        GST {product.taxRate}%
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 text-right text-[12px] text-muted tabular-nums">
                    {formatCurrency(product.unitPrice)}
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary/[0.07] text-primary text-[11px] font-bold">
                      {product.quantity}
                    </span>
                  </td>
                  <td className="py-3.5 text-right text-[13px] font-bold text-foreground tabular-nums">
                    {formatCurrency(product.unitPrice * product.quantity)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-light/60">
                <td colSpan={3} className="pt-4 text-[11px] font-semibold text-muted">
                  Order Amount
                </td>
                <td className="pt-4 text-right text-[15px] font-bold text-foreground tabular-nums">
                  {formatCurrency(order.orderAmount)}
                </td>
              </tr>
              {order.codAmount > 0 && (
                <tr>
                  <td colSpan={3} className="pt-1 text-[11px] font-semibold text-muted">
                    COD Collection Amount
                  </td>
                  <td className="pt-1 text-right text-[14px] font-bold text-violet-600 tabular-nums">
                    {formatCurrency(order.codAmount)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </Section>

      {/* ── Bottom grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order info / Timeline */}
        <Section
          title="Order Info"
          icon={<Package className="w-3.5 h-3.5" />}
          iconBg="bg-primary/10 text-primary"
          delay={0.28}
        >
          <div className="space-y-0">
            <InfoRow label="Order ID" value={order.orderId} mono delay={0.3} />
            <InfoRow
              label="AWB Number"
              delay={0.33}
              value={
                <span className="flex items-center gap-1.5 justify-end">
                  <span className="font-mono">{order.awb}</span>
                  <CopyButton text={order.awb} label="AWB" />
                </span>
              }
            />
            {order.providerOrderId && (
              <InfoRow label="Provider Ref." value={order.providerOrderId} mono delay={0.36} />
            )}
            <InfoRow label="Order Type" value={order.orderType} delay={0.36} />
            <InfoRow
              label="Payment Type"
              delay={0.39}
              value={
                <span
                  className={
                    order.paymentType === "cod" ? "text-violet-600" : "text-success"
                  }
                >
                  {order.paymentType === "cod" ? "Cash on Delivery" : "Prepaid"}
                </span>
              }
            />
            <InfoRow label="Created" value={createdDate} delay={0.42} />
            {order.shippedAt && (
              <InfoRow label="Shipped on" value={formatDate(order.shippedAt)} delay={0.45} />
            )}
            {order.deliveredAt && (
              <InfoRow
                label="Delivered on"
                delay={0.48}
                value={
                  <span className="text-success font-semibold">
                    {formatDate(order.deliveredAt)}
                  </span>
                }
              />
            )}
            {order.cancelledAt && (
              <InfoRow
                label="Cancelled on"
                delay={0.48}
                value={
                  <span className="text-error">{formatDate(order.cancelledAt)}</span>
                }
              />
            )}
          </div>
        </Section>

        {/* Package details */}
        <Section
          title="Package Details"
          icon={<Ruler className="w-3.5 h-3.5" />}
          iconBg="bg-accent/10 text-accent"
          delay={0.31}
        >
          {/* Weight */}
          <div className="grid grid-cols-2 divide-x divide-border-light border border-border-light rounded-xl overflow-hidden mb-3">
            <div className="px-3.5 py-3 sm:px-5 sm:py-4">
              <p className="text-[11px] text-muted mb-2">Actual Weight</p>
              <p className="text-lg sm:text-[22px] font-bold text-foreground tabular-nums leading-none">
                {gramsToKg(order.weight).toFixed(2)}
                <span className="text-[13px] font-normal text-muted ml-1.5">kg</span>
              </p>
              <p className="text-[11px] text-muted mt-1.5">{order.weight} g</p>
            </div>
            <div className="px-3.5 py-3 sm:px-5 sm:py-4">
              <p className="text-[11px] text-primary/70 mb-2">Chargeable Weight</p>
              <p className="text-lg sm:text-[22px] font-bold text-primary tabular-nums leading-none">
                {gramsToKg(order.chargeableWeight).toFixed(2)}
                <span className="text-[13px] font-normal text-primary/50 ml-1.5">kg</span>
              </p>
              <p className="text-[11px] text-primary/50 mt-1.5">{order.chargeableWeight} g</p>
            </div>
          </div>

          {/* Dimensions */}
          <div className="border border-border-light rounded-xl overflow-hidden mb-3">
            <div className="flex items-center justify-between px-5 py-2.5 bg-surface-muted/30 border-b border-border-light/60">
              <span className="text-[11px] text-muted">Dimensions (cm)</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                <BadgeCheck className="w-3.5 h-3.5" />
                Zone {rate.zone}
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border-light/60">
              {[
                { val: order.length, label: "Length" },
                { val: order.breadth, label: "Breadth" },
                { val: order.height, label: "Height" },
              ].map(({ val, label }, i) => (
                <div key={label} className="px-3 py-3 sm:px-5 sm:py-4">
                  <p className="text-[11px] text-muted mb-2">{label}</p>
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.07, duration: 0.28 }}
                    className="text-lg sm:text-[22px] font-bold text-foreground tabular-nums leading-none"
                  >
                    {val}
                    <span className="text-[13px] font-normal text-muted ml-1">cm</span>
                  </motion.p>
                </div>
              ))}
            </div>
          </div>

          {/* Freight */}
          <div className="flex items-center justify-between px-5 py-4 border border-border-light rounded-xl">
            <div>
              <p className="text-[13px] font-medium text-foreground">Freight Charge</p>
              <p className="text-[11px] text-muted mt-0.5">Based on chargeable weight</p>
            </div>
            <p className="text-[20px] font-bold text-accent tabular-nums">
              {formatCurrency(rate.freightCharge)}
            </p>
          </div>
        </Section>

        {/* B2B Boxes */}
        {order.orderType === "B2B" && order.packages && order.packages.length > 0 && (
          <Section
            title="Boxes"
            icon={<Box className="w-3.5 h-3.5" />}
            iconBg="bg-primary/10 text-primary"
            delay={0.32}
            headerRight={
              <span className="text-[11px] font-bold text-primary bg-primary/[0.08] px-2.5 py-1 rounded-full">
                {order.packages.reduce((s, p) => s + (p.quantity ?? 1), 0)} box
                {order.packages.reduce((s, p) => s + (p.quantity ?? 1), 0) !== 1 ? "es" : ""}
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[480px]">
                <thead>
                  <tr className="border-b border-border-light/60">
                    <th className="text-[10px] font-bold text-tertiary uppercase tracking-wider pb-3 pr-4">Box ID</th>
                    <th className="text-[10px] font-bold text-tertiary uppercase tracking-wider pb-3 pr-4 text-right">Qty</th>
                    <th className="text-[10px] font-bold text-tertiary uppercase tracking-wider pb-3 pr-4 text-right">Wt (kg)</th>
                    <th className="text-[10px] font-bold text-tertiary uppercase tracking-wider pb-3 pr-4 text-right">L × B × H (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {order.packages.map((pkg, i) => (
                    <tr key={i} className="border-b border-border-light/40 last:border-0">
                      <td className="py-3 pr-4 text-[13px] font-medium text-foreground">{pkg.boxId}</td>
                      <td className="py-3 pr-4 text-right">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary/[0.07] text-primary text-[11px] font-bold">
                          {pkg.quantity ?? 1}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-[12px] text-muted tabular-nums">{pkg.weight}</td>
                      <td className="py-3 pr-4 text-right text-[12px] text-muted tabular-nums">
                        {pkg.length} × {pkg.breadth} × {pkg.height}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>

      {/* ── RTO Address (if present) ──────────────────────────────────────── */}
      {order.rtoAddress && (
        <Section
          title="RTO / Return Address"
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          iconBg="bg-error-bg text-error"
          delay={0.34}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-error-bg flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4 text-error" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {order.rtoAddress.contactName}
              </p>
              <p className="text-xs text-muted">
                {order.rtoAddress.addressLine1}
                {order.rtoAddress.addressLine2 && `, ${order.rtoAddress.addressLine2}`}
              </p>
              <p className="text-[12px] font-semibold text-foreground">
                {order.rtoAddress.city}, {order.rtoAddress.state} —{" "}
                {order.rtoAddress.pincode}
              </p>
              <a
                href={`tel:${order.rtoAddress.phone}`}
                className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-primary transition-colors no-underline"
              >
                <Phone className="w-3.5 h-3.5 text-tertiary" />
                {order.rtoAddress.phone}
              </a>
            </div>
          </div>
        </Section>
      )}
    </motion.div>
  );
}
