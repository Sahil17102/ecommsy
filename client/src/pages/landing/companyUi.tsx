import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { SmartLink } from "@/components/common/SmartLink";

/* ─────────────────────────────────────────────────────────────
   Shared building blocks for the company / legal pages.
   Visual language mirrors the approved mockups:
   navy #07152D ink, logo purple accent, #F8FAFC sections,
   Plus Jakarta Sans bold headings, gradient icon squares,
   navy stat / CTA bands. Subtle scroll + hover motion throughout.
   ───────────────────────────────────────────────────────────── */

export const NAVY = "#07152D";
export const ORANGE = "#6757E8";
export const SLATE = "#64748B";

export const HEADING_FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

/** Gradient presets for icon squares / avatars. */
export const GRADIENTS = {
  blue: "linear-gradient(145deg,#2B80E8,#1560BD)",
  orange: "linear-gradient(145deg,#9B8CFF,#6757E8)",
  green: "linear-gradient(145deg,#16A34A,#064E3B)",
  purple: "linear-gradient(145deg,#7C3AED,#4C1D95)",
  teal: "linear-gradient(145deg,#0D9488,#065F46)",
  rose: "linear-gradient(145deg,#E11D48,#9F1239)",
} as const;

export type GradientKey = keyof typeof GRADIENTS;

/* ── scroll reveal ── */
export const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
} as const;

export function revealDelay(i: number, step = 0.07) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-40px" },
    transition: { duration: 0.5, delay: i * step, ease: [0.22, 1, 0.36, 1] as const },
  };
}

/* ── eyebrow pill (hero) ── */
export function Eyebrow({ label, tone = "orange" }: { label: string; tone?: "orange" | "blue" }) {
  const styles =
    tone === "blue"
      ? { bg: "#EEF4FF", border: "#BFDBFE", color: "#1560BD" }
      : { bg: "#F0EDFF", border: "#D8D1FF", color: ORANGE };
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-5"
      style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: styles.color }} />
      <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: styles.color }}>
        {label}
      </span>
    </span>
  );
}

/* ── small uppercase section kicker ── */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: ORANGE }}>
      {children}
    </div>
  );
}

/* ── section heading ── */
export function Heading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`text-[28px] sm:text-[34px] font-extrabold leading-[1.18] tracking-tight ${className}`}
      style={{ color: NAVY, fontFamily: HEADING_FONT }}
    >
      {children}
    </h2>
  );
}

/* ── gradient icon square ── */
export function IconSquare({
  gradient = "orange",
  size = 44,
  children,
  className = "",
}: {
  gradient?: GradientKey;
  size?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl flex items-center justify-center text-white shrink-0 ${className}`}
      style={{ width: size, height: size, background: GRADIENTS[gradient] }}
    >
      {children}
    </div>
  );
}

/* ── hero ── */
export function CompanyHero({
  eyebrow,
  eyebrowTone = "orange",
  title,
  subtitle,
  ctas,
}: {
  eyebrow: string;
  eyebrowTone?: "orange" | "blue";
  title: ReactNode;
  subtitle: string;
  ctas?: ReactNode;
}) {
  return (
    <section
      className="text-center px-4 sm:px-6 pt-28 sm:pt-32 lg:pt-36 pb-16 sm:pb-20"
      style={{ background: "#F8FAFC", borderBottom: "1px solid #E5E7EB" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-3xl mx-auto"
      >
        <Eyebrow label={eyebrow} tone={eyebrowTone} />
        <h1
          className="text-[34px] sm:text-[44px] lg:text-[50px] font-extrabold leading-[1.08] tracking-tight mb-4"
          style={{ color: NAVY, fontFamily: HEADING_FONT }}
        >
          {title}
        </h1>
        <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style={{ color: SLATE }}>
          {subtitle}
        </p>
        {ctas && <div className="mt-8 flex flex-wrap gap-3 justify-center">{ctas}</div>}
      </motion.div>
    </section>
  );
}

/* ── buttons ── */
export function BtnPrimary({ href, children }: { href: string; children: ReactNode }) {
  return (
    <SmartLink
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-[10px] px-7 py-3.5 text-sm font-bold text-white bg-[#6757E8] hover:bg-[#5544D8] no-underline shadow-sm transition-all hover:-translate-y-0.5"
    >
      {children}
    </SmartLink>
  );
}

export function BtnGhostDark({ href, children }: { href: string; children: ReactNode }) {
  return (
    <SmartLink
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-[10px] px-7 py-3.5 text-sm font-semibold text-white bg-white/[0.08] border border-white/20 hover:bg-white/[0.14] no-underline transition-colors"
    >
      {children}
    </SmartLink>
  );
}

export function BtnLight({ href, children }: { href: string; children: ReactNode }) {
  return (
    <SmartLink
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-[10px] px-7 py-3.5 text-sm font-semibold text-[#07152D] bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] no-underline transition-colors"
    >
      {children}
    </SmartLink>
  );
}

/* ── navy stat band ── */
export function StatBand({ stats }: { stats: { value: string; suffix?: string; label: string }[] }) {
  return (
    <section style={{ background: NAVY }} className="px-4 sm:px-6 py-10 sm:py-12">
      <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="text-center px-3 sm:px-6 py-3 sm:border-r last:border-r-0"
            style={{ borderColor: "rgba(255,255,255,.1)" }}
          >
            <div
              className="text-[26px] sm:text-[32px] font-extrabold text-white"
              style={{ fontFamily: HEADING_FONT }}
            >
              {s.value}
              {s.suffix && <span style={{ color: ORANGE }}>{s.suffix}</span>}
            </div>
            <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,.45)" }}>
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── navy CTA band ── */
export function CtaBand({
  title,
  highlight,
  subtitle,
  buttons,
}: {
  title: string;
  highlight?: string;
  subtitle: string;
  buttons: ReactNode;
}) {
  return (
    <section style={{ background: NAVY }} className="px-4 sm:px-6 py-16 sm:py-20 text-center">
      <motion.div {...reveal} className="max-w-2xl mx-auto">
        <h2 className="text-[28px] sm:text-[34px] font-extrabold text-white mb-3" style={{ fontFamily: HEADING_FONT }}>
          {title} {highlight && <span style={{ color: ORANGE }}>{highlight}</span>}
        </h2>
        <p className="text-sm sm:text-base mb-7 max-w-md mx-auto" style={{ color: "rgba(255,255,255,.55)" }}>
          {subtitle}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">{buttons}</div>
      </motion.div>
    </section>
  );
}
