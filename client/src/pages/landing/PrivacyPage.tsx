import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Container, PageHero, CtaBanner } from "@/components/common";
import { animationConfig } from "@/config/animations";

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const LAST_UPDATED = "25 June 2026";

const sections = [
  {
    id: "info",
    title: "1. Information we collect",
    paras: [
      "When you register on Searchcraft, we collect information you provide directly — including your name, email address, mobile number, company name, and GST details where applicable.",
      "We also collect information automatically as you use our platform — such as shipment data, order details, carrier interactions, IP address, device information, and usage patterns within the dashboard.",
    ],
  },
  {
    id: "use",
    title: "2. How we use information",
    paras: [
      "We use your information to provide and improve Searchcraft's services — including rate comparison, shipment booking, tracking, COD remittance, recommendations, and billing.",
      "We also use aggregated, anonymised data to improve our platform and build better features. We will never sell your personal information to third parties.",
    ],
  },
  {
    id: "cookies",
    title: "3. Cookies & tracking",
    paras: [
      "Searchcraft uses essential cookies to keep you logged in and maintain your session. We also use analytics cookies to understand how the platform is used.",
      "You can disable non-essential cookies via your browser settings at any time. Disabling essential cookies may affect your ability to use the platform.",
    ],
  },
  {
    id: "sharing",
    title: "4. Data sharing",
    paras: [
      "We share your shipment and order data with the courier partners you select when booking shipments. This is required to process your deliveries.",
      "We do not share your data with advertisers, data brokers, or unrelated third parties. We may share data with service providers (such as cloud infrastructure and payment processors) who are bound by strict data protection agreements.",
    ],
  },
  {
    id: "rights",
    title: "5. Your rights",
    paras: [
      "You have the right to access, correct, or delete any personal information we hold about you. You can request an export of your data or ask us to erase your account at any time.",
      "To exercise any of these rights, email us at privacy@boxandbeyond.in. We will respond within 7 business days.",
    ],
  },
  {
    id: "retention",
    title: "6. Data retention",
    paras: [
      "We retain your account data for as long as your account is active. Shipment and transaction records are retained for 7 years as required under Indian tax and GST regulations.",
      "After account deletion, personal data is removed within 30 days, except where required by law.",
    ],
  },
  {
    id: "contact",
    title: "7. Contact us",
    paras: [
      "For any privacy-related queries, please contact our Data Protection Officer at privacy@boxandbeyond.in.",
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   PRIVACY POLICY PAGE
   ═══════════════════════════════════════════════════════════ */

export function PrivacyPage() {
  const [active, setActive] = useState(sections[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ━━━ HERO ━━━ */}
      <PageHero
        badge="Legal"
        variant="light"
        title="Privacy Policy"
        subtitle={`Last updated: ${LAST_UPDATED} · Searchcraft`}
      />

      {/* ━━━ CONTENT ━━━ */}
      <section className="py-16 sm:py-20 bg-background">
        <Container maxWidth="lg">
          <div className="grid lg:grid-cols-[220px_1fr] gap-10 lg:gap-16">
            {/* Sticky nav */}
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <div className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-3">
                  Contents
                </div>
                <nav className="flex flex-col gap-1">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className={`text-sm px-3 py-2 rounded-lg transition-colors no-underline ${
                        active === s.id
                          ? "bg-primary-bg text-primary font-medium"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Body */}
            <div className="flex flex-col gap-10">
              {sections.map((s, i) => (
                <motion.div
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-28"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: Math.min(i, 3) * 0.05, ease: animationConfig.ease.out }}
                >
                  <h2 className="text-xl font-bold text-foreground mb-3">{s.title}</h2>
                  {s.paras.map((p) => (
                    <p key={p} className="text-sm text-muted leading-7 mb-3 last:mb-0">
                      {p}
                    </p>
                  ))}
                  {s.id === "contact" && (
                    <div className="mt-4 inline-flex flex-col gap-1 bg-white border border-border-light rounded-xl p-5">
                      <span className="text-sm font-semibold text-foreground">Searchcraft</span>
                      <span className="text-sm text-muted">
                        Search craft digital, B 20, Sector 1, Noida, UP-India-201301
                      </span>
                      <a
                        href="mailto:privacy@boxandbeyond.in"
                        className="text-sm text-primary font-medium underline underline-offset-2"
                      >
                        privacy@boxandbeyond.in
                      </a>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ━━━ CTA ━━━ */}
      <CtaBanner
        title="Questions about your data?"
        subtitle="Email us at privacy@boxandbeyond.in — we respond within 7 business days."
        primaryCta={{ label: "Contact Privacy Team", href: "mailto:privacy@boxandbeyond.in" }}
        secondaryCta={{ label: "Back to Home", href: "/" }}
      />
    </>
  );
}
