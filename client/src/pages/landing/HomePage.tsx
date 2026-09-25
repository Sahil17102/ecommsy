import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Sparkles, Truck, Package, Zap, ShieldCheck, BarChart3, Headphones } from "lucide-react";
import { Link } from "react-router-dom";
import { Container } from "@/components/common";
import { TestimonialsSection } from "./TestimonialsSection";

/* ─────────────────────────────────────────────────────────────
   Searchcraft landing — illustrated playful direction.
   Cream background, sticker cards with thick borders + light
   rotations, hand-drawn-style SVG illustrations, big rounded
   typography. Orange dominant, purple accents.
   ───────────────────────────────────────────────────────────── */

const CREAM = "#FFF7EC";
const INK = "#1B1410";
const ORANGE = "#EA580C";
const PURPLE = "#7C3AED";

const STATS = [
  { value: "29,000+", label: "Pincodes covered", rotate: -1.5, tint: "bg-purple-100" },
  { value: "25+", label: "Courier partners", rotate: 1.2, tint: "bg-purple-100" },
  { value: "₹40 lakh", label: "Saved monthly by sellers", rotate: -0.8, tint: "bg-violet-100" },
  { value: "5 min", label: "Average pickup booking", rotate: 1.5, tint: "bg-pink-100" },
];

const SOLUTIONS = [
  {
    icon: Package,
    title: "Bulk orders, one click",
    body: "Upload a sheet, push a button. Searchcraft queues the labels, prints the manifests, and books the pickup before your tea cools.",
    accent: ORANGE,
    rotate: -1,
  },
  {
    icon: Zap,
    title: "Smart courier picking",
    body: "Cheapest, fastest, or most reliable — set the rule once and we route every shipment to the courier that fits.",
    accent: PURPLE,
    rotate: 0.8,
  },
  {
    icon: ShieldCheck,
    title: "COD that actually pays",
    body: "Auto-reconciled remittances, weekly payouts, zero spreadsheet wars. The money lands; you ship the next batch.",
    accent: ORANGE,
    rotate: -0.5,
  },
  {
    icon: BarChart3,
    title: "Dashboards you'll open",
    body: "NDR, RTO, on-time delivery — laid out so you spot the problem courier before your customers do.",
    accent: PURPLE,
    rotate: 1.1,
  },
  {
    icon: Truck,
    title: "Pickup, every day",
    body: "Schedule once, forget forever. We coordinate with the courier; you just hand over the box.",
    accent: ORANGE,
    rotate: -1.3,
  },
  {
    icon: Headphones,
    title: "Humans on chat",
    body: "When something breaks, you talk to someone who knows the courier's escalation matrix. No bot mazes.",
    accent: PURPLE,
    rotate: 0.6,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Sign up in 2 minutes",
    body: "Drop your email, verify with an OTP. No demo calls, no sales gauntlet.",
  },
  {
    n: "02",
    title: "Plug in your store",
    body: "Shopify, WooCommerce, Amazon, manual — orders sync in seconds.",
  },
  {
    n: "03",
    title: "Ship and chill",
    body: "We pick the courier, print the label, book the pickup. You do the brand work.",
  },
];

const FAQS = [
  {
    q: "Do I need to sign a contract or pay a setup fee?",
    a: "No contract. No setup fee. You sign up, ship a few orders, and pay only for shipments that actually go out. Cancel anytime.",
  },
  {
    q: "Which couriers do you support?",
    a: "Delhivery, Bluedart, Ekart, XpressBees, DTDC, Shadowfax, Ecom Express, India Post, and a growing list. If a courier serves the pincode, Searchcraft can usually book it.",
  },
  {
    q: "How do you make money if shipping rates are the same?",
    a: "Our rates are typically 15–40% below MRP because we move volume across thousands of sellers. We earn a small margin on each shipment — you pay less than retail, we pay our team.",
  },
  {
    q: "What happens to my COD money?",
    a: "Couriers remit COD to us, we reconcile against your orders, and credit your wallet on a weekly cycle. You see every paisa, every step.",
  },
  {
    q: "Is there a mobile app?",
    a: "The dashboard is mobile-friendly and works in your browser. A dedicated app is on the roadmap for Q3.",
  },
];

/* ─── Inline SVG illustrations (hand-drawn vibe) ─── */

function HeroIllustration() {
  return (
    <svg viewBox="0 0 460 380" className="w-full h-auto" aria-hidden>
      {/* Sky polka pattern */}
      <defs>
        <pattern id="hero-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill={INK} opacity="0.12" />
        </pattern>
        <pattern id="hero-stripes" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="10" stroke={INK} strokeWidth="2" opacity="0.85" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="460" height="380" fill="url(#hero-dots)" />

      {/* Sun */}
      <g>
        <circle cx="370" cy="60" r="28" fill={ORANGE} stroke={INK} strokeWidth="3" />
        <path
          d="M370 22 v-12 M414 60 h12 M403 27 l8 -8 M337 27 l-8 -8 M326 60 h-12 M403 93 l8 8 M337 93 l-8 8"
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* Cloud */}
      <g transform="translate(70 70)">
        <path
          d="M0 16 Q 0 0 18 0 Q 26 -10 40 -4 Q 54 -10 60 4 Q 78 4 78 18 Q 78 30 64 30 H 12 Q 0 30 0 16 Z"
          fill="#FFFFFF"
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>

      {/* Ground */}
      <path d="M20 322 Q 230 308 440 322" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Speed lines behind truck */}
      <g stroke={INK} strokeWidth="3" strokeLinecap="round">
        <line x1="30" y1="232" x2="68" y2="232" />
        <line x1="18" y1="252" x2="58" y2="252" />
        <line x1="34" y1="272" x2="62" y2="272" />
      </g>

      {/* Truck cab */}
      <g>
        <rect x="280" y="230" width="100" height="74" rx="10" fill={PURPLE} stroke={INK} strokeWidth="3" />
        {/* Cab window */}
        <rect x="294" y="244" width="44" height="30" rx="4" fill="#FFFFFF" stroke={INK} strokeWidth="3" />
        {/* Headlight */}
        <circle cx="372" cy="288" r="5" fill={ORANGE} stroke={INK} strokeWidth="2" />
      </g>

      {/* Truck body */}
      <g>
        <rect x="90" y="200" width="190" height="104" rx="10" fill="#FFFFFF" stroke={INK} strokeWidth="3" />
        {/* Door split */}
        <line x1="185" y1="206" x2="185" y2="298" stroke={INK} strokeWidth="2.5" />
        {/* Handles */}
        <circle cx="178" cy="252" r="3" fill={INK} />
        <circle cx="192" cy="252" r="3" fill={INK} />
        {/* Door panels (decorative) */}
        <rect x="104" y="216" width="68" height="38" rx="3" fill="none" stroke={INK} strokeWidth="2" />
        <rect x="104" y="262" width="68" height="30" rx="3" fill="none" stroke={INK} strokeWidth="2" />
        <rect x="198" y="216" width="68" height="38" rx="3" fill="none" stroke={INK} strokeWidth="2" />
        <rect x="198" y="262" width="68" height="30" rx="3" fill="none" stroke={INK} strokeWidth="2" />
      </g>

      {/* Wheels */}
      <g>
        <circle cx="140" cy="320" r="22" fill={INK} />
        <circle cx="140" cy="320" r="10" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
        <circle cx="240" cy="320" r="22" fill={INK} />
        <circle cx="240" cy="320" r="10" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
        <circle cx="340" cy="320" r="22" fill={INK} />
        <circle cx="340" cy="320" r="10" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
      </g>

      {/* Stacked parcels above truck — sitting on the roof */}
      <g transform="translate(118 130) rotate(-4)">
        <rect x="0" y="0" width="64" height="62" rx="6" fill={ORANGE} stroke={INK} strokeWidth="3" />
        <rect x="0" y="20" width="64" height="10" fill="url(#hero-stripes)" />
        <line x1="32" y1="0" x2="32" y2="62" stroke={INK} strokeWidth="3" />
      </g>
      <g transform="translate(196 154) rotate(5)">
        <rect x="0" y="0" width="48" height="46" rx="5" fill="#FFFFFF" stroke={INK} strokeWidth="3" />
        <line x1="0" y1="22" x2="48" y2="22" stroke={INK} strokeWidth="2.5" />
        <line x1="24" y1="0" x2="24" y2="46" stroke={INK} strokeWidth="2.5" />
      </g>

      {/* Heart sticker */}
      <g transform="translate(244 96) rotate(8)">
        <path
          d="M14 24 C 0 12 0 0 7 0 C 11 0 14 3 14 7 C 14 3 17 0 21 0 C 28 0 28 12 14 24 Z"
          fill={ORANGE}
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function StepIllustration({ kind }: { kind: "signup" | "connect" | "ship" }) {
  if (kind === "signup") {
    return (
      <svg viewBox="0 0 120 120" className="w-20 h-20" aria-hidden>
        <rect x="20" y="25" width="80" height="60" rx="8" fill="#FFFFFF" stroke={INK} strokeWidth="3" />
        <line x1="32" y1="45" x2="80" y2="45" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="58" x2="68" y2="58" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <rect x="32" y="68" width="32" height="10" rx="3" fill={ORANGE} stroke={INK} strokeWidth="2.5" />
        <circle cx="92" cy="33" r="10" fill={PURPLE} stroke={INK} strokeWidth="2.5" />
        <path d="M88 33 l3 4 l6 -7" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "connect") {
    return (
      <svg viewBox="0 0 120 120" className="w-20 h-20" aria-hidden>
        <circle cx="35" cy="60" r="20" fill={ORANGE} stroke={INK} strokeWidth="3" />
        <circle cx="85" cy="60" r="20" fill={PURPLE} stroke={INK} strokeWidth="3" />
        <path d="M55 60 h10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M28 60 l4 -4 M28 60 l4 4" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M92 60 l-4 -4 M92 60 l-4 4" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 120" className="w-20 h-20" aria-hidden>
      <rect x="25" y="40" width="55" height="45" rx="6" fill={ORANGE} stroke={INK} strokeWidth="3" />
      <line x1="25" y1="60" x2="80" y2="60" stroke={INK} strokeWidth="3" />
      <line x1="52" y1="40" x2="52" y2="85" stroke={INK} strokeWidth="3" />
      <path d="M85 85 l8 -22 l-3 -1 l3 -8 l10 8 l-3 1 l-3 22 z" fill={PURPLE} stroke={INK} strokeWidth="2.5" />
      <path d="M30 95 h60" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" />
    </svg>
  );
}

function SquigglyUnderline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M2 7 Q 25 1 50 7 T 100 7 T 150 7 T 198 7" stroke={ORANGE} strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Reusable sticker card ─── */

function Sticker({
  children,
  className = "",
  rotate = 0,
  tint = "bg-white",
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  tint?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0, rotate }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ rotate: 0, y: -4 }}
      className={`relative border-[3px] rounded-2xl shadow-[6px_6px_0_0_rgba(27,20,16,1)] ${tint} ${className}`}
      style={{ borderColor: INK }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */

export function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div style={{ backgroundColor: CREAM, color: INK }}>
      {/* ───────── HERO ───────── */}
      <section className="relative pt-24 lg:pt-28 pb-16 lg:pb-24 overflow-hidden">
        {/* Background polka dots */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${INK}22 1.5px, transparent 1.5px)`,
            backgroundSize: "28px 28px",
          }}
        />
        <Container className="relative">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-[2.5px] mb-6"
                style={{ borderColor: INK, backgroundColor: "#FFFFFF" }}
              >
                <Sparkles className="w-4 h-4" style={{ color: ORANGE }} />
                <span className="text-sm font-semibold">Shipping, the way Indian sellers actually ship</span>
              </motion.div>

              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.02] tracking-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
              >
                Hello, fast<br />
                shipping for{" "}
                <span className="relative inline-block" style={{ color: ORANGE }}>
                  busy sellers
                  <SquigglyUnderline className="absolute left-0 -bottom-2 w-full h-3" />
                </span>
                .
              </h1>

              <p className="mt-6 text-lg sm:text-xl max-w-xl" style={{ color: "#3A2E26" }}>
                One dashboard for every courier in India. We do the comparing,
                booking, tracking and remittance. You do the brand.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-white border-[3px] shadow-[6px_6px_0_0_rgba(27,20,16,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(27,20,16,1)] transition-all"
                  style={{ backgroundColor: ORANGE, borderColor: INK }}
                >
                  Get started — it's free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/platform"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold border-[3px] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(27,20,16,1)] transition-all"
                  style={{ borderColor: INK, color: INK, backgroundColor: "#FFFFFF" }}
                >
                  Talk to us
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-3 text-sm font-semibold" style={{ color: "#3A2E26" }}>
                <div className="flex -space-x-2">
                  {[ORANGE, PURPLE, "#F59E0B", "#EC4899"].map((c, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-[2.5px]"
                      style={{ backgroundColor: c, borderColor: INK }}
                    />
                  ))}
                </div>
                <span>Trusted by 1,200+ Indian D2C brands</span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <Sticker className="p-8" rotate={1.5}>
                <HeroIllustration />
              </Sticker>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* ───────── BRAND STRIP (marquee) ───────── */}
      <section
        className="border-y-[3px] py-5 overflow-hidden"
        style={{ borderColor: INK, backgroundColor: "#FFFFFF" }}
      >
        <div className="flex items-center gap-6">
          <span
            className="shrink-0 pl-4 sm:pl-8 text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: "#7A6358" }}
          >
            Plays nicely with
          </span>
          <div className="relative flex-1 overflow-hidden">
            <motion.div
              className="flex items-center gap-10 whitespace-nowrap will-change-transform"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 28, ease: "linear", repeat: Infinity }}
              style={{ width: "max-content" }}
            >
              {Array.from({ length: 2 }).flatMap((_, copy) =>
                [
                  "Shopify",
                  "WooCommerce",
                  "Amazon",
                  "Flipkart",
                  "Meesho",
                  "Delhivery",
                  "Bluedart",
                  "XpressBees",
                  "DTDC",
                  "Ekart",
                  "Shadowfax",
                  "Ecom Express",
                ].map((name, idx) => (
                  <span
                    key={`${copy}-${name}-${idx}`}
                    className="flex items-center gap-10 text-lg font-black"
                    style={{ color: "#3A2E26" }}
                  >
                    {name}
                    <span style={{ color: ORANGE }}>✦</span>
                  </span>
                )),
              )}
            </motion.div>
            {/* Edge fades */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-12"
              style={{ background: "linear-gradient(to right, #FFFFFF, transparent)" }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-12"
              style={{ background: "linear-gradient(to left, #FFFFFF, transparent)" }}
            />
          </div>
        </div>
      </section>

      {/* ───────── STATS ───────── */}
      <section className="py-20">
        <Container>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <Sticker key={s.label} rotate={s.rotate} tint={s.tint} className="p-6 text-center">
                <div className="text-4xl sm:text-5xl font-black" style={{ color: INK }}>
                  {s.value}
                </div>
                <div className="mt-2 text-sm font-semibold" style={{ color: "#3A2E26" }}>
                  {s.label}
                </div>
              </Sticker>
            ))}
          </div>
        </Container>
      </section>

      {/* ───────── SOLUTIONS ───────── */}
      <section className="py-20" style={{ backgroundColor: "#FFFFFF" }}>
        <Container>
          <div className="max-w-2xl">
            <div className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: PURPLE }}>
              What you get
            </div>
            <h2
              className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
            >
              Everything you'd build yourself, <br />
              <span style={{ color: ORANGE }}>only better, only ready.</span>
            </h2>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SOLUTIONS.map((s) => (
              <Sticker key={s.title} rotate={s.rotate} className="p-7">
                <div
                  className="w-14 h-14 rounded-xl border-[3px] flex items-center justify-center mb-5"
                  style={{ backgroundColor: s.accent, borderColor: INK }}
                >
                  <s.icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black mb-2" style={{ color: INK }}>
                  {s.title}
                </h3>
                <p className="text-base leading-relaxed" style={{ color: "#3A2E26" }}>
                  {s.body}
                </p>
              </Sticker>
            ))}
          </div>
        </Container>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section className="py-20">
        <Container>
          <div className="max-w-2xl">
            <div className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: ORANGE }}>
              How it works
            </div>
            <h2
              className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
            >
              From signup to first<br />
              <span style={{ color: PURPLE }}>shipment in 10 minutes.</span>
            </h2>
          </div>

          <div className="mt-12 grid lg:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <Sticker
                key={step.n}
                rotate={i === 1 ? 0.8 : i === 0 ? -1 : 0.6}
                className="p-8"
                tint="bg-white"
              >
                <div className="flex items-start justify-between mb-4">
                  <StepIllustration kind={i === 0 ? "signup" : i === 1 ? "connect" : "ship"} />
                  <span
                    className="text-5xl font-black opacity-15"
                    style={{ color: INK }}
                  >
                    {step.n}
                  </span>
                </div>
                <h3 className="text-2xl font-black mb-2" style={{ color: INK }}>
                  {step.title}
                </h3>
                <p className="text-base leading-relaxed" style={{ color: "#3A2E26" }}>
                  {step.body}
                </p>
              </Sticker>
            ))}
          </div>
        </Container>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="py-20">
        <Container>
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: ORANGE }}>
                Common questions
              </div>
              <h2
                className="text-4xl sm:text-5xl font-black leading-[1.05] tracking-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
              >
                Things sellers ask<br />
                <span style={{ color: PURPLE }}>before they sign up.</span>
              </h2>
              <p className="mt-4 text-base" style={{ color: "#3A2E26" }}>
                Don't see yours? Email{" "}
                <a
                  href="mailto:cs@searchcraftdigital.com"
                  className="font-bold underline decoration-2 underline-offset-4"
                  style={{ color: ORANGE }}
                >
                  cs@searchcraftdigital.com
                </a>{" "}
                — we read every one.
              </p>
            </div>

            <div className="space-y-4">
              {FAQS.map((faq, i) => {
                const open = openFaq === i;
                return (
                  <Sticker key={faq.q} rotate={0} tint="bg-white" className="p-0 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                    >
                      <span className="text-lg font-black" style={{ color: INK }}>
                        {faq.q}
                      </span>
                      <motion.span
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="shrink-0 w-9 h-9 rounded-full border-[2.5px] flex items-center justify-center"
                        style={{ borderColor: INK, backgroundColor: open ? ORANGE : "#FFFFFF" }}
                      >
                        <ChevronDown
                          className="w-5 h-5"
                          style={{ color: open ? "#FFFFFF" : INK }}
                          strokeWidth={3}
                        />
                      </motion.span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-base leading-relaxed" style={{ color: "#3A2E26" }}>
                        {faq.a}
                      </p>
                    </motion.div>
                  </Sticker>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <section className="py-20">
        <Container>
          <Sticker
            tint=""
            className="p-10 sm:p-14 text-center relative overflow-hidden"
            rotate={-0.5}
          >
            <div
              className="absolute inset-0 -z-10"
              style={{ backgroundColor: ORANGE }}
            />
            <div
              className="absolute inset-0 opacity-25 -z-10"
              style={{
                backgroundImage: `radial-gradient(${INK}55 2px, transparent 2px)`,
                backgroundSize: "32px 32px",
              }}
            />
            <h2
              className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
            >
              Ready to ship<br />
              like the big brands do?
            </h2>
            <p className="mt-5 text-lg sm:text-xl text-white/90 max-w-xl mx-auto">
              Sign up, plug in your store, and watch your first label print itself. No call required.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-black border-[3px] shadow-[6px_6px_0_0_rgba(27,20,16,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(27,20,16,1)] transition-all"
                style={{ backgroundColor: "#FFFFFF", borderColor: INK, color: INK }}
              >
                Start free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/resources/rate-calculator"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-black border-[3px] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(27,20,16,1)] transition-all text-white"
                style={{ backgroundColor: PURPLE, borderColor: INK }}
              >
                See rates
              </Link>
            </div>
          </Sticker>
        </Container>
      </section>

      {/* ───────── TESTIMONIALS (just above footer) ───────── */}
      <TestimonialsSection />
    </div>
  );
}
