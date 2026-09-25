import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Phone, HelpCircle, Users, MapPin, ArrowRight, Clock, MessagesSquare, Globe2 } from "lucide-react";
import { Container, PageHero, CtaBanner } from "@/components/common";
import { scrollFadeUp, staggeredChild, animationConfig } from "@/config/animations";

const quickFacts = [
  { icon: <Clock className="w-4 h-4" />, label: "Avg. response", value: "Under 1 business day" },
  { icon: <MessagesSquare className="w-4 h-4" />, label: "Support hours", value: "Mon–Sat · 9am–7pm IST" },
  { icon: <Globe2 className="w-4 h-4" />, label: "We speak", value: "English & Hindi" },
];

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const channels = [
  {
    icon: <Phone className="w-5 h-5" />,
    tint: "bg-primary-bg text-primary",
    title: "Talk to sales",
    body: "Interested in Box and Beyond for your business? Our team will walk you through plans, pricing, and setup.",
    contact: "sales@boxandbeyond.in",
    href: "mailto:sales@boxandbeyond.in",
  },
  {
    icon: <HelpCircle className="w-5 h-5" />,
    tint: "bg-accent-bg text-accent",
    title: "Seller support",
    body: "Already shipping with Box and Beyond? Raise a ticket or chat with our support team — Mon–Sat, 9am–7pm IST.",
    contact: "cs@boxandbeyond.in",
    href: "mailto:cs@boxandbeyond.in",
  },
  {
    icon: <Users className="w-5 h-5" />,
    tint: "bg-emerald-50 text-emerald-600",
    title: "Partnerships",
    body: "Courier, technology, or channel partnerships — let's build something together.",
    contact: "partners@boxandbeyond.in",
    href: "mailto:partners@boxandbeyond.in",
  },
  {
    icon: <Phone className="w-5 h-5" />,
    tint: "bg-sky-50 text-sky-600",
    title: "Call us",
    body: "Prefer to talk? Our team is a phone call away during business hours.",
    contact: "+91 87500 47039",
    href: "tel:+918750047039",
  },
];

const subjects = ["Sales enquiry", "Seller support", "Partnership", "Other"];

/* ═══════════════════════════════════════════════════════════
   CONTACT PAGE
   ═══════════════════════════════════════════════════════════ */

const inputClass =
  "w-full h-11 px-3.5 rounded-lg border border-border-light bg-white text-sm text-foreground placeholder:text-tertiary outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all";

export function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // No public contact endpoint yet — acknowledge and reset.
    setTimeout(() => {
      setSubmitting(false);
      (e.target as HTMLFormElement).reset();
      toast.success("Thanks for reaching out!", {
        description: "We'll get back to you within one business day.",
      });
    }, 600);
  }

  return (
    <>
      {/* ━━━ HERO ━━━ */}
      <PageHero
        badge="Get in touch"
        variant="dark"
        title={
          <>
            We're here to{" "}
            <span className="text-gradient-accent">help.</span>
          </>
        }
        subtitle="Sales, support, partnerships — reach out and we'll get back to you within one business day."
      />

      {/* ━━━ CONTACT GRID ━━━ */}
      <section className="py-16 sm:py-24 bg-background">
        <Container maxWidth="xl">
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-8 lg:gap-12 items-start">
            {/* Left — channels */}
            <div className="flex flex-col gap-4">
              {channels.map((c, i) => (
                <motion.a
                  key={c.title}
                  href={c.href}
                  {...staggeredChild(i, 0.08)}
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="group bg-white border border-border-light rounded-2xl p-6 flex gap-4 items-start hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-colors no-underline"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${c.tint}`}>
                    {c.icon}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-foreground mb-1">{c.title}</div>
                    <div className="text-sm text-muted leading-relaxed mb-2">{c.body}</div>
                    <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                      {c.contact}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                  </div>
                </motion.a>
              ))}

              {/* Office */}
              <motion.div
                {...staggeredChild(channels.length, 0.08)}
                className="bg-white border border-border-light rounded-2xl p-6 flex gap-4 items-start"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-surface-muted text-muted">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground mb-1">Corporate office</div>
                  <div className="text-sm text-muted leading-relaxed">
                    Box and Beyond
                    <br />
                    Plot No. 55A, Ground Floor, Kh No. 31/12, Block C,
                    <br />
                    Bharat Vihar, Kakrola, South West Delhi, Delhi 110078
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right — form */}
            <motion.div
              {...scrollFadeUp}
              className="bg-white border border-border-light rounded-2xl p-6 sm:p-8 shadow-sm"
            >
              <h2 className="text-xl font-bold text-foreground mb-1">Send us a message</h2>
              <p className="text-sm text-tertiary mb-6">We'll reply within one business day.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Full name</label>
                    <input required name="name" className={inputClass} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Email</label>
                    <input required type="email" name="email" className={inputClass} placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Company</label>
                  <input name="company" className={inputClass} placeholder="Your company name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">I'm contacting about</label>
                  <select name="subject" className={`${inputClass} cursor-pointer`} defaultValue={subjects[0]}>
                    {subjects.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Message</label>
                  <textarea
                    required
                    name="message"
                    rows={5}
                    className={`${inputClass} h-auto py-3 resize-y`}
                    placeholder="Tell us how we can help..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Sending..." : "Send message"}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </motion.div>
          </div>

          {/* Quick facts strip */}
          <motion.div
            {...scrollFadeUp}
            className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {quickFacts.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: animationConfig.ease.out }}
                className="flex items-center gap-3 bg-white border border-border-light rounded-xl px-5 py-4"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-bg text-primary flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <div>
                  <div className="text-xs text-tertiary">{f.label}</div>
                  <div className="text-sm font-semibold text-foreground">{f.value}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* ━━━ CTA ━━━ */}
      <CtaBanner
        title={
          <>
            Prefer to <br />
            ship it yourself?
          </>
        }
        subtitle="Set up your Box and Beyond account in under 5 minutes — no call required. Our team is here the moment you need a hand."
        primaryCta={{ label: "Start Shipping Free", href: "/signup" }}
        secondaryCta={{ label: "Explore the Platform", href: "/platform" }}
      />
    </>
  );
}
