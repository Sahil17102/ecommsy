import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Container } from "./Container";
import { SmartLink } from "./SmartLink";
import { scrollFadeUp } from "@/config/animations";

interface CtaBannerProps {
  title: ReactNode;
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

export function CtaBanner({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
}: CtaBannerProps) {
  return (
    <section className="section-dark relative py-20 sm:py-28">
      <Container maxWidth="lg" className="relative z-10">
        <motion.div {...scrollFadeUp} className="text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
            {title}
          </h2>
          <p className="text-base sm:text-lg text-white/55 max-w-lg mx-auto mb-8 leading-relaxed">
            {subtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <SmartLink
              href={primaryCta.href}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-all no-underline shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
            >
              {primaryCta.label}
              <ArrowRight className="w-4 h-4" />
            </SmartLink>
            {secondaryCta && (
              <SmartLink
                href={secondaryCta.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white border border-white/20 hover:bg-white/10 rounded-lg transition-all no-underline"
              >
                {secondaryCta.label}
              </SmartLink>
            )}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
