import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Container } from "./Container";
import { SmartLink } from "./SmartLink";
import { animationConfig } from "@/config/animations";

/* ─── types ─── */

interface HeroCta {
  label: string;
  href: string;
  icon?: ReactNode;
}

interface PageHeroProps {
  /** Small badge pill above the title */
  badge: string;
  badgeVariant?: "primary" | "accent";
  /** Title — pass JSX to use gradient spans */
  title: ReactNode;
  subtitle: string;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  /** "dark" uses the indigo gradient bg, "light" uses a subtle tinted bg */
  variant?: "dark" | "light";
  /** Extra content rendered below the CTAs (e.g. search bar, stats) */
  children?: ReactNode;
}

/* ─── component ─── */

export function PageHero({
  badge,
  badgeVariant = "primary",
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  variant = "light",
  children,
}: PageHeroProps) {
  const isDark = variant === "dark";

  return (
    <section className={isDark ? "hero-bg relative" : "hero-light relative"}>
      {isDark ? (
        <>
          <div className="hero-blob-1" />
          <div className="hero-blob-2" />
        </>
      ) : (
        <div className="hero-light-orb" />
      )}

      <Container
        maxWidth="xl"
        className="relative z-10 pt-28 sm:pt-32 lg:pt-36 pb-16 sm:pb-20"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: animationConfig.ease.out,
          }}
          className="text-center max-w-3xl mx-auto"
        >
          {/* Badge */}
          <span
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-6 ${
              isDark
                ? "bg-white/10 border border-white/15 text-white/90"
                : badgeVariant === "accent"
                  ? "bg-accent-bg text-accent border border-accent/10"
                  : "bg-primary-bg text-primary border border-primary/10"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isDark
                  ? "bg-emerald-400 animate-pulse"
                  : badgeVariant === "accent"
                    ? "bg-accent"
                    : "bg-primary"
              }`}
            />
            {badge}
          </span>

          {/* Title */}
          <h1
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-5 ${
              isDark ? "text-white" : "text-foreground"
            }`}
          >
            {title}
          </h1>

          {/* Subtitle */}
          <p
            className={`text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8 ${
              isDark ? "text-white/60" : "text-muted"
            }`}
          >
            {subtitle}
          </p>

          {/* CTAs */}
          {(primaryCta || secondaryCta) && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {primaryCta && (
                <SmartLink
                  href={primaryCta.href}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-lg transition-all no-underline shadow-lg ${
                    isDark
                      ? "text-white bg-accent hover:bg-accent-hover shadow-purple-500/25 hover:shadow-purple-500/40"
                      : "text-white bg-accent hover:bg-accent-hover shadow-purple-500/20 hover:shadow-purple-500/35"
                  }`}
                >
                  {primaryCta.label}
                  {primaryCta.icon ?? <ArrowRight className="w-4 h-4" />}
                </SmartLink>
              )}
              {secondaryCta && (
                <SmartLink
                  href={secondaryCta.href}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-lg transition-all no-underline ${
                    isDark
                      ? "text-white border border-white/20 hover:bg-white/10"
                      : "text-foreground border border-border hover:bg-primary-bg hover:border-primary/20"
                  }`}
                >
                  {secondaryCta.label}
                </SmartLink>
              )}
            </div>
          )}
        </motion.div>

        {/* Extra content (stats bar, search, etc.) */}
        {children && <div className="mt-12">{children}</div>}
      </Container>
    </section>
  );
}
