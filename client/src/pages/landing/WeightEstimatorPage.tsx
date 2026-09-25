import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Lightbulb,
  Package,
  Ruler,
  Weight,
  Box,
  ArrowDownUp,
} from "lucide-react";
import { Container, PageHero, CtaBanner } from "@/components/common";
import { scrollFadeUp, staggeredChild, animationConfig } from "@/config/animations";

const tips = [
  {
    icon: <Package className="w-5 h-5" />,
    title: "Use the right box size",
    description:
      "Avoid oversized boxes — they increase volumetric weight and cost more. Trim packaging to fit snugly.",
  },
  {
    icon: <Ruler className="w-5 h-5" />,
    title: "Measure accurately",
    description:
      "Measure the longest, widest, and tallest points of the packed box. Round up to the nearest centimeter.",
  },
  {
    icon: <Weight className="w-5 h-5" />,
    title: "Weigh after packing",
    description:
      "Always weigh your package after adding padding, bubble wrap, and the outer box to get the actual weight.",
  },
  {
    icon: <Lightbulb className="w-5 h-5" />,
    title: "Consider lightweight materials",
    description:
      "Switch to lighter packaging materials like poly mailers for non-fragile items to save on shipping.",
  },
];

const dimensionFields = [
  { name: "length", label: "Length", unit: "cm", icon: <Ruler className="w-4 h-4" /> },
  { name: "width", label: "Width", unit: "cm", icon: <ArrowDownUp className="w-4 h-4" /> },
  { name: "height", label: "Height", unit: "cm", icon: <Box className="w-4 h-4" /> },
];


export function WeightEstimatorPage() {
  const [dimensions, setDimensions] = useState({
    length: "",
    width: "",
    height: "",
    actualWeight: "",
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDimensions((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const result = useMemo(() => {
    const l = parseFloat(dimensions.length);
    const w = parseFloat(dimensions.width);
    const h = parseFloat(dimensions.height);
    const actual = parseFloat(dimensions.actualWeight);

    if (!l || !w || !h || !actual) return null;

    const volumetric = (l * w * h) / 5000;
    const chargeable = Math.max(actual, volumetric);

    return {
      volumetric: volumetric.toFixed(2),
      actual: actual.toFixed(2),
      chargeable: chargeable.toFixed(2),
      isVolumetric: volumetric > actual,
    };
  }, [dimensions]);

  return (
    <>
      {/* ━━━ HERO ━━━ */}
      <PageHero
        badge="Weight Estimator"
        title={
          <>
            Calculate Your{" "}
            <span className="text-gradient-primary">Shipping Weight</span>
          </>
        }
        subtitle="Couriers charge based on the higher of actual weight vs volumetric weight. Use this tool to find your chargeable weight before shipping."
      />

      {/* ━━━ CALCULATOR ━━━ */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-b from-background via-background to-white overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-32 w-80 h-80 rounded-full bg-accent/[0.03] blur-3xl pointer-events-none" />

        <Container maxWidth="lg" className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            {/* ── Form ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: animationConfig.ease.out }}
            >
              <div className="relative bg-white border border-border-light rounded-2xl shadow-xl shadow-primary/[0.06] overflow-hidden">
                {/* Gradient top accent */}
                <div className="h-1.5 bg-gradient-to-r from-primary via-primary/60 to-accent" />

                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2.5 mb-7">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Package Dimensions
                      </h2>
                      <p className="text-xs text-muted">
                        All fields required for calculation
                      </p>
                    </div>
                  </div>

                  {/* Dimension inputs */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {dimensionFields.map((field) => (
                      <motion.div
                        key={field.name}
                        animate={{
                          scale: focusedField === field.name ? 1.02 : 1,
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <label className="block text-xs font-medium text-muted mb-1.5">
                          {field.label}
                        </label>
                        <div
                          className={`relative flex items-center h-12 rounded-xl border-2 transition-all duration-200 ${
                            focusedField === field.name
                              ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/10"
                              : "border-border-light bg-background hover:border-primary/20"
                          }`}
                        >
                          <span
                            className={`flex items-center justify-center w-10 shrink-0 transition-colors ${
                              focusedField === field.name
                                ? "text-primary"
                                : "text-muted"
                            }`}
                          >
                            {field.icon}
                          </span>
                          <input
                            type="number"
                            name={field.name}
                            value={dimensions[field.name as keyof typeof dimensions]}
                            onChange={handleChange}
                            onFocus={() => setFocusedField(field.name)}
                            onBlur={() => setFocusedField(null)}
                            placeholder="0"
                            min="0"
                            step="0.1"
                            className="flex-1 min-w-0 h-full pr-1 text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary"
                          />
                          <span className="pr-3 text-xs text-muted shrink-0">
                            {field.unit}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Actual Weight */}
                  <motion.div
                    animate={{
                      scale: focusedField === "actualWeight" ? 1.01 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <label className="block text-xs font-medium text-muted mb-1.5">
                      Actual Weight
                    </label>
                    <div
                      className={`relative flex items-center h-12 rounded-xl border-2 transition-all duration-200 ${
                        focusedField === "actualWeight"
                          ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/10"
                          : "border-border-light bg-background hover:border-primary/20"
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center w-10 shrink-0 transition-colors ${
                          focusedField === "actualWeight"
                            ? "text-primary"
                            : "text-muted"
                        }`}
                      >
                        <Weight className="w-4 h-4" />
                      </span>
                      <input
                        type="number"
                        name="actualWeight"
                        value={dimensions.actualWeight}
                        onChange={handleChange}
                        onFocus={() => setFocusedField("actualWeight")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="e.g. 0.5"
                        min="0"
                        step="0.1"
                        className="flex-1 h-full pr-3 text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary"
                      />
                      <span className="pr-3 text-xs text-muted">kg</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* ── Result ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.15,
                ease: animationConfig.ease.out,
              }}
            >
              <div className="relative bg-white border border-border-light rounded-2xl shadow-xl shadow-primary/[0.06] overflow-hidden h-full flex flex-col">
                <div className="h-1.5 bg-gradient-to-r from-accent via-accent/60 to-primary" />

                <div className="p-6 sm:p-8 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold text-foreground mb-6">
                    Weight Breakdown
                  </h3>

                  <AnimatePresence mode="wait">
                    {result ? (
                      <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3, ease: animationConfig.ease.out }}
                        className="flex-1 space-y-4"
                      >
                        {/* Actual Weight */}
                        <motion.div
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 }}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
                            !result.isVolumetric
                              ? "border-primary/20 bg-primary/[0.03]"
                              : "border-border-light bg-background"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                !result.isVolumetric
                                  ? "bg-primary/10 text-primary"
                                  : "bg-blue-50 text-blue-400"
                              }`}
                            >
                              <Weight className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              Actual Weight
                            </span>
                          </div>
                          <motion.span
                            key={result.actual}
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`text-lg font-bold tabular-nums ${
                              !result.isVolumetric
                                ? "text-primary"
                                : "text-foreground/60"
                            }`}
                          >
                            {result.actual} kg
                          </motion.span>
                        </motion.div>

                        {/* Volumetric Weight */}
                        <motion.div
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                          className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
                            result.isVolumetric
                              ? "border-accent/20 bg-accent/[0.03]"
                              : "border-border-light bg-background"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                result.isVolumetric
                                  ? "bg-accent/10 text-accent"
                                  : "bg-violet-50 text-violet-400"
                              }`}
                            >
                              <Ruler className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              Volumetric Weight
                            </span>
                          </div>
                          <motion.span
                            key={result.volumetric}
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`text-lg font-bold tabular-nums ${
                              result.isVolumetric
                                ? "text-accent"
                                : "text-foreground/60"
                            }`}
                          >
                            {result.volumetric} kg
                          </motion.span>
                        </motion.div>

                        {/* Chargeable Weight */}
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.06] border-2 border-primary/15"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-md">
                              <Scale className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-foreground">
                                Chargeable Weight
                              </span>
                              <span className="block text-xs text-muted mt-0.5">
                                {result.isVolumetric
                                  ? "Volumetric is higher"
                                  : "Actual is higher"}
                              </span>
                            </div>
                          </div>
                          <motion.span
                            key={result.chargeable}
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-lg font-bold tabular-nums text-gradient-primary"
                          >
                            {result.chargeable} kg
                          </motion.span>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center text-center py-6"
                      >
                        <motion.div
                          animate={{ y: [0, -6, 0] }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4"
                        >
                          <Scale className="w-8 h-8 text-primary/40" />
                        </motion.div>
                        <p className="text-sm font-medium text-foreground/70 mb-1">
                          Waiting for your input
                        </p>
                        <p className="text-xs text-muted max-w-xs">
                          Enter package dimensions and weight on the left to see
                          your chargeable weight instantly.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* ━━━ TIPS ━━━ */}
      <section className="py-16 sm:py-24 bg-background">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-accent bg-accent-bg rounded-full mb-4">
              Pro Tips
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Reduce your{" "}
              <span className="text-gradient-accent">shipping weight</span>
            </h2>
            <p className="text-muted max-w-xl mx-auto leading-relaxed">
              Small packaging optimizations can save you thousands in shipping
              costs every month.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
            {tips.map((t, i) => (
              <motion.div key={t.title} {...staggeredChild(i)}>
                <div className="group flex gap-4 bg-white border border-border-light rounded-xl p-6 hover:border-accent/25 hover:shadow-lg hover:shadow-accent/5 transition-all h-full">
                  <div className="w-10 h-10 rounded-xl bg-accent-bg flex items-center justify-center text-accent shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                    {t.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      {t.title}
                    </h3>
                    <p className="text-sm text-muted leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ CTA BANNER ━━━ */}
      <CtaBanner
        title={
          <>
            Ready to optimize
            <br />
            your shipping costs?
          </>
        }
        subtitle="Join 1.5 Lakh+ businesses using Box and Beyond to ship smarter and cheaper across India."
        primaryCta={{ label: "Start Free Trial", href: "/signup" }}
        secondaryCta={{ label: "Compare Rates", href: "/resources/rate-calculator" }}
      />
    </>
  );
}
