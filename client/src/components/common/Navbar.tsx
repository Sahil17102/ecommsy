import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Menu,
  X,
  ShoppingBag,
  Truck,
  Scale,
  Calculator,
} from "lucide-react";
import { animationConfig } from "@/config/animations";
import { useAuth } from "@/contexts/AuthContext";
import { AppLogo } from "@/components/common/AppLogo";

/* ─── nav data ─── */
interface DropdownItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

interface NavLink {
  label: string;
  href?: string;
  dropdown?: DropdownItem[];
}

const navLinks: NavLink[] = [
  { label: "Platform", href: "/platform" },
  {
    label: "Integrations",
    dropdown: [
      {
        label: "Sales Channels",
        href: "/integrations/sales-channels",
        icon: <ShoppingBag className="w-5 h-5" />,
        description: "Amazon, Flipkart, Shopify & more",
      },
      {
        label: "Courier Partners",
        href: "/integrations/courier-partners",
        icon: <Truck className="w-5 h-5" />,
        description: "BlueDart, Delhivery, DTDC & more",
      },
    ],
  },
  {
    label: "Tools",
    dropdown: [
      {
        label: "Weight Estimator",
        href: "/resources/weight-estimator",
        icon: <Scale className="w-5 h-5" />,
        description: "Calculate volumetric & dead weight",
      },
      {
        label: "Rate Calculator",
        href: "/resources/rate-calculator",
        icon: <Calculator className="w-5 h-5" />,
        description: "Compare shipping rates instantly",
      },
    ],
  },
  { label: "Blogs", href: "/blogs" },
  { label: "Track Shipment", href: "/track" },
];

/* ─── dropdown animation ─── */
const dropdownVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: animationConfig.duration.fast, ease: animationConfig.ease.out },
  },
  exit: {
    opacity: 0,
    y: 4,
    scale: 0.98,
    transition: { duration: 0.15 },
  },
};

const mobileMenuVariants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "spring", damping: 25, stiffness: 300 },
  },
  exit: {
    x: "100%",
    transition: { duration: animationConfig.duration.fast, ease: animationConfig.ease.out },
  },
};

/** Routes that use a dark hero background — navbar starts transparent with white text */
const DARK_HERO_ROUTES = ["/", "/platform"];

/* ─── component ─── */
export function Navbar() {
  const { pathname } = useLocation();
  const hasDarkHero = DARK_HERO_ROUTES.includes(pathname);
  const { user } = useAuth();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const openDropdown = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setActiveDropdown(label);
  };

  const closeDropdown = () => {
    dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  return (
    <>
    <nav
      className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-300 ${
        !hasDarkHero
          ? "bg-white shadow-sm border-b border-border-light"
          : isScrolled
            ? "bg-white/95 glass shadow-sm border-b border-border-light"
            : "bg-transparent"
      }`}
    >
      <div className="max-w-container-xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 lg:h-[4.5rem]">
        {/* ─── Logo ─── */}
        <AppLogo
          textClassName={`transition-colors ${
            isScrolled || !hasDarkHero ? "text-foreground" : "text-white"
          }`}
        />

        {/* ─── Desktop Nav ─── */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) =>
            link.dropdown ? (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => openDropdown(link.label)}
                onMouseLeave={closeDropdown}
              >
                <button
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isScrolled || !hasDarkHero
                      ? "text-foreground/80 hover:text-foreground hover:bg-primary-bg"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.label}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      activeDropdown === link.label ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {activeDropdown === link.label && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-border-light p-2"
                      onMouseEnter={() => openDropdown(link.label)}
                      onMouseLeave={closeDropdown}
                    >
                      {link.dropdown.map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-primary-bg transition-colors no-underline group/item"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary-bg flex items-center justify-center text-primary shrink-0 group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                            {item.icon}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {item.label}
                            </div>
                            <div className="text-xs text-muted mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                key={link.label}
                to={link.href!}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors no-underline ${
                  isScrolled || !hasDarkHero
                    ? "text-foreground/80 hover:text-foreground hover:bg-primary-bg"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* ─── Desktop CTA ─── */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <Link
              to="/home"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors no-underline shadow-sm hover:shadow-md"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              to="/signup"
              target="_blank"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors no-underline shadow-sm hover:shadow-md"
            >
              Sign Up
            </Link>
          )}
        </div>

        {/* ─── Mobile hamburger ─── */}
        <button
          className={`lg:hidden p-2 rounded-md transition-colors ${
            isScrolled || !hasDarkHero ? "text-foreground hover:bg-primary-bg" : "text-white hover:bg-white/10"
          }`}
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

    </nav>

      {/* ─── Mobile Drawer ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-black/40 z-[998] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-[999] shadow-2xl lg:hidden flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 h-16 border-b border-border-light">
                <span className="text-lg font-bold text-foreground">Menu</span>
                <button
                  className="p-2 rounded-md hover:bg-primary-bg text-foreground transition-colors"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer links */}
              <div className="flex-1 overflow-y-auto py-4 px-4">
                {navLinks.map((link) =>
                  link.dropdown ? (
                    <div key={link.label} className="mb-1">
                      <button
                        className="flex items-center justify-between w-full px-3 py-3 text-sm font-medium text-foreground rounded-lg hover:bg-primary-bg transition-colors"
                        onClick={() =>
                          setMobileAccordion(
                            mobileAccordion === link.label ? null : link.label
                          )
                        }
                      >
                        {link.label}
                        <ChevronDown
                          className={`w-4 h-4 text-muted transition-transform ${
                            mobileAccordion === link.label ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {mobileAccordion === link.label && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-3 pb-2">
                              {link.dropdown.map((item) => (
                                <Link
                                  key={item.label}
                                  to={item.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary-bg transition-colors no-underline"
                                >
                                  <div className="w-8 h-8 rounded-md bg-primary-bg flex items-center justify-center text-primary">
                                    {item.icon}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-foreground">
                                      {item.label}
                                    </div>
                                    <div className="text-xs text-muted">
                                      {item.description}
                                    </div>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      key={link.label}
                      to={link.href!}
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-3 text-sm font-medium text-foreground rounded-lg hover:bg-primary-bg transition-colors no-underline mb-1"
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>

              {/* Drawer footer CTA */}
              <div className="p-4 border-t border-border-light">
                {user ? (
                  <Link
                    to="/home"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-5 py-3 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors no-underline"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/signup"
                    target="_blank"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center px-5 py-3 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors no-underline"
                  >
                    Sign Up Free
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
