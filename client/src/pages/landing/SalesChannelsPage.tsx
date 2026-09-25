import { motion } from "framer-motion";
import {
  RefreshCw,
  PackageCheck,
  Layers,
  RotateCcw,
  Link2,
  Settings,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Container, PageHero, CtaBanner } from "@/components/common";
import { scrollFadeUp, staggeredChild } from "@/config/animations";
import { BrandLogo } from "@/components/BrandLogos";


const channels = [
  {
    name: "Amazon",
    color: "#FF9900",
    domain: "amazon.com",
    description:
      "Sync Amazon Seller Central orders automatically. Manage FBA and FBM shipments from one place.",
    features: [
      "Auto order import",
      "FBA/FBM support",
      "Returns sync",
      "Inventory update",
    ],
  },
  {
    name: "Flipkart",
    color: "#2874F0",
    domain: "flipkart.com",
    description:
      "Connect your Flipkart seller account for seamless order sync, label generation, and dispatch.",
    features: [
      "One-click connect",
      "Smart dispatch",
      "SLA tracking",
      "Auto manifest",
    ],
  },
  {
    name: "Shopify",
    color: "#96BF48",
    domain: "shopify.com",
    description:
      "Install our Shopify app and start shipping within minutes. Full order lifecycle management.",
    features: [
      "Shopify app",
      "Order webhooks",
      "Tracking page",
      "Discount rates",
    ],
  },
  {
    name: "WooCommerce",
    color: "#96588A",
    domain: "woocommerce.com",
    description:
      "WordPress + WooCommerce integration with a simple plugin. Works with all major themes.",
    features: [
      "WP plugin",
      "REST API sync",
      "Custom fields",
      "Multi-site ready",
    ],
  },
  {
    name: "Magento",
    color: "#EE672F",
    domain: "magento.com",
    description:
      "Enterprise-grade Magento integration for high-volume stores with complex fulfillment needs.",
    features: [
      "Magento 2 extension",
      "Multi-store",
      "Custom workflows",
      "Bulk import",
    ],
  },
  {
    name: "OpenCart",
    color: "#23A8E0",
    domain: "opencart.com",
    description:
      "Lightweight OpenCart module for quick setup. Sync orders and manage shipments effortlessly.",
    features: [
      "Quick install",
      "Order auto-sync",
      "Shipping calculator",
      "Status updates",
    ],
  },
];

const benefits = [
  {
    icon: <RefreshCw className="w-6 h-6" />,
    title: "Automatic Order Sync",
    description:
      "New orders flow into your Searchcraft dashboard the moment they're placed — zero manual work.",
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: "Real-Time Inventory",
    description:
      "Stock levels sync across every channel instantly, preventing overselling and stock-outs.",
  },
  {
    icon: <PackageCheck className="w-6 h-6" />,
    title: "Bulk Processing",
    description:
      "Process hundreds of orders in minutes with one-click label generation and manifest creation.",
  },
  {
    icon: <RotateCcw className="w-6 h-6" />,
    title: "Returns Management",
    description:
      "Handle returns from all channels in one unified view with automated reverse logistics.",
  },
];

const steps = [
  {
    icon: <Link2 className="w-5 h-5" />,
    title: "Select Channel",
    description: "Choose from our supported sales channels and click connect.",
  },
  {
    icon: <Settings className="w-5 h-5" />,
    title: "Authorize Access",
    description:
      "Securely authorize Searchcraft to sync your orders and inventory.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Start Shipping",
    description:
      "Orders start flowing in automatically. You're ready to ship!",
  },
];


export function SalesChannelsPage() {
  return (
    <>
      {/* ━━━ HERO ━━━ */}
      <PageHero
        badge="Sales Channels"
        badgeVariant="primary"
        title={
          <>
            Connect{" "}
            <span className="text-gradient-primary">Every Sales Channel</span>{" "}
            in One Click
          </>
        }
        subtitle="Automatically sync orders from Amazon, Flipkart, Shopify, and more. No manual data entry, no missed orders — ever."
        primaryCta={{ label: "Get Started Free", href: "/signup" }}
        secondaryCta={{ label: "View All Integrations", href: "/integrations/courier-partners" }}
      />

      {/* ━━━ CHANNEL CARDS ━━━ */}
      <section className="py-16 sm:py-24 bg-white">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-accent bg-accent-bg rounded-full mb-4">
              Supported Channels
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Sell anywhere,{" "}
              <span className="text-gradient-accent">ship from one place</span>
            </h2>
            <p className="text-muted max-w-xl mx-auto leading-relaxed">
              One-click integrations with India's top marketplaces and
              e-commerce platforms.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {channels.map((ch, i) => (
              <motion.div key={ch.name} {...staggeredChild(i)}>
                <div className="group relative bg-background border border-border-light rounded-xl overflow-hidden hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all h-full">
                  {/* Color accent top bar */}
                  <div
                    className="h-1"
                    style={{ backgroundColor: ch.color }}
                  />

                  <div className="p-6 sm:p-7">
                    {/* Channel header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-gray-50 transition-transform group-hover:scale-105"
                      >
                        <BrandLogo domain={ch.domain} name={ch.name} color={ch.color} size={34} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {ch.name}
                        </h3>
                      </div>
                    </div>

                    <p className="text-sm text-muted leading-relaxed mb-5">
                      {ch.description}
                    </p>

                    {/* Feature tags */}
                    <div className="flex flex-wrap gap-2">
                      {ch.features.map((feat) => (
                        <span
                          key={feat}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-foreground/70 bg-white border border-border-light rounded-md"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ BENEFITS ━━━ */}
      <section className="py-16 sm:py-24 bg-background">
        <Container maxWidth="xl">
          <motion.div {...scrollFadeUp} className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary-bg rounded-full mb-4">
              Benefits
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Why sellers love our{" "}
              <span className="text-gradient-primary">integrations</span>
            </h2>
            <p className="text-muted max-w-xl mx-auto leading-relaxed">
              Spend less time on operations and more time growing your business.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
            {benefits.map((b, i) => (
              <motion.div key={b.title} {...staggeredChild(i)}>
                <div className="group flex gap-5 bg-white border border-border-light rounded-xl p-6 sm:p-7 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 transition-all h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">
                      {b.title}
                    </h3>
                    <p className="text-sm text-muted leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ━━━ HOW IT WORKS ━━━ */}
      <section className="py-16 sm:py-24 bg-white">
        <Container maxWidth="lg">
          <motion.div {...scrollFadeUp} className="text-center mb-12 sm:mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-accent bg-accent-bg rounded-full mb-4">
              How It Works
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Go live in{" "}
              <span className="text-gradient-accent">3 easy steps</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                {...staggeredChild(i, 0.15)}
                className="relative"
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+28px)] right-0 h-[2px] bg-gradient-to-r from-primary/20 to-accent/20" />
                )}

                <div className="flex flex-col items-center text-center">
                  <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20 mb-4">
                    {i + 1}
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed max-w-xs">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Centered CTA */}
          <motion.div
            {...scrollFadeUp}
            className="text-center mt-12 sm:mt-16"
          >
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-all no-underline shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35"
            >
              Connect Your Store
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </Container>
      </section>

      {/* ━━━ CTA BANNER ━━━ */}
      <CtaBanner
        title={
          <>
            Ready to connect
            <br />
            your sales channels?
          </>
        }
        subtitle="Start syncing orders from all your marketplaces in under 5 minutes. No technical setup required."
        primaryCta={{ label: "Start Free Trial", href: "/signup" }}
        secondaryCta={{ label: "View Courier Partners", href: "/integrations/courier-partners" }}
      />
    </>
  );
}
