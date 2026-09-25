import { motion } from "framer-motion";
import {
  Megaphone,
  Code2,
  Mic,
  GraduationCap,
  LayoutDashboard,
  Wallet,
  QrCode,
  Trophy,
  Headphones,
  Rocket,
} from "lucide-react";
import { Container, PageHero, CtaBanner } from "@/components/common";
import { scrollFadeUp, staggeredChild } from "@/config/animations";

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const audience = [
  {
    icon: <Megaphone className="w-6 h-6" />,
    title: "Marketing Agencies",
    body: "Working with D2C brands and ecommerce businesses.",
  },
  {
    icon: <Code2 className="w-6 h-6" />,
    title: "Shopify Developers",
    body: "Building stores for sellers who need better shipping.",
  },
  {
    icon: <Mic className="w-6 h-6" />,
    title: "Influencers & Creators",
    body: "With an audience of ecommerce sellers or founders.",
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: "Trainers & Consultants",
    body: "Teaching ecommerce courses or advising online businesses.",
  },
];

const steps = [
  { n: "1", title: "Share your link", body: "Share your unique referral link with ecommerce sellers." },
  { n: "2", title: "They sign up", body: "Seller registers, verifies KYC, and starts shipping." },
  { n: "3", title: "You earn forever", body: "Commission credited every month on all their shipments." },
];

const rateCard = [
  { plan: "Starter", rate: "₹1.00 / shipment" },
  { plan: "Growth", rate: "₹0.80 / shipment" },
  { plan: "Pro", rate: "₹0.70 / shipment" },
  { plan: "Enterprise", rate: "₹0.50 / shipment" },
];

const benefits = [
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    title: "Real-time dashboard",
    body: "Track every seller, every shipment, and every rupee earned — live.",
  },
  {
    icon: <Wallet className="w-5 h-5" />,
    title: "Monthly payouts",
    body: "Direct bank transfer every month. Full invoice and GST-ready.",
  },
  {
    icon: <QrCode className="w-5 h-5" />,
    title: "UTM + QR links",
    body: "Shareable referral links with UTM tracking and a QR code for offline sharing.",
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    title: "Partner levels",
    body: "Starter → Silver → Gold → Platinum. Unlock bonuses as you grow.",
  },
  {
    icon: <Headphones className="w-5 h-5" />,
    title: "Dedicated support",
    body: "Priority partner support via WhatsApp and email.",
  },
  {
    icon: <Rocket className="w-5 h-5" />,
    title: "Early access",
    body: "Gold+ partners get early access to new features and exclusive campaigns.",
  },
];

/* ═══════════════════════════════════════════════════════════
   PARTNERS PAGE
   ═══════════════════════════════════════════════════════════ */

export function PartnersPage() {
  return (
    <>
      {/* ━━━ HERO ━━━ */}
      <PageHero
        badge="Partnerships"
        variant="dark"
        title={
          <>
            Grow with Box and Beyond.{" "}
            <span className="text-gradient-accent">Earn every month.</span>
          </>
        }
        subtitle="Refer Indian ecommerce sellers to Box and Beyond and earn recurring commission on every shipment they make — for as long as they ship."
        primaryCta={{ label: "Become a Partner", href: "/signup" }}
        secondaryCta={{ label: "Talk to Us", href: "/contact" }}
      />

      {/* ━━━ WHO IS IT FOR ━━━ */}
      <section className="py-16 sm:py-24 bg-background">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-bg rounded-full mb-4">
              Who is this for
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              If you know ecommerce sellers,{" "}
              <span className="text-gradient-primary">you can earn with Box and Beyond</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {audience.map((a, i) => (
              <motion.div
                key={a.title}
                {...staggeredChild(i)}
                whileHover={{ y: -6 }}
                className="group bg-white border border-border-light rounded-2xl p-6 text-center hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center text-primary mx-auto mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                  {a.icon}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{a.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{a.body}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ HOW IT WORKS ━━━ */}
      <section className="py-16 sm:py-24 bg-white">
        <Container maxWidth="lg">
          <motion.div {...scrollFadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-accent bg-accent-bg rounded-full mb-4">
              How it works
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Refer once.{" "}
              <span className="text-gradient-accent">Earn every month.</span>
            </h2>
          </motion.div>

          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
            {/* Connector line (desktop) */}
            <div
              className="hidden sm:block absolute top-7 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-primary/50 via-accent/40 to-primary/50"
              aria-hidden
            />
            {steps.map((s, i) => (
              <motion.div key={s.n} {...staggeredChild(i, 0.12)} className="relative text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 ring-8 ring-white shadow-lg shadow-primary/20">
                  {s.n}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted leading-relaxed max-w-[15rem] mx-auto">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ RATE CARD ━━━ */}
      <section className="py-16 sm:py-24 bg-background">
        <Container maxWidth="xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <motion.div {...scrollFadeUp}>
              <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-bg rounded-full mb-4">
                Rate card
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-5 leading-tight">
                Simple, transparent commission —{" "}
                <span className="text-gradient-primary">per shipment.</span>
              </h2>
              <p className="text-muted leading-relaxed mb-6">
                You earn a fixed amount for every successful shipment made by your
                referred sellers. No caps, no minimum threshold to start earning.
              </p>
              <div className="bg-primary-bg border border-primary/15 rounded-xl px-5 py-4">
                <div className="text-xs font-semibold text-primary mb-1">Example calculation</div>
                <div className="text-sm text-foreground leading-relaxed">
                  A seller ships <strong>1,200 orders</strong> on the Growth plan
                  at <strong>₹0.80/shipment</strong> — you earn{" "}
                  <strong className="text-primary">₹960 this month</strong>, automatically.
                </div>
              </div>
            </motion.div>

            <motion.div
              {...scrollFadeUp}
              className="bg-white border border-border-light rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="grid grid-cols-2 px-5 py-3 bg-surface-muted border-b border-border-light text-xs font-semibold text-muted">
                <span>Seller plan</span>
                <span className="text-right">Your commission</span>
              </div>
              {rateCard.map((r) => (
                <div
                  key={r.plan}
                  className="grid grid-cols-2 px-5 py-4 border-b border-border-light last:border-b-0 text-sm"
                >
                  <span className="font-medium text-foreground">{r.plan}</span>
                  <span className="text-right font-bold text-primary">{r.rate}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </Container>
      </section>

      {/* ━━━ BENEFITS ━━━ */}
      <section className="py-16 sm:py-24 bg-white">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-accent bg-accent-bg rounded-full mb-4">
              Partner benefits
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              More than just{" "}
              <span className="text-gradient-accent">commission</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                {...staggeredChild(i, 0.07)}
                whileHover={{ y: -4 }}
                className="group flex gap-4 items-start bg-background border border-border-light rounded-2xl p-6 hover:border-primary/30 hover:bg-white hover:shadow-lg hover:shadow-primary/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center text-primary shrink-0 transition-transform duration-300 group-hover:scale-110">
                  {b.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{b.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{b.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ CTA ━━━ */}
      <CtaBanner
        title={
          <>
            Start earning <br />
            this month.
          </>
        }
        subtitle="Register free in 2 minutes. Your first commission could land in your account next month."
        primaryCta={{ label: "Become a Partner", href: "/signup" }}
        secondaryCta={{ label: "Learn More", href: "/contact" }}
      />
    </>
  );
}
