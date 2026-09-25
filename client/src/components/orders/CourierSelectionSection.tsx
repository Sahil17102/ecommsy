import { useState, useEffect, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Popover } from "antd";
import {
  Truck,
  Loader2,
  AlertCircle,
  Info,
  Package,
  Check,
  RefreshCw,
  ArrowRight,
  Plane,
  Ship,
} from "lucide-react";
import { FormSectionCard } from "@/components/common/FormSectionCard";
import { usePickupAddresses } from "@/pages/settings/pickup-addresses/queries";
import { type AvailableCourier } from "@/queries/useDelhiveryRate";
import { ratesApi } from "@/lib/ratesApi";
import { animationConfig } from "@/config/animations";
import { calcSubtotal } from "@/utils/orderHelpers";
import {
  expandPackagesByQuantity,
  totalBillableWeightKg,
  totalBoxCount,
} from "@/utils/b2bBoxes";
import { formatCurrency, formatKeyword } from "@/lib/utils";
import type { OrderFormValues } from "@/schemas/orderSchema";

interface RateLineItem {
  key: string;
  label: string;
  amount: number;
}

// Keys on the B2C `rate` object that are not individual charge line items.
// `forward` is a duplicate of `freightCharge`; `totalCharge` and `rto` are rendered separately.
const B2C_META_RATE_KEYS = new Set(["forward", "totalCharge", "rto"]);

function getRateLineItems(courier: AvailableCourier): RateLineItem[] {
  if (courier._b2bRate) {
    return [
      { key: "baseFreight", label: "Base Freight", amount: courier._b2bRate.baseFreight },
      ...courier._b2bRate.overheads.map((o) => ({ key: o.code, label: o.name, amount: o.amount })),
    ];
  }
  return Object.entries(courier.rate)
    .filter(([k, v]) => !B2C_META_RATE_KEYS.has(k) && typeof v === "number" && v > 0)
    .map(([k, v]) => ({ key: k, label: formatKeyword(k), amount: v as number }));
}

/* ─── Tag Config ─── */

const tagConfig = {
  economy: {
    label: "Cheapest",
    pillClass: "bg-emerald-50 text-emerald-600 border-emerald-200/60",
    dotClass: "bg-emerald-500",
  },
  fastest: {
    label: "Fastest",
    pillClass: "bg-violet-50 text-violet-600 border-violet-200/60",
    dotClass: "bg-violet-500",
  },
};

/* ─── Provider Logo ─── */

function ProviderLogo({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showFallback = !src || failed;

  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-surface-muted border border-border-light/60">
      {showFallback ? (
        <Truck className="w-3.5 h-3.5 text-muted" />
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

/* ─── Rate Breakdown ─── */

function RateBreakdown({
  courier,
  variant,
}: {
  courier: AvailableCourier;
  variant: "popover" | "inline";
}) {
  const b2bBreakdown = courier._b2bRate;
  const lineItems = getRateLineItems(courier);
  const rtoCharge = b2bBreakdown ? b2bBreakdown.rtoRate : courier.rate.rto;
  const chargeableLabel = b2bBreakdown ? "Billable" : "Chargeable";
  const chargeableValue = b2bBreakdown
    ? `${b2bBreakdown.billableWeight} kg`
    : `${courier.chargeableWeight} g`;

  const isPopover = variant === "popover";

  return (
    <div className={isPopover ? "min-w-[260px]" : ""}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider">
          Rate Breakdown
        </p>
        <p className="text-[10px] text-tertiary">
          {chargeableLabel}:{" "}
          <span className="font-semibold text-foreground">{chargeableValue}</span>
        </p>
      </div>
      <div className={isPopover ? "space-y-1" : "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1"}>
        {lineItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between text-[12px] min-w-0">
            <span className="text-muted truncate pr-2">{item.label}</span>
            <span className="font-medium text-foreground tabular-nums shrink-0">
              {formatCurrency(item.amount)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-border-light/60 text-[12.5px]">
        <span className="font-bold text-foreground">Total</span>
        <span className="font-bold text-primary tabular-nums">
          {formatCurrency(courier.rate.totalCharge)}
        </span>
      </div>
      {rtoCharge > 0 && (
        <div className="flex items-center justify-between text-[10.5px] text-tertiary mt-1">
          <span>RTO {b2bBreakdown ? "Rate" : "Charge"} (if returned)</span>
          <span className="tabular-nums">{formatCurrency(rtoCharge)}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Courier Row ─── */

function CourierRow({
  courier,
  isSelected,
  onSelect,
  index,
}: {
  courier: AvailableCourier;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const tag = courier.tag ? tagConfig[courier.tag] : null;
  const isExpress = courier.mode === "air";
  const hasBreakdown = getRateLineItems(courier).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * animationConfig.stagger.tight,
        duration: 0.25,
        ease: animationConfig.ease.out,
      }}
      className={`first:rounded-t-xl last:rounded-b-xl overflow-hidden transition-colors duration-200 ${
        isSelected ? "bg-primary/[0.04]" : "hover:bg-surface-muted/40"
      }`}
    >
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.998, transition: { duration: 0.1 } }}
      className="group relative w-full text-left px-4 py-3 cursor-pointer flex items-center gap-3"
    >
      {/* Left accent bar for selected */}
      <div
        className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-all duration-200 ${
          isSelected ? "bg-primary" : "bg-transparent"
        }`}
      />

      {/* Radio */}
      <div
        className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-200 ${
          isSelected
            ? "border-primary bg-primary"
            : "border-border group-hover:border-primary/30"
        }`}
      >
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <Check className="w-2.5 h-2.5 text-background" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Logo */}
      <ProviderLogo src={courier.logo} alt={courier.serviceProviderDisplayName} />

      {/* Info block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-foreground truncate">
            {courier.name}
          </span>
          {/* Mode inline on mobile, separate on desktop */}
          <span
            className={`sm:hidden inline-flex items-center gap-0.5 px-1.5 py-px text-[9px] font-bold uppercase rounded tracking-wider ${
              isExpress
                ? "text-primary bg-primary/[0.06]"
                : "text-tertiary bg-surface-muted"
            }`}
          >
            {isExpress ? "Air" : "Sfc"}
          </span>
        </div>
        <p className="text-[11px] text-tertiary mt-px truncate">
          {courier.serviceProviderDisplayName}
        </p>
      </div>

      {/* Tag */}
      {tag && (
        <span
          className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${tag.pillClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tag.dotClass}`} />
          {tag.label}
        </span>
      )}

      {/* Mode badge — desktop */}
      <span
        className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded-lg tracking-wider shrink-0 ${
          isExpress
            ? "bg-primary/[0.06] text-primary"
            : "bg-surface-muted text-tertiary"
        }`}
      >
        {isExpress ? <Plane className="w-3 h-3" /> : <Ship className="w-3 h-3" />}
        {isExpress ? "Express" : "Surface"}
      </span>

      {/* Price + info button */}
      <div className="flex items-center gap-1.5 shrink-0">
        {hasBreakdown && (
          <Popover
            content={<RateBreakdown courier={courier} variant="popover" />}
            title={null}
            placement="left"
            trigger={["hover", "click"]}
            mouseEnterDelay={0.1}
            styles={{ body: { padding: "12px 14px" } }}
          >
            <span
              role="button"
              tabIndex={0}
              aria-label="View rate breakdown"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") e.stopPropagation();
              }}
              className="flex items-center justify-center w-6 h-6 rounded-full text-tertiary hover:text-primary hover:bg-primary/[0.06] transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </Popover>
        )}
        <div className="text-right min-w-[72px]">
          <p
            className={`text-[15px] font-bold leading-none tabular-nums tracking-tight transition-colors duration-200 ${
              isSelected ? "text-primary" : "text-foreground"
            }`}
          >
            {formatCurrency(courier.rate.totalCharge)}
          </p>
          <p className="text-[9px] text-tertiary mt-1 uppercase tracking-wider font-semibold">
            {courier.rate.codCharges > 0 ? "COD" : "Prepaid"}
          </p>
        </div>
      </div>
    </motion.button>

    {/* Inline breakdown — shown only for the selected courier so the chosen row makes the full price story visible without forcing the user to hover. */}
    <AnimatePresence initial={false}>
      {isSelected && hasBreakdown && (
        <motion.div
          key="inline-breakdown"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: animationConfig.ease.out }}
          className="overflow-hidden border-t border-border-light/50"
        >
          <div className="px-4 py-3 bg-background/40">
            <RateBreakdown courier={courier} variant="inline" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </motion.div>
  );
}

/* ─── Main Section ─── */

interface CourierSelectionSectionProps {
  onCouriersLoaded?: (couriers: AvailableCourier[]) => void;
}

export function CourierSelectionSection({ onCouriersLoaded }: CourierSelectionSectionProps) {
  const { watch, setValue } = useFormContext<OrderFormValues>();
  const { data: addresses = [] } = usePickupAddresses();

  const [couriers, setCouriers] = useState<AvailableCourier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read form values
  const pickupAddressId = watch("pickupAddressId");
  const deliveryPincode = watch("pincode");
  const weightG = Number(watch("weight")) || 0;
  const length = Number(watch("length")) || 0;
  const breadth = Number(watch("breadth")) || 0;
  const height = Number(watch("height")) || 0;
  const paymentType = watch("paymentType");
  const orderType = watch("orderType");
  const products = watch("products") || [];
  const selectedCourierId = watch("selectedCourierId");
  const packagesWatch = watch("packages") || [];

  // Derive pickup pincode from selected address
  const pickupAddress = addresses.find((a) => a.id === pickupAddressId);
  const pickupPincode = pickupAddress?.pincode ?? "";

  // Calculate order amount from products
  const orderAmount = calcSubtotal(products);

  // For B2B, weight is the sum of max(dead, volumetric) × qty across all box types
  // — same formula the backend uses, so canFetch / hasWeight stay in sync with the rate.
  const b2bBillableKg = totalBillableWeightKg(packagesWatch);
  const b2bBoxCount = totalBoxCount(packagesWatch);
  const hasWeight = orderType === "B2B" ? b2bBillableKg > 0 : weightG > 0;

  // Check if we have enough data to fetch
  const canFetch =
    pickupPincode.length === 6 &&
    deliveryPincode.length === 6 &&
    hasWeight;

  const fetchCouriers = useCallback(async () => {
    if (!canFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      let data: AvailableCourier[];

      if (orderType === "B2B") {
        // B2B uses per-kg zone-to-zone pricing with multi-box support.
        // `expandPackagesByQuantity` flattens 3 identical boxes into 3 entries
        // since the rate API bills per-package (no `quantity` field server-side).
        const formPackages = (watch("packages") ?? []) as Array<{
          quantity?: number; weight: number; length: number; breadth: number; height: number;
        }>;
        const pkgs = formPackages.length > 0
          ? expandPackagesByQuantity(formPackages)
          : [{ weight: weightG / 1000, length, breadth, height }];

        const b2bData = await ratesApi.getB2bAvailableCouriers({
          origin: pickupPincode,
          destination: deliveryPincode,
          packages: pkgs,
          paymentType: paymentType as "prepaid" | "cod",
          orderAmount: orderAmount,
        });

        // Map B2B response to AvailableCourier shape for unified rendering
        data = b2bData.map((c) => ({
          courierId: c.courierId,
          name: c.name,
          serviceProvider: c.serviceProvider,
          serviceProviderDisplayName: c.serviceProviderDisplayName,
          logo: c.logo,
          mode: "surface" as const,
          zone: { code: `${c.zone.originCode}→${c.zone.destinationCode}`, name: `${c.zone.originName} → ${c.zone.destinationName}` },
          chargeableWeight: c.billableWeight * 1000, // convert kg to grams for display consistency
          minWeight: 1000,
          rate: {
            forward: c.rate.baseFreight,
            rto: c.rate.rtoRate,
            codCharges: c.rate.overheads.find((o) => o.code === "COD")?.amount ?? 0,
            otherCharges: c.rate.overheads.filter((o) => o.code !== "COD").reduce((s, o) => s + o.amount, 0),
            freightCharge: c.rate.baseFreight,
            totalCharge: c.rate.total,
          },
          tag: c.tag,
          // Stash B2B-specific data for submission
          _b2bRate: c.rate,
        })) as AvailableCourier[];
      } else {
        data = await ratesApi.getAvailableCouriers({
          origin: pickupPincode,
          destination: deliveryPincode,
          weight: weightG,
          length: length || undefined,
          breadth: breadth || undefined,
          height: height || undefined,
          paymentType: paymentType as "prepaid" | "cod",
          orderAmount: paymentType === "cod" ? orderAmount : undefined,
          orderType: "B2C",
        });
      }
      setCouriers(data);
      onCouriersLoaded?.(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch couriers");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, pickupPincode, deliveryPincode, weightG, b2bBillableKg, b2bBoxCount, length, breadth, height, paymentType, orderAmount, orderType]);

  // Auto-fetch on mount AND whenever fetch inputs change (debounced via the deps below)
  // so that bumping a box's `quantity` re-prices without needing a manual refresh.
  useEffect(() => {
    if (!canFetch) return;
    const timer = setTimeout(() => fetchCouriers(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, pickupPincode, deliveryPincode, weightG, b2bBillableKg, b2bBoxCount, length, breadth, height, paymentType, orderAmount, orderType]);

  const handleRefresh = () => fetchCouriers();

  const handleSelect = (courierId: string) => {
    setValue("selectedCourierId", courierId, { shouldValidate: true });
  };

  return (
    <FormSectionCard
      icon={<Truck className="w-4.5 h-4.5 text-primary" />}
      iconColor="bg-primary/10"
      title="Select Courier Partner"
      subtitle="Compare rates and choose the best courier for your shipment"
      index={0}
    >
      {/* Missing data warning */}
      {!canFetch && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-accent/[0.06] border border-accent/20"
        >
          <AlertCircle className="w-5 h-5 text-accent shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Missing shipment details
            </p>
            <p className="text-xs text-muted mt-0.5">
              {!pickupPincode && "Select a pickup address. "}
              {deliveryPincode.length !== 6 && "Enter a valid delivery pincode. "}
              {!hasWeight && "Enter package weight."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center gap-3 py-12"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/20"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <span className="text-sm text-muted font-medium">
            Fetching rates from all couriers...
          </span>
        </motion.div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-error-bg border border-error-border"
        >
          <AlertCircle className="w-5 h-5 text-error shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="shrink-0 p-2 rounded-lg text-error hover:bg-error-bg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Empty state */}
      {!error && couriers.length === 0 && !isLoading && canFetch && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            No couriers available
          </p>
          <p className="text-xs text-muted max-w-xs mx-auto">
            No courier rates found for this route. Try updating your pincodes or package details.
          </p>
        </motion.div>
      )}

      {/* Courier list */}
      {couriers.length > 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Route info bar */}
          <div className="flex items-center justify-between mb-3 px-3 py-2.5 rounded-xl bg-surface-muted/50 border border-border-light/60">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/[0.08] text-primary text-[11px] font-bold">
                <Truck className="w-3 h-3" />
                {couriers.length} option{couriers.length !== 1 && "s"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border-light/80 text-[11px] font-semibold text-foreground font-mono tracking-tight">
                {pickupPincode}
                <ArrowRight className="w-3 h-3 text-primary" />
                {deliveryPincode}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border-light/80 text-[11px] font-medium text-muted">
                <Package className="w-3 h-3 text-tertiary" />
                {couriers[0].chargeableWeight}g
                <span className="h-3 w-px bg-border-light" />
                {couriers[0].zone.name}
              </span>
            </div>
            <motion.button
              type="button"
              onClick={handleRefresh}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-primary bg-primary/[0.06] hover:bg-primary/[0.12] border border-primary/10 transition-all duration-200"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </motion.button>
          </div>

          {/* Courier list */}
          <div className="rounded-xl border border-border-light bg-background-elevated overflow-hidden divide-y divide-border-light/60">
            <AnimatePresence mode="wait">
              {couriers.map((courier, i) => (
                <CourierRow
                  key={courier.courierId}
                  courier={courier}
                  isSelected={selectedCourierId === courier.courierId}
                  onSelect={() => handleSelect(courier.courierId)}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Validation hint */}
          {!selectedCourierId && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[11px] text-tertiary mt-3 text-center"
            >
              Select a courier partner to continue
            </motion.p>
          )}
        </motion.div>
      )}
    </FormSectionCard>
  );
}
