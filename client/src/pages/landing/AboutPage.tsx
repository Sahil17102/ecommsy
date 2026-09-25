import { motion } from "framer-motion";
import { Clock, Zap, Users, Sparkles, Heart, ShieldCheck, Check } from "lucide-react";
import {
  CompanyHero,
  StatBand,
  CtaBand,
  Kicker,
  Heading,
  IconSquare,
  BtnPrimary,
  BtnGhostDark,
  reveal,
  revealDelay,
  NAVY,
  ORANGE,
  SLATE,
  HEADING_FONT,
  GRADIENTS,
  type GradientKey,
} from "./companyUi";

/* ═══════════════════════════════════════════════════════════ DATA */

const stats = [
  { value: "2019", suffix: ".", label: "Year founded" },
  { value: "1,200", suffix: "+", label: "Active sellers" },
  { value: "25", suffix: "+", label: "Courier partners" },
  { value: "29,000", suffix: "+", label: "Pincodes covered" },
];

const timeline: { icon: typeof Clock; grad: GradientKey; year: string; body: string }[] = [
  {
    icon: Clock,
    grad: "blue",
    year: "2019 — Founded in Delhi",
    body: "Started as a simple courier rate comparison tool for Indian D2C brands.",
  },
  {
    icon: Zap,
    grad: "purple",
    year: "2022 — One dashboard, every courier",
    body: "Added bulk shipping, COD remittance, and live NDR/RTO dashboards.",
  },
  {
    icon: Users,
    grad: "green",
    year: "Today — 1,200+ sellers, 25+ couriers",
    body: "₹40 lakh saved every month by sellers shipping smarter with Box and Beyond.",
  },
];

const values: { icon: typeof Clock; grad: GradientKey; title: string; body: string }[] = [
  {
    icon: Sparkles,
    grad: "blue",
    title: "Simplicity first",
    body: "Shipping software shouldn't need a manual. Every screen is built so a seller can do it themselves, on the first try.",
  },
  {
    icon: Heart,
    grad: "purple",
    title: "Seller obsessed",
    body: "We build for the seller, never the courier. Every feature exists to save time, cut costs, and grow profit — nothing else.",
  },
  {
    icon: ShieldCheck,
    grad: "green",
    title: "Transparent always",
    body: "No hidden charges, no opaque courier commissions, no confusing billing. One wallet, one invoice, full clarity.",
  },
];

const beliefs = [
  "The same shipping rates for a first-time seller as a large enterprise",
  "Real profit visibility — not just the shipping cost",
  "NDR and RTO caught early, before they become a loss",
  "One dashboard for every marketplace and every courier",
];

const team: { initials: string; name: string; role: string; note: string; grad: GradientKey }[] = [
  { initials: "AS", name: "Arjun Sharma", role: "Founder & CEO", note: "Vision, product strategy & partnerships", grad: "blue" },
  { initials: "RV", name: "Rohan Verma", role: "CTO", note: "Platform architecture & automation engine", grad: "purple" },
  { initials: "PN", name: "Priya Nair", role: "Head of Product", note: "UX, roadmap & seller experience", grad: "green" },
  { initials: "KP", name: "Karan Patel", role: "Head of Growth", note: "Onboarding, marketing & partnerships", grad: "purple" },
];

/* ═══════════════════════════════════════════════════════════ PAGE */

export function AboutPage() {
  return (
    <div style={{ background: "#fff" }}>
      <CompanyHero
        eyebrow="Company"
        title={
          <>
            Built in Delhi.
            <br />
            Built for India.
          </>
        }
        subtitle="Box and Beyond was founded on one belief — Indian ecommerce businesses deserve smarter shipping tools, not just cheaper courier rates."
      />

      <StatBand stats={stats} />

      {/* OUR STORY */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div {...reveal}>
            <Kicker>Our story</Kicker>
            <Heading>
              We were sellers too.
              <br />
              We felt the same pain.
            </Heading>
            <p className="mt-5 text-[15px] leading-7" style={{ color: SLATE }}>
              Our founders were running an ecommerce business, and every day started with the same
              questions — which courier is cheapest today? Which delivers best in this zone? Why did
              our RTO jump this month?
            </p>
            <p className="mt-4 text-[15px] leading-7" style={{ color: SLATE }}>
              There was no single platform that answered all of it. So we built one. Box and Beyond started
              as a rate comparison tool and grew into a full shipping operating system — comparison,
              booking, tracking, COD remittance, and business intelligence in one place.
            </p>
          </motion.div>

          <motion.div
            {...reveal}
            className="rounded-2xl p-6 sm:p-8 flex flex-col gap-5"
            style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}
          >
            {timeline.map((t) => (
              <div key={t.year} className="flex gap-4 items-start">
                <IconSquare gradient={t.grad} size={40}>
                  <t.icon className="w-[18px] h-[18px]" strokeWidth={2.4} />
                </IconSquare>
                <div>
                  <div className="text-[13px] font-bold mb-0.5" style={{ color: NAVY }}>
                    {t.year}
                  </div>
                  <div className="text-[13px] leading-relaxed" style={{ color: SLATE }}>
                    {t.body}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* MISSION */}
      <section
        className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20"
        style={{ background: "#F8FAFC", borderTop: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB" }}
      >
        <motion.div {...reveal} className="max-w-2xl mx-auto text-center mb-12">
          <Kicker>Our mission</Kicker>
          <Heading className="!leading-[1.2]">
            Make Indian ecommerce
            <br />
            businesses unstoppable.
          </Heading>
          <p className="mt-4 text-[15px] leading-7" style={{ color: SLATE }}>
            Every Indian seller — from a first-time D2C founder to a large enterprise — deserves the
            same intelligence, automation, and cost savings the biggest players have always had.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              {...revealDelay(i)}
              whileHover={{ y: -5 }}
              className="rounded-2xl bg-white p-6 transition-shadow hover:shadow-lg hover:shadow-slate-200/60"
              style={{ border: "1px solid #E5E7EB" }}
            >
              <IconSquare gradient={v.grad} size={42} className="mb-4">
                <v.icon className="w-5 h-5" strokeWidth={2.2} />
              </IconSquare>
              <div className="text-[15px] font-extrabold mb-2" style={{ color: NAVY, fontFamily: HEADING_FONT }}>
                {v.title}
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: SLATE }}>
                {v.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHAT WE BELIEVE */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div {...reveal}>
            <Kicker>What we believe</Kicker>
            <Heading>
              Logistics shouldn't be
              <br />a competitive disadvantage.
            </Heading>
            <p className="mt-5 text-[15px] leading-7" style={{ color: SLATE }}>
              A small brand shouldn't pay more per shipment than a large enterprise. Better data
              leads to better decisions — so we surface the right information at the right moment, on
              every single order.
            </p>
          </motion.div>

          <div className="flex flex-col gap-3">
            {beliefs.map((b, i) => (
              <motion.div
                key={b}
                {...revealDelay(i, 0.08)}
                className="flex items-center gap-3 rounded-xl px-5 py-4"
                style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "#FFF4EA" }}
                >
                  <Check className="w-4 h-4" style={{ color: ORANGE }} strokeWidth={3} />
                </span>
                <span className="text-sm font-medium" style={{ color: NAVY }}>
                  {b}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section
        className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20"
        style={{ background: "#F8FAFC", borderTop: "1px solid #E5E7EB" }}
      >
        <motion.div {...reveal} className="max-w-2xl mx-auto text-center mb-12">
          <Kicker>The team</Kicker>
          <Heading className="!leading-[1.2]">
            People who actually care
            <br />
            about your shipments.
          </Heading>
          <p className="mt-4 text-[15px] leading-7" style={{ color: SLATE }}>
            A focused team of engineers, product thinkers, and logistics veterans who have seen the
            problem from both sides.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {team.map((m, i) => (
            <motion.div
              key={m.name}
              {...revealDelay(i)}
              whileHover={{ y: -5 }}
              className="rounded-2xl bg-white p-6 text-center transition-shadow hover:shadow-lg hover:shadow-slate-200/60"
              style={{ border: "1px solid #E5E7EB" }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-extrabold mx-auto mb-4"
                style={{ background: GRADIENTS[m.grad], fontFamily: HEADING_FONT }}
              >
                {m.initials}
              </div>
              <div className="text-sm font-extrabold" style={{ color: NAVY, fontFamily: HEADING_FONT }}>
                {m.name}
              </div>
              <div className="text-[11px] font-semibold mt-1 mb-1.5" style={{ color: ORANGE }}>
                {m.role}
              </div>
              <div className="text-[11px] leading-relaxed" style={{ color: "#94A3B8" }}>
                {m.note}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <CtaBand
        title="Built in Delhi."
        highlight="Made for India."
        subtitle="Join 1,200+ Indian D2C brands shipping smarter with Box and Beyond. Set up your account in under 5 minutes."
        buttons={
          <>
            <BtnPrimary href="/careers">Join our team</BtnPrimary>
            <BtnGhostDark href="/contact">Get in touch</BtnGhostDark>
          </>
        }
      />
    </div>
  );
}
