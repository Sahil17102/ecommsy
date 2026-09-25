import { motion } from "framer-motion";
import { Container } from "@/components/common";

/* ─────────────────────────────────────────────────────────────
   Testimonials — sticker theme, sits just above the footer on the
   home page. Cream/white light background, thick-border sticker
   cards with hard shadows. One featured card carries a ribbon.
   ───────────────────────────────────────────────────────────── */

const INK = "#1B1410";
const ORANGE = "#EA580C";
const PURPLE = "#7C3AED";

type Review = {
  quote: string;
  highlight: string;
  quoteEnd: string;
  name: string;
  role: string;
  initials: string;
  plan: string;
  tint: string;
  badge: string;
  badgeColor: string;
  featured?: boolean;
};

const REVIEWS: Review[] = [
  {
    quote: "We were juggling three courier panels every morning — it was exhausting. Searchcraft pulled it all into one screen and the team got their afternoons back. We saved ",
    highlight: "₹38,000 in the first month",
    quoteEnd: " on shipping alone.",
    name: "Riya Kapoor",
    role: "Founder, Aroma Living · Surat",
    initials: "RK",
    plan: "Growth",
    tint: "bg-purple-50",
    badge: "Growth",
    badgeColor: ORANGE,
  },
  {
    quote: "The dashboards are the real win. I can see profit per order, RTO risk, and the courier quietly dropping deliveries — all in one place. ",
    highlight: "No other panel shows you this.",
    quoteEnd: " It feels like having an ops head on the team.",
    name: "Vivek Patel",
    role: "CEO, Urban Spice Co. · Ahmedabad",
    initials: "VP",
    plan: "Enterprise",
    tint: "bg-purple-50",
    badge: "Enterprise",
    badgeColor: PURPLE,
    featured: true,
  },
  {
    quote: "Other aggregators felt like a courier website with a login. Searchcraft feels like ",
    highlight: "actual software built for my business.",
    quoteEnd: " The courier it picks has been the right call almost every time.",
    name: "Sneha Mehta",
    role: "Founder, Glow Naturals · Mumbai",
    initials: "SM",
    plan: "Pro",
    tint: "bg-violet-50",
    badge: "Pro",
    badgeColor: ORANGE,
  },
  {
    quote: "Our RTO rate fell from ",
    highlight: "18% to 9%",
    quoteEnd: " in six weeks once we leaned on the COD risk scoring. That swing alone paid for the platform many times over.",
    name: "Aditya Joshi",
    role: "D2C Brand Owner · Pune",
    initials: "AJ",
    plan: "Growth",
    tint: "bg-purple-50",
    badge: "Growth",
    badgeColor: ORANGE,
  },
  {
    quote: "Signed up, connected Shopify in five minutes, and shipped our first order through Searchcraft the same afternoon. ",
    highlight: "I didn't expect it to be this easy.",
    quoteEnd: "",
    name: "Neha Kulkarni",
    role: "Shopify Seller · Bengaluru",
    initials: "NK",
    plan: "Starter",
    tint: "bg-purple-50",
    badge: "Starter",
    badgeColor: PURPLE,
  },
  {
    quote: "We sell on Meesho, Flipkart and our own store. Searchcraft tracks every order in one dashboard — ",
    highlight: "no more switching between four panels.",
    quoteEnd: " This is exactly what we needed.",
    name: "Kiran Shah",
    role: "Multi-channel Seller · Surat",
    initials: "KS",
    plan: "Pro",
    tint: "bg-violet-50",
    badge: "Pro",
    badgeColor: ORANGE,
  },
];

const TRUST_STATS = [
  { value: "4.9", suffix: "/5", label: "Average seller rating", stars: true },
  { value: "1,200", suffix: "+", label: "Active sellers" },
  { value: "25", suffix: "+", label: "Courier partners" },
  { value: "30", suffix: "%", label: "Avg. cost saved" },
  { value: "99.5", suffix: "%", label: "Platform uptime" },
];

function Stars({ size = 16 }: { size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={ORANGE} aria-hidden>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function SquigglyUnderline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" className={className} aria-hidden>
      <path
        d="M2 7 Q 25 1 50 7 T 100 7 T 150 7 T 198 7"
        stroke={ORANGE}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, rotate: 0 }}
      className={`relative rounded-2xl p-6 flex flex-col gap-4 shadow-[6px_6px_0_0_rgba(27,20,16,1)] ${review.tint}`}
      style={{ border: review.featured ? `3px solid ${ORANGE}` : `3px solid ${INK}` }}
    >
      {review.featured && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[11px] font-black px-4 py-1 rounded-full whitespace-nowrap border-[2.5px]"
          style={{ background: ORANGE, borderColor: INK }}
        >
          Most loved review
        </div>
      )}

      <Stars />

      <p className="text-base leading-relaxed flex-1" style={{ color: "#3A2E26" }}>
        {review.quote}
        <strong style={{ color: INK }}>{review.highlight}</strong>
        {review.quoteEnd}
      </p>

      <div className="flex items-center gap-3 pt-3" style={{ borderTop: `2px dashed ${INK}22`, marginTop: "auto" }}>
        <div
          className="w-11 h-11 rounded-full border-[2.5px] flex items-center justify-center font-black text-white shrink-0"
          style={{ background: PURPLE, borderColor: INK }}
        >
          {review.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black truncate" style={{ color: INK }}>
            {review.name}
          </div>
          <div className="text-xs truncate" style={{ color: "#7A6358" }}>
            {review.role}
          </div>
        </div>
        <span
          className="shrink-0 text-[11px] font-black px-2.5 py-1 rounded-md border-[2px]"
          style={{ color: review.badgeColor, borderColor: INK, background: "#FFFFFF" }}
        >
          {review.badge}
        </span>
      </div>
    </motion.div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="py-20" style={{ backgroundColor: "#FFF7EC", color: INK }}>
      <Container>
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: PURPLE }}>
            What sellers say
          </div>
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            Don't take{" "}
            <span className="relative inline-block" style={{ color: ORANGE }}>
              our word
              <SquigglyUnderline className="absolute left-0 -bottom-2 w-full h-3" />
            </span>{" "}
            for it.
          </h2>
          <p className="mt-6 text-lg" style={{ color: "#3A2E26" }}>
            1,200+ Indian D2C brands trust Searchcraft to ship smarter, cut costs, and grow faster.
          </p>
        </div>

        {/* Reviews grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {REVIEWS.map((r, i) => (
            <ReviewCard key={r.name} review={r} index={i} />
          ))}
        </div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 max-w-6xl mx-auto rounded-2xl border-[3px] bg-white shadow-[6px_6px_0_0_rgba(27,20,16,1)] flex flex-wrap items-center justify-center gap-y-6 py-8 px-6"
          style={{ borderColor: INK }}
        >
          {TRUST_STATS.map((stat, i) => (
            <div key={stat.label} className="flex items-center">
              <div className="text-center px-6 sm:px-10">
                {stat.stars && (
                  <div className="flex justify-center mb-1">
                    <Stars size={13} />
                  </div>
                )}
                <div
                  className="text-3xl sm:text-4xl font-black leading-tight"
                  style={{ color: INK, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
                >
                  {stat.value}
                  <span style={{ color: ORANGE }}>{stat.suffix}</span>
                </div>
                <div className="text-xs mt-1.5 font-semibold" style={{ color: "#7A6358" }}>
                  {stat.label}
                </div>
              </div>
              {i < TRUST_STATS.length - 1 && (
                <div className="hidden sm:block self-stretch w-[2px]" style={{ background: `${INK}18` }} aria-hidden />
              )}
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
