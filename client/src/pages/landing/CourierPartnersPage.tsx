import { motion } from "framer-motion";
import {
  IndianRupee,
  MapPin,
  Timer,
} from "lucide-react";
import { Container, PageHero, CtaBanner } from "@/components/common";
import { scrollFadeUp, staggeredChild } from "@/config/animations";
import { BrandLogo } from "@/components/BrandLogos";


const partners = [
  {
    name: "BlueDart",
    color: "#003399",
    domain: "bluedart.com",
    specialty: "Premium Express",
    description:
      "India's most reliable express delivery service with unmatched reach for time-sensitive shipments.",
    coverage: "35,000+ pincodes",
  },
  {
    name: "Delhivery",
    color: "#D42F2F",
    domain: "delhivery.com",
    specialty: "Pan-India Logistics",
    description:
      "Full-stack logistics with express, freight, and cross-border services for businesses of all sizes.",
    coverage: "18,500+ pincodes",
  },
  {
    name: "DTDC",
    color: "#E31E24",
    domain: "dtdc.in",
    specialty: "Domestic & International",
    description:
      "One of India's oldest courier networks with deep reach into tier-2 and tier-3 cities.",
    coverage: "14,000+ pincodes",
  },
  {
    name: "Ecom Express",
    color: "#009B3A",
    domain: "ecomexpress.in",
    specialty: "E-commerce Focused",
    description:
      "Purpose-built for e-commerce with strong COD handling and reverse logistics capabilities.",
    coverage: "27,000+ pincodes",
  },
  {
    name: "XpressBees",
    color: "#FFCD00",
    domain: "xpressbees.com",
    specialty: "Last-Mile Delivery",
    description:
      "Technology-driven last-mile delivery with fast turnaround and competitive pricing.",
    coverage: "20,000+ pincodes",
  },
  {
    name: "Ekart",
    color: "#2874F0",
    domain: "ekartlogistics.com",
    specialty: "Marketplace Logistics",
    description:
      "Flipkart's logistics arm now available for all sellers with deep marketplace expertise.",
    coverage: "15,000+ pincodes",
  },
  {
    name: "Aramex",
    color: "#E84427",
    domain: "aramex.com",
    specialty: "International Shipping",
    description:
      "Global logistics giant for international shipments with customs expertise and door-to-door delivery.",
    coverage: "220+ countries",
  },
  {
    name: "Shadowfax",
    color: "#5C2D91",
    domain: "shadowfax.in",
    specialty: "Hyperlocal & Express",
    description:
      "Same-day and next-day delivery specialists with a strong hyperlocal fleet network.",
    coverage: "12,000+ pincodes",
  },
];

const selectionCriteria = [
  {
    icon: <Timer className="w-6 h-6" />,
    title: "Speed",
    description:
      "We analyze each courier's historical delivery times for the specific origin-destination pair to pick the fastest option.",
  },
  {
    icon: <IndianRupee className="w-6 h-6" />,
    title: "Cost",
    description:
      "Real-time rate comparison across all partners ensures you always get the most competitive shipping price.",
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    title: "Serviceability",
    description:
      "Pincode-level checks ensure the selected courier actually serves both pickup and delivery locations.",
  },
];

const coverageStats = [
  { value: "25+", label: "Courier Partners" },
  { value: "29,000+", label: "Pincodes Covered" },
  { value: "220+", label: "Countries Served" },
  { value: "99.2%", label: "On-Time Delivery" },
];


export function CourierPartnersPage() {
  return (
    <>
      {/* ━━━ HERO ━━━ */}
      <PageHero
        badge="Courier Partners"
        badgeVariant="accent"
        title={
          <>
            India's Most Trusted{" "}
            <span className="text-gradient-accent">Courier Network</span>
          </>
        }
        subtitle="Access 25+ top courier partners through a single integration. Smart routing ensures every package goes through the fastest, cheapest option available."
        primaryCta={{ label: "Start Shipping", href: "/signup" }}
        secondaryCta={{ label: "Compare Rates", href: "/resources/rate-calculator" }}
      />

      {/* ━━━ PARTNER GRID ━━━ */}
      <section className="py-16 sm:py-24 bg-white">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-bg rounded-full mb-4">
              Our Network
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              One integration,{" "}
              <span className="text-gradient-primary">25+ couriers</span>
            </h2>
            <p className="text-muted max-w-xl mx-auto leading-relaxed">
              Every partner is pre-negotiated with discounted rates so you save
              on every shipment automatically.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {partners.map((p, i) => (
              <motion.div key={p.name} {...staggeredChild(i, 0.08)}>
                <div className="group relative bg-background border border-border-light rounded-xl overflow-hidden hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all h-full">
                  {/* Color accent */}
                  <div
                    className="h-1"
                    style={{ backgroundColor: p.color }}
                  />

                  <div className="p-5 sm:p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-gray-50"
                      >
                        <BrandLogo domain={p.domain} name={p.name} color={p.color} size={32} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-foreground leading-tight">
                          {p.name}
                        </h3>
                        <span className="text-xs text-muted">
                          {p.specialty}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-muted leading-relaxed mb-3">
                      {p.description}
                    </p>

                    {/* Coverage */}
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <MapPin className="w-3.5 h-3.5" />
                      {p.coverage}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ COVERAGE STATS ━━━ */}
      <section className="py-16 sm:py-20 bg-background">
        <Container maxWidth="lg">
          <motion.div {...scrollFadeUp} className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Unmatched{" "}
              <span className="text-gradient-primary">coverage</span>
            </h2>
            <p className="text-muted max-w-md mx-auto leading-relaxed">
              From metros to remote villages — we've got India covered, and the
              world too.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {coverageStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                {...staggeredChild(i)}
                className="text-center"
              >
                <div className="text-3xl sm:text-4xl font-bold text-gradient-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ SMART SELECTION ━━━ */}
      <section className="py-16 sm:py-24 bg-white">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-accent bg-accent-bg rounded-full mb-4">
              Smart Routing
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              We pick the{" "}
              <span className="text-gradient-accent">best courier</span> for
              every order
            </h2>
            <p className="text-muted max-w-xl mx-auto leading-relaxed">
              Our AI-powered recommendation engine evaluates every shipment on
              three key dimensions.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {selectionCriteria.map((c, i) => (
              <motion.div key={c.title} {...staggeredChild(i, 0.15)}>
                <div className="group text-center bg-background border border-border-light rounded-xl p-7 sm:p-8 hover:border-accent/25 hover:shadow-xl hover:shadow-accent/5 transition-all h-full">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-bg text-accent mb-5 group-hover:bg-accent group-hover:text-white transition-colors">
                    {c.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {c.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
                    {c.description}
                  </p>
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
            Ship with India's best
            <br />
            courier network
          </>
        }
        subtitle="One integration, 25+ couriers, zero hassle. Start shipping smarter today."
        primaryCta={{ label: "Start Shipping Free", href: "/signup" }}
        secondaryCta={{ label: "View Sales Channels", href: "/integrations/sales-channels" }}
      />
    </>
  );
}
