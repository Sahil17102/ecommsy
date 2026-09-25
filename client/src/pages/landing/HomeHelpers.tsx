import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { animationConfig } from "@/config/animations";
import { BrandLogo, type BrandEntry } from "@/components/BrandLogos";
import { rotatingWords } from "./homeData";

export function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="inline-flex items-baseline">
      <AnimatePresence mode="wait">
        <motion.span
          key={rotatingWords[index]}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.35, ease: animationConfig.ease.out }}
          className="text-gradient-accent inline-block"
        >
          {rotatingWords[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Marquee({
  items,
  direction = "left",
  speed = 35,
}: {
  items: BrandEntry[];
  direction?: "left" | "right";
  speed?: number;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden">
      <div
        className={`flex gap-6 ${direction === "left" ? "marquee-left" : "marquee-right"}`}
        style={{ "--marquee-duration": `${speed}s` } as React.CSSProperties}
      >
        {doubled.map((item, i) => (
          <div
            key={`${item.name}-${i}`}
            className="shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl bg-white border border-border-light hover:border-primary/20 hover:shadow-md transition-all cursor-default"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              <BrandLogo domain={item.domain} name={item.name} color={item.color} size={28} />
            </div>
            <span className="text-sm font-semibold text-foreground/70 whitespace-nowrap tracking-tight">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
