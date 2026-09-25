import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { Container, PageHero, CtaBanner } from "@/components/common";
import { scrollFadeUp, staggeredChild, animationConfig } from "@/config/animations";
import { trackShipment, type TrackingResult } from "@/lib/publicTrackingApi";

/** Pick a timeline icon from a status label. */
function statusIcon(text: string | null | undefined) {
  const t = (text ?? "").toLowerCase();
  if (t.includes("deliver") && !t.includes("out for")) return <CheckCircle2 className="w-4.5 h-4.5" />;
  if (t.includes("out for")) return <Truck className="w-4.5 h-4.5" />;
  if (t.includes("transit") || t.includes("dispatch") || t.includes("shipped")) return <ArrowRight className="w-4.5 h-4.5" />;
  if (t.includes("pick") || t.includes("manifest") || t.includes("booked")) return <Package className="w-4.5 h-4.5" />;
  return <Clock className="w-4.5 h-4.5" />;
}

/** Human-readable status: "in_transit" → "In Transit". */
function prettyStatus(s: string | null | undefined) {
  if (!s) return "—";
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(ts: string | null | undefined) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const isDelivered = (s: string | null | undefined) => (s ?? "").toLowerCase().includes("deliver");

const faqs = [
  {
    question: "Where do I find my AWB / tracking number?",
    answer:
      "Your AWB (Air Waybill) number is shared via SMS or email after your order is shipped. You can also find it in your order details on the seller's website or app.",
  },
  {
    question: "How often is tracking information updated?",
    answer:
      "Tracking is updated in real-time as the courier scans your package at each transit point. Updates typically appear within minutes of a scan event.",
  },
  {
    question: "What if my tracking shows no updates?",
    answer:
      "If there are no updates for 24-48 hours, the package may be in transit between hubs. If it persists, contact our support team and we'll check with the courier partner directly.",
  },
  {
    question: "Can I track multiple shipments at once?",
    answer:
      "Yes! On the Searchcraft dashboard, you can track all your shipments in one view with real-time status, filters, and bulk actions. Sign up for free to access.",
  },
];


export function TrackShipmentPage() {
  const [awbNumber, setAwbNumber] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackingResult | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = awbNumber.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await trackShipment(q);
      if (!data.found) {
        setError(data.message ?? "No shipment found for this AWB / Order ID.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Something went wrong while fetching tracking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const showResults = loading || !!error || !!result;

  return (
    <>
      {/* ━━━ HERO WITH SEARCH ━━━ */}
      <PageHero
        badge="Track Shipment"
        badgeVariant="accent"
        title={
          <>
            Track Your Shipment in{" "}
            <span className="text-gradient-accent">Real-Time</span>
          </>
        }
        subtitle="Enter your AWB number or order ID to get instant tracking updates from any courier partner."
      >
        {/* Search Bar */}
        <motion.form
          onSubmit={handleTrack}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.5,
            ease: animationConfig.ease.out,
          }}
          className="max-w-xl mx-auto"
        >
          <div className="flex gap-2 bg-white rounded-xl border border-border shadow-lg shadow-primary/5 p-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted pointer-events-none" />
              <input
                type="text"
                value={awbNumber}
                onChange={(e) => setAwbNumber(e.target.value)}
                placeholder="Enter AWB number or Order ID"
                className="w-full h-12 pl-10 pr-4 text-sm text-foreground bg-transparent border-none outline-none placeholder:text-tertiary"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 h-12 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-all shrink-0"
            >
              Track
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted text-center mt-3">
            Supports all major couriers: BlueDart, Delhivery, DTDC, XpressBees
            & more
          </p>
        </motion.form>
      </PageHero>

      {/* ━━━ TRACKING RESULTS ━━━ */}
      <section className="py-16 sm:py-24 bg-white">
        <Container maxWidth="lg">
          <AnimatePresence mode="wait">
            {showResults ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: animationConfig.ease.out }}
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
                    <p className="text-sm text-muted">Fetching latest tracking updates…</p>
                  </div>
                ) : error ? (
                  <div className="max-w-md mx-auto text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 text-red-400 mb-5">
                      <Package className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Shipment not found</h3>
                    <p className="text-sm text-muted leading-relaxed">{error}</p>
                    <p className="text-xs text-tertiary mt-3">
                      Double-check the AWB number or Order ID and try again.
                    </p>
                  </div>
                ) : result ? (
                  <>
                    {/* Shipment Info Card */}
                    <div className="bg-background border border-border-light rounded-2xl p-6 sm:p-8 mb-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <p className="text-xs text-muted uppercase tracking-wide mb-1">
                            Tracking Number
                          </p>
                          <p className="text-lg font-bold text-foreground font-mono">
                            {result.awb || result.orderId || awbNumber}
                          </p>
                        </div>
                        {(() => {
                          const label = prettyStatus(result.status);
                          const delivered = isDelivered(result.status);
                          return (
                            <div
                              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${
                                delivered
                                  ? "bg-emerald-50 border-emerald-200"
                                  : "bg-violet-50 border-violet-200"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  delivered ? "bg-emerald-500" : "bg-violet-500"
                                }`}
                              />
                              <span
                                className={`text-xs font-semibold ${
                                  delivered ? "text-emerald-700" : "text-violet-700"
                                }`}
                              >
                                {label}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: "Courier", value: result.courier },
                          { label: "Origin", value: result.origin },
                          { label: "Destination", value: result.destination },
                          {
                            label: "Weight",
                            value:
                              result.weightKg != null ? `${result.weightKg.toFixed(2)} kg` : null,
                          },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className="text-xs text-muted mb-1.5">{item.label}</p>
                            <p className="text-sm font-medium text-foreground">
                              {item.value || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-background border border-border-light rounded-2xl p-6 sm:p-8">
                      <h3 className="text-lg font-semibold text-foreground mb-6">
                        Shipment Timeline
                      </h3>

                      {result.events && result.events.length > 0 ? (
                        <div className="space-y-0">
                          {result.events.map((ev, i) => (
                            <div key={i} className="relative flex gap-4">
                              {i < (result.events?.length ?? 0) - 1 && (
                                <div className="absolute left-[15px] top-[36px] bottom-0 w-[2px] bg-gradient-to-b from-primary/20 to-primary/5" />
                              )}

                              <div
                                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                  i === 0
                                    ? isDelivered(ev.statusText)
                                      ? "bg-emerald-500 text-white"
                                      : "bg-primary text-white"
                                    : "bg-primary-bg text-primary"
                                }`}
                              >
                                {statusIcon(ev.statusText)}
                              </div>

                              <div className="flex-1 pb-6">
                                <div className="flex items-baseline justify-between gap-3">
                                  <h4
                                    className={`text-sm font-semibold ${
                                      i === 0 ? "text-foreground" : "text-foreground"
                                    }`}
                                  >
                                    {prettyStatus(ev.statusText) === "—"
                                      ? prettyStatus(ev.statusCode)
                                      : prettyStatus(ev.statusText)}
                                  </h4>
                                  <span className="text-xs text-muted shrink-0">
                                    {formatTime(ev.timestamp)}
                                  </span>
                                </div>
                                {(ev.location || ev.remarks) && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <MapPin className="w-3 h-3 text-muted shrink-0" />
                                    <span className="text-xs text-muted">
                                      {[ev.location, ev.remarks].filter(Boolean).join(" — ")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted">
                          Your shipment is booked. Tracking updates will appear here as the courier
                          scans the package.
                        </p>
                      )}
                    </div>
                  </>
                ) : null}
              </motion.div>
            ) : (
              /* Empty state */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12 sm:py-16"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary-bg/50 text-primary/30 mb-6">
                  <Package className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Enter a tracking number
                </h3>
                <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                  Type your AWB number or order ID in the search box above to
                  see real-time shipment updates from any courier partner.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </section>

      {/* ━━━ FAQ ━━━ */}
      <section className="py-16 sm:py-24 bg-background">
        <Container maxWidth="lg">
          <motion.div {...scrollFadeUp} className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-bg rounded-full mb-4">
              FAQs
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Common{" "}
              <span className="text-gradient-primary">tracking questions</span>
            </h2>
          </motion.div>

          <div className="space-y-3 max-w-2xl mx-auto">
            {faqs.map((faq, i) => (
              <motion.div key={faq.question} {...staggeredChild(i)}>
                <div className="bg-white border border-border-light rounded-xl overflow-hidden">
                  <button
                    className="flex items-center justify-between w-full px-5 sm:px-6 py-4 text-left"
                    onClick={() =>
                      setOpenFaq(openFaq === i ? null : i)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4.5 h-4.5 text-primary shrink-0" />
                      <span className="text-sm font-semibold text-foreground">
                        {faq.question}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted shrink-0 ml-4 transition-transform ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 sm:px-6 pb-4 pl-12 sm:pl-[3.25rem]">
                          <p className="text-sm text-muted leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
            Want to track all
            <br />
            shipments in one place?
          </>
        }
        subtitle="Sign up for the Searchcraft dashboard and get a unified tracking view for every order, every courier."
        primaryCta={{ label: "Start Free Trial", href: "/signup" }}
        secondaryCta={{ label: "Explore Platform", href: "/platform" }}
      />
    </>
  );
}
