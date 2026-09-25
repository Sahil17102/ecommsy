import { motion } from "framer-motion";
import {
  MapPin,
  Truck,
  Eye,
  ShieldCheck,
  IndianRupee,
  Globe,
  LayoutDashboard,
  PackageSearch,
  BarChart3,
  Headphones,
  MessageCircle,
  LineChart,
  CheckCircle2,
} from "lucide-react";
import { Container, PageHero, CtaBanner } from "@/components/common";
import {
  scrollFadeUp,
  staggeredChild,
  animationConfig,
} from "@/config/animations";

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const stats = [
  { value: "25+", label: "Courier Partners" },
  { value: "29,000+", label: "Pincodes Covered" },
  { value: "99.5%", label: "Platform Uptime" },
  { value: "50ms", label: "Avg Response" },
];

const features = [
  {
    icon: <MapPin className="w-6 h-6" />,
    title: "Pan-India Coverage",
    description:
      "Deliver to 29,000+ pin codes across all states and union territories, including tier-2 and tier-3 cities.",
  },
  {
    icon: <Truck className="w-6 h-6" />,
    title: "Trusted Courier Network",
    description:
      "Access 25+ vetted courier partners including BlueDart, Delhivery, DTDC, XpressBees, and Ekart.",
  },
  {
    icon: <Eye className="w-6 h-6" />,
    title: "Live Shipment Tracking",
    description:
      "Real-time tracking updates for both sellers and buyers with branded tracking pages and notifications.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "Smart NDR Management",
    description:
      "Reduce failed deliveries by 20% with automated non-delivery report handling and buyer re-confirmation.",
  },
  {
    icon: <IndianRupee className="w-6 h-6" />,
    title: "Rapid COD Settlements",
    description:
      "Same-day COD remittance options to improve your cash flow. Track every rupee with transparent reconciliation.",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "International Shipping",
    description:
      "Door-to-door global delivery with top international partners. Ship to 220+ countries from one dashboard.",
  },
];

const capabilities = [
  {
    icon: <LayoutDashboard className="w-7 h-7" />,
    title: "Centralized Dashboard",
    description:
      "Manage all your orders, shipments, returns, and pickups from one unified command center. No more juggling between courier portals.",
    highlights: [
      "Unified order management",
      "Bulk label generation",
      "One-click manifest creation",
    ],
  },
  {
    icon: <PackageSearch className="w-7 h-7" />,
    title: "Inventory Management",
    description:
      "Live stock tracking across multiple warehouses and sales channels. Automatic sync ensures you never oversell or miss a restock.",
    highlights: [
      "Multi-warehouse support",
      "Channel-level sync",
      "Low-stock alerts",
    ],
  },
  {
    icon: <BarChart3 className="w-7 h-7" />,
    title: "Performance Analytics",
    description:
      "Deep insights into delivery SLAs, shipping costs, RTO rates, and courier performance. Make data-driven decisions effortlessly.",
    highlights: [
      "Courier scorecards",
      "Cost breakdown reports",
      "RTO trend analysis",
    ],
  },
];

const supportChannels = [
  {
    icon: <Headphones className="w-6 h-6" />,
    title: "Dedicated Support",
    description:
      "Direct helpline with priority resolution for all your shipping queries and escalations.",
  },
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: "24/7 Live Chat",
    description:
      "Round-the-clock chat assistance for urgent issues. Average response time under 2 minutes.",
  },
  {
    icon: <LineChart className="w-6 h-6" />,
    title: "Performance Reviews",
    description:
      "Regular performance reviews with a dedicated account manager to optimize your shipping operations.",
  },
];

/* ═══════════════════════════════════════════════════════════
   PLATFORM PAGE
   ═══════════════════════════════════════════════════════════ */

export function PlatformPage() {
  return (
    <>
      {/* ━━━ HERO ━━━ */}
      <PageHero
        badge="Our Platform"
        variant="dark"
        title={
          <>
            One Platform to Power{" "}
            <span className="text-gradient-accent">All Your Shipping</span>
          </>
        }
        subtitle="Consolidate your entire logistics operation into a single, powerful dashboard. Sync orders, compare rates, print labels, and track shipments — all from one window."
        primaryCta={{ label: "Start Free Trial", href: "/signup" }}
        secondaryCta={{ label: "Watch Demo", href: "/contact" }}
      >
        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.4,
            duration: 0.6,
            ease: animationConfig.ease.out,
          }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-2xl mx-auto mt-4"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.6 + i * 0.1,
                duration: 0.4,
                ease: animationConfig.ease.out,
              }}
              className="text-center"
            >
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {stat.value}
              </div>
              <div className="text-xs text-white/50 mt-1 tracking-wide">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </PageHero>

      {/* ━━━ CORE FEATURES ━━━ */}
      <section className="py-16 sm:py-24 bg-background">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-bg rounded-full mb-4">
              Why Choose Box and Beyond
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything you need to{" "}
              <span className="text-gradient-primary">ship with confidence</span>
            </h2>
            <p className="text-muted max-w-xl mx-auto leading-relaxed">
              Built from the ground up for Indian e-commerce — reliable,
              affordable, and incredibly easy to use.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((f, i) => (
              <motion.div key={f.title} {...staggeredChild(i)}>
                <div className="group relative bg-white border border-border-light rounded-xl p-7 sm:p-8 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ PLATFORM CAPABILITIES ━━━ */}
      <section className="py-16 sm:py-24 bg-white">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-accent bg-accent-bg rounded-full mb-4">
              Platform Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Your shipping{" "}
              <span className="text-gradient-accent">command center</span>
            </h2>
            <p className="text-muted max-w-xl mx-auto leading-relaxed">
              Three powerful modules that work together to streamline every part
              of your logistics workflow.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {capabilities.map((cap, i) => (
              <motion.div key={cap.title} {...staggeredChild(i, 0.15)}>
                <div className="group relative bg-background border border-border-light rounded-2xl overflow-hidden hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all h-full">
                  {/* Decorative gradient header */}
                  <div className="h-2 bg-gradient-to-r from-primary to-accent" />

                  <div className="p-7 sm:p-8">
                    <div className="w-14 h-14 rounded-2xl bg-primary-bg flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-colors">
                      {cap.icon}
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">
                      {cap.title}
                    </h3>
                    <p className="text-sm text-muted leading-relaxed mb-5">
                      {cap.description}
                    </p>

                    {/* Highlights */}
                    <ul className="space-y-2.5">
                      {cap.highlights.map((h) => (
                        <li
                          key={h}
                          className="flex items-center gap-2.5 text-sm text-foreground/80"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ SUPPORT ━━━ */}
      <section className="py-16 sm:py-24 bg-background">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-bg rounded-full mb-4">
              Support
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              We're with you{" "}
              <span className="text-gradient-primary">every step</span>
            </h2>
            <p className="text-muted max-w-xl mx-auto leading-relaxed">
              Shipping issues don't wait — and neither do we. Get help whenever
              you need it.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {supportChannels.map((s, i) => (
              <motion.div
                key={s.title}
                {...staggeredChild(i)}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-bg text-primary mb-5">
                  {s.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
                  {s.description}
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
            Ready to streamline
            <br />
            your shipping?
          </>
        }
        subtitle="Join 1.5 Lakh+ businesses already shipping smarter with Box and Beyond. Set up your account in under 5 minutes."
        primaryCta={{ label: "Start Shipping Free", href: "/signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact" }}
      />
    </>
  );
}
