import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  ArrowRight,
  IndianRupee,
  Truck,
  Eye,
  Package,
  MapPin,
  Weight,
  Ruler,
  CreditCard,
  Banknote,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Container, PageHero, CtaBanner } from "@/components/common";
import { scrollFadeUp, staggeredChild, animationConfig } from "@/config/animations";
import { useDelhiveryRate } from "@/queries/useDelhiveryRate";
import { formatCurrency } from "@/lib/utils";

const benefits = [
  {
    icon: <IndianRupee className="w-6 h-6" />,
    title: "Real-Time Rates",
    description:
      "Live pricing from all courier partners — no stale data or hidden surcharges.",
  },
  {
    icon: <Truck className="w-6 h-6" />,
    title: "All Couriers at Once",
    description:
      "Compare rates from 25+ couriers side-by-side in a single view.",
  },
  {
    icon: <Eye className="w-6 h-6" />,
    title: "Transparent Pricing",
    description:
      "See base rate, fuel surcharge, COD fee, and total cost — no surprises.",
  },
];

/* ═══════════════════════════════════════════════════════════
   INPUT FIELD — extracted outside to prevent remount on every keystroke
   ═══════════════════════════════════════════════════════════ */

function InputField({
  name,
  label,
  placeholder,
  icon,
  type = "text",
  suffix,
  maxLength,
  step,
  min,
  value,
  focusedField,
  onChange,
  onFocus,
  onBlur,
}: {
  name: string;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  type?: string;
  suffix?: string;
  maxLength?: number;
  step?: string;
  min?: string;
  value: string;
  focusedField: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: (name: string) => void;
  onBlur: () => void;
}) {
  return (
    <motion.div
      animate={{ scale: focusedField === name ? 1.01 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <label className="block text-xs font-medium text-muted mb-1.5">
        {label}
      </label>
      <div
        className={`relative flex items-center h-12 rounded-xl border-2 transition-all duration-200 ${
          focusedField === name
            ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/10"
            : "border-border-light bg-background hover:border-primary/20"
        }`}
      >
        <span
          className={`flex items-center justify-center w-10 h-full transition-colors ${
            focusedField === name ? "text-primary" : "text-muted"
          }`}
        >
          {icon}
        </span>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => onFocus(name)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          step={step}
          min={min}
          className="flex-1 h-full pr-3 text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary"
        />
        {suffix && (
          <span className="pr-3 text-xs text-muted">{suffix}</span>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RATE CALCULATOR PAGE
   ═══════════════════════════════════════════════════════════ */

export function RateCalculatorPage() {
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    paymentMode: "prepaid",
  });

  const rateMutation = useDelhiveryRate();
  const rateData = rateMutation.data ?? null;
  const loading = rateMutation.isPending;
  const error = rateMutation.error?.message ?? null;
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFocus = (name: string) => setFocusedField(name);
  const handleBlur = () => setFocusedField(null);

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    rateMutation.reset();

    const weightKg = parseFloat(formData.weight);
    if (!formData.origin || !formData.destination || !weightKg) {
      setValidationError("Please fill in origin, destination, and weight.");
      return;
    }

    // Calculate charged weight in grams
    // Volumetric weight = (L × W × H) / 5000 (cm → kg), then to grams × 1000
    const l = parseFloat(formData.length) || 0;
    const w = parseFloat(formData.width) || 0;
    const h = parseFloat(formData.height) || 0;
    const actualGrams = weightKg * 1000;
    const volumetricGrams = l && w && h ? (l * w * h) / 5 : 0;
    const cgm = Math.max(actualGrams, volumetricGrams);

    rateMutation.mutate({
      originPin: formData.origin,
      destinationPin: formData.destination,
      chargeableGrams: Math.ceil(cgm),
      mode: "S",
    });
  };

  return (
    <>
      {/* ━━━ HERO ━━━ */}
      <PageHero
        badge="Rate Calculator"
        badgeVariant="accent"
        title={
          <>
            Compare{" "}
            <span className="text-gradient-accent">Shipping Rates</span>{" "}
            Instantly
          </>
        }
        subtitle="Enter your shipment details to compare real-time rates across all courier partners. Find the cheapest, fastest option in seconds."
      />

      {/* ━━━ CALCULATOR ━━━ */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-b from-[#F8F7FF] via-background to-white overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-10 -right-40 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -left-32 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl pointer-events-none" />

        <Container maxWidth="lg" className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: animationConfig.ease.out }}
          >
            <form
              onSubmit={handleSubmit}
              className="relative bg-white border border-border-light rounded-2xl shadow-xl shadow-primary/[0.06] overflow-hidden"
            >
              {/* Gradient top accent */}
              <div className="h-1.5 bg-gradient-to-r from-accent via-accent/60 to-primary" />

              <div className="p-6 sm:p-8 lg:p-10">
                {/* Section label */}
                <div className="flex items-center gap-2.5 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center text-accent">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Shipment Details
                    </h2>
                    <p className="text-xs text-muted">
                      Fill in your package info to see rates
                    </p>
                  </div>
                </div>

                {/* Route section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full bg-primary" />
                    <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                      Route
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      name="origin"
                      label="Origin Pincode"
                      placeholder="e.g. 110001"
                      icon={<MapPin className="w-4 h-4" />}
                      maxLength={6}
                      value={formData.origin}
                      focusedField={focusedField}
                      onChange={handleChange}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                    <InputField
                      name="destination"
                      label="Destination Pincode"
                      placeholder="e.g. 400001"
                      icon={<MapPin className="w-4 h-4" />}
                      maxLength={6}
                      value={formData.destination}
                      focusedField={focusedField}
                      onChange={handleChange}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>

                {/* Package section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full bg-accent" />
                    <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                      Package
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <InputField
                      name="weight"
                      label="Package Weight"
                      placeholder="e.g. 0.5"
                      icon={<Weight className="w-4 h-4" />}
                      type="number"
                      suffix="kg"
                      step="0.1"
                      min="0"
                      value={formData.weight}
                      focusedField={focusedField}
                      onChange={handleChange}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1.5">
                        Dimensions{" "}
                        <span className="text-tertiary font-normal">
                          — optional
                        </span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {["length", "width", "height"].map((dim) => (
                          <motion.div
                            key={dim}
                            animate={{
                              scale: focusedField === dim ? 1.03 : 1,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 25,
                            }}
                          >
                            <div
                              className={`flex items-center h-12 rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                                focusedField === dim
                                  ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/10"
                                  : "border-border-light bg-background hover:border-primary/20"
                              }`}
                            >
                              <span
                                className={`flex items-center justify-center w-7 shrink-0 transition-colors ${
                                  focusedField === dim
                                    ? "text-primary"
                                    : "text-muted"
                                }`}
                              >
                                <Ruler className="w-3 h-3" />
                              </span>
                              <input
                                type="number"
                                name={dim}
                                value={
                                  formData[dim as keyof typeof formData]
                                }
                                onChange={handleChange}
                                onFocus={() => setFocusedField(dim)}
                                onBlur={() => setFocusedField(null)}
                                placeholder={dim[0].toUpperCase()}
                                min="0"
                                className="min-w-0 flex-1 h-full pr-2 text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary"
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                      Payment
                    </span>
                  </div>
                  <div className="flex gap-3">
                    {[
                      {
                        value: "prepaid",
                        label: "Prepaid",
                        icon: <CreditCard className="w-4 h-4" />,
                      },
                      {
                        value: "cod",
                        label: "Cash on Delivery",
                        icon: <Banknote className="w-4 h-4" />,
                      },
                    ].map((mode) => (
                      <motion.label
                        key={mode.value}
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium cursor-pointer transition-all ${
                          formData.paymentMode === mode.value
                            ? "border-primary bg-primary/[0.04] text-primary shadow-sm shadow-primary/10"
                            : "border-border-light bg-background text-foreground/60 hover:border-primary/20"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMode"
                          value={mode.value}
                          checked={formData.paymentMode === mode.value}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span
                          className={`transition-colors ${
                            formData.paymentMode === mode.value
                              ? "text-primary"
                              : "text-muted"
                          }`}
                        >
                          {mode.icon}
                        </span>
                        {mode.label}
                      </motion.label>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-hover rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      Calculate Rates
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>

          {/* ━━━ RESULTS ━━━ */}
          <AnimatePresence>
            {/* Loading state */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: animationConfig.ease.out }}
                className="mt-8"
              >
                <div className="bg-white border border-border-light rounded-2xl shadow-xl shadow-primary/[0.06] overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary to-accent" />
                  <div className="p-6 sm:p-8 flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-sm text-muted font-medium">
                      Fetching rates from Delhivery...
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error state */}
            {(validationError || error) && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: animationConfig.ease.out }}
                className="mt-8"
              >
                <div className="bg-white border border-red-200 rounded-2xl shadow-xl shadow-red-500/[0.06] overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-red-400 to-red-500" />
                  <div className="p-6 sm:p-8 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <span className="text-sm text-red-600 font-medium">
                      {validationError || error}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Rate results */}
            {rateData && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: animationConfig.ease.out }}
                className="mt-8"
              >
                <div className="bg-white border border-border-light rounded-2xl shadow-xl shadow-primary/[0.06] overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary to-accent" />

                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-2.5 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          Delhivery Rate
                        </h3>
                        <p className="text-xs text-muted">
                          Live rate from Delhivery API
                        </p>
                      </div>
                    </div>

                    {/* Header row */}
                    <motion.div
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ease: animationConfig.ease.out }}
                      className="flex items-center gap-4 bg-background border border-border-light rounded-xl p-4 sm:p-5"
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-red-50 text-red-600">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            Delhivery
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-50 text-emerald-600">
                            Surface
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-50 text-blue-600">
                            Zone {rateData.zone}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-1">
                          Charged weight: {rateData.charged_weight}g
                        </p>
                      </div>
                      <div className="text-right ml-2 sm:ml-4">
                        <div className="text-xl font-bold text-foreground">
                          {formatCurrency(rateData.total_amount)}
                        </div>
                        <p className="text-[10px] text-muted uppercase tracking-wide">
                          Total
                        </p>
                      </div>
                    </motion.div>

                    {/* Charge breakdown */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Base Freight", value: rateData.gross_amount },
                        { label: "Fuel Surcharge", value: rateData.charge_FS },
                        { label: "COD Fee", value: rateData.charge_COD },
                        { label: "Tax (GST)", value: rateData.tax_amount },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="bg-background border border-border-light rounded-lg px-3 py-2.5 text-center"
                        >
                          <p className="text-[10px] text-muted uppercase tracking-wide mb-1">
                            {item.label}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(item.value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </section>

      {/* ━━━ BENEFITS ━━━ */}
      <section className="py-16 sm:py-24 bg-background">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Why use our{" "}
              <span className="text-gradient-primary">rate calculator</span>
            </h2>
            <p className="text-muted max-w-xl mx-auto leading-relaxed">
              Stop visiting individual courier websites. Compare all rates in
              one go.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                {...staggeredChild(i, 0.15)}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-bg text-primary mb-5">
                  {b.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {b.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
                  {b.description}
                </p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ CTA BANNER ━━━ */}
      <CtaBanner
        title={
          <>
            Get the cheapest rates
            <br />
            on every shipment
          </>
        }
        subtitle="Sign up for free and access pre-negotiated rates that save you up to 50% on shipping costs."
        primaryCta={{ label: "Start Shipping Free", href: "/signup" }}
        secondaryCta={{ label: "Explore Platform", href: "/platform" }}
      />
    </>
  );
}
