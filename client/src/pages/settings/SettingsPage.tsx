import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { animationConfig } from "@/config/animations";
import { settingsSections } from "./settingsConfig";
import type { SettingsItem, SettingsSection } from "./settingsConfig";

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: (sectionIndex: number) => ({
    opacity: 1,
    transition: {
      delay: sectionIndex * 0.1,
      staggerChildren: animationConfig.stagger.normal,
    },
  }),
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.ease.out,
    },
  },
};

function SettingsCard({ item }: { item: SettingsItem }) {
  const Icon = item.icon;

  return (
    <motion.div variants={cardVariants} className="h-full">
      <Link
        to={item.href}
        className="group flex h-full items-center gap-4 rounded-xl border border-border-light bg-background-elevated p-5 no-underline transition-all duration-200 hover:border-primary/20 hover:shadow-[0_2px_12px_rgba(108,92,231,0.08)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {item.description}
          </p>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-muted/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
      </Link>
    </motion.div>
  );
}

function SettingsGroup({
  section,
  index,
}: {
  section: SettingsSection;
  index: number;
}) {
  return (
    <motion.section
      custom={index}
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
        {section.title}
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item) => (
          <SettingsCard key={item.title} item={item} />
        ))}
      </div>
    </motion.section>
  );
}

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page heading */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted">
          Manage your account, shipment preferences, and integrations.
        </p>
      </motion.div>

      {/* Sections */}
      {settingsSections.map((section, i) => (
        <SettingsGroup key={section.title} section={section} index={i} />
      ))}
    </div>
  );
}
