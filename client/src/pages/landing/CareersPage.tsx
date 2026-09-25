import { motion } from "framer-motion";
import {
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Globe,
  Star,
  Heart,
  ArrowRight,
} from "lucide-react";
import { Container, PageHero, CtaBanner } from "@/components/common";
import { scrollFadeUp, staggeredChild } from "@/config/animations";

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const perks = [
  {
    icon: <Briefcase className="w-6 h-6" />,
    title: "Ownership from day one",
    body: "No six-month ramp-up. You'll ship real features to real sellers from your very first week.",
  },
  {
    icon: <CheckCircle2 className="w-6 h-6" />,
    title: "Work that matters",
    body: "The features you build directly impact thousands of Indian sellers shipping every single day.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Grow fast",
    body: "We're early-stage. The people who join now will lead teams as Searchcraft scales.",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Remote-friendly",
    body: "Based in Delhi but open to remote across India for the right roles.",
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: "Competitive pay",
    body: "Market-rate salaries, performance bonuses, and ESOPs for early joiners.",
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: "People-first culture",
    body: "No politics, no micromanagement — just good people doing good work.",
  },
];

const roles = [
  {
    title: "Full-Stack Engineer (React + Node)",
    dept: "Engineering",
    deptTint: "bg-primary-bg text-primary",
    type: "Full-time",
    location: "Delhi / Remote",
  },
  {
    title: "Product Manager — Logistics",
    dept: "Product",
    deptTint: "bg-accent-bg text-accent",
    type: "Full-time",
    location: "Delhi",
  },
  {
    title: "Growth & Partnerships Manager",
    dept: "Growth",
    deptTint: "bg-emerald-50 text-emerald-600",
    type: "Full-time",
    location: "Delhi / Remote",
  },
  {
    title: "UI/UX Designer",
    dept: "Design",
    deptTint: "bg-purple-50 text-purple-600",
    type: "Full-time",
    location: "Remote",
  },
  {
    title: "Seller Success Executive",
    dept: "Customer",
    deptTint: "bg-sky-50 text-sky-600",
    type: "Full-time",
    location: "Delhi",
  },
];

const hiring = [
  { n: "1", title: "Apply", body: "Send your CV and a short note on why Searchcraft." },
  { n: "2", title: "Intro call", body: "A 30-minute chat with the hiring manager." },
  { n: "3", title: "Task / Interview", body: "A small practical task or technical discussion." },
  { n: "4", title: "Offer", body: "Decision within 5 working days. No ghosting." },
];

/* ═══════════════════════════════════════════════════════════
   CAREERS PAGE
   ═══════════════════════════════════════════════════════════ */

export function CareersPage() {
  return (
    <>
      {/* ━━━ HERO ━━━ */}
      <PageHero
        badge="Careers"
        variant="dark"
        title={
          <>
            Help build India's{" "}
            <span className="text-gradient-accent">shipping operating system.</span>
          </>
        }
        subtitle="We're a small, focused team solving real problems for Indian sellers. If that excites you, we want to hear from you."
        primaryCta={{ label: "View Open Roles", href: "#roles" }}
        secondaryCta={{ label: "Email Us", href: "mailto:careers@boxandbeyond.in" }}
      />

      {/* ━━━ WHY JOIN ━━━ */}
      <section className="py-16 sm:py-24 bg-background">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-bg rounded-full mb-4">
              Why work with us
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Small team. Big mission.{" "}
              <span className="text-gradient-primary">Real ownership.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {perks.map((p, i) => (
              <motion.div key={p.title} {...staggeredChild(i)} whileHover={{ y: -6 }}>
                <div className="group bg-white border border-border-light rounded-2xl p-7 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-colors h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center text-primary mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                    {p.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{p.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{p.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ OPEN ROLES ━━━ */}
      <section id="roles" className="py-16 sm:py-24 bg-white scroll-mt-24">
        <Container maxWidth="lg">
          <motion.div {...scrollFadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-accent bg-accent-bg rounded-full mb-4">
              Open roles
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              We're hiring across{" "}
              <span className="text-gradient-accent">tech, product & growth</span>
            </h2>
          </motion.div>

          <div className="flex flex-col gap-3">
            {roles.map((r, i) => (
              <motion.div
                key={r.title}
                {...staggeredChild(i, 0.07)}
                whileHover={{ x: 4 }}
                className="group bg-background border border-border-light rounded-xl p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-colors"
              >
                <div>
                  <div className="text-base font-semibold text-foreground mb-2">{r.title}</div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.deptTint}`}>
                      {r.dept}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface-muted text-muted">
                      {r.type}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface-muted text-muted">
                      {r.location}
                    </span>
                  </div>
                </div>
                <a
                  href="mailto:careers@boxandbeyond.in"
                  className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors no-underline"
                >
                  Apply now
                  <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-sm text-muted mt-8">
            Don't see your role? Email us at{" "}
            <a href="mailto:careers@boxandbeyond.in" className="text-primary font-semibold underline underline-offset-2">
              careers@boxandbeyond.in
            </a>
          </p>
        </Container>
      </section>

      {/* ━━━ HOW WE HIRE ━━━ */}
      <section className="py-16 sm:py-24 bg-background">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-bg rounded-full mb-4">
              How we hire
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              No nonsense, no long loops —{" "}
              <span className="text-gradient-primary">just an honest conversation</span>
            </h2>
          </motion.div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              className="hidden lg:block absolute top-6 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-primary/50 via-accent/40 to-primary/50"
              aria-hidden
            />
            {hiring.map((step, i) => (
              <motion.div key={step.n} {...staggeredChild(i)} className="relative text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 ring-8 ring-background shadow-lg shadow-primary/20">
                  {step.n}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted leading-relaxed max-w-[14rem] mx-auto">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ CTA ━━━ */}
      <CtaBanner
        title={
          <>
            Ready to build <br />
            something real?
          </>
        }
        subtitle="Join us in Delhi — or remotely — and help shape the future of Indian ecommerce shipping."
        primaryCta={{ label: "Email Your CV", href: "mailto:careers@boxandbeyond.in" }}
        secondaryCta={{ label: "About Searchcraft", href: "/about" }}
      />
    </>
  );
}
