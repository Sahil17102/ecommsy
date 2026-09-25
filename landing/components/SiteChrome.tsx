"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  Package,
  MoveUpRight,
} from "lucide-react";
export const authUrl = `${process.env.NEXT_PUBLIC_CLIENT_URL || "https://app.boxsbeyond.com"}/signup`;
export const groups = {
  Platform: [
    ["Overview", "/platform"],
    ["Ecommerce shipping", "/services/ecommerce"],
    ["B2B & bulk shipping", "/services/b2b"],
    ["Returns management", "/services/returns"],
  ],
  Integrations: [
    ["Sales channels", "/integrations/sales-channels"],
    ["Courier partners", "/integrations/courier-partners"],
  ],
  Resources: [
    ["Rate calculator", "/resources/rate-calculator"],
    ["Weight estimator", "/resources/weight-estimator"],
    ["Shipping journal", "/blogs"],
  ],
  Company: [
    ["About us", "/about"],
    ["Careers", "/careers"],
    ["Become a partner", "/partners"],
    ["Contact", "/contact"],
  ],
};
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Box and Beyond home">
      <img src="/brand-mark.png" alt="" />
      <span>
        BOX<span className="brand-amp">&</span>BEYOND
        <small>S E R V I C E S</small>
      </span>
    </Link>
  );
}
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const path = usePathname();
  return (
    <>
      <div className="announcement">
        <span>One platform. More possibilities.</span>
        <Link href="/platform">
          Meet your next shipping partner <ArrowUpRight size={13} />
        </Link>
      </div>
      <header>
        <div className="nav-wrap">
          <Brand />
          <button
            className="menu-toggle icon-button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav aria-label="Main navigation" className={open ? "open" : ""}>
            {Object.entries(groups).map(([label, links]) => (
              <div
                key={label}
                className="nav-group"
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setActiveMenu(label);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") setActiveMenu(null);
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                    setActiveMenu(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setActiveMenu(null);
                }}
              >
                <button
                  type="button"
                  className="nav-trigger"
                  aria-expanded={activeMenu === label}
                  aria-controls={`nav-${label.toLowerCase()}`}
                  onClick={() =>
                    setActiveMenu(activeMenu === label ? null : label)
                  }
                >
                  {label}
                  <ChevronDown size={12} />
                </button>
                {activeMenu === label && (
                  <div className="dropdown" id={`nav-${label.toLowerCase()}`}>
                    {links.map(([name, url]) => (
                      <Link
                        key={url}
                        href={url}
                        aria-current={path === url ? "page" : undefined}
                        onClick={() => {
                          setOpen(false);
                          setActiveMenu(null);
                        }}
                      >
                        {name}
                        <ArrowUpRight size={14} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              className="nav-direct"
              href="/track"
              onClick={() => setOpen(false)}
            >
              Track order
            </Link>
            <a href={authUrl} className="login">
              Log in <ArrowUpRight size={14} />
            </a>
            <a href={authUrl} className="button small">
              Start shipping <ArrowUpRight size={15} />
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}
export function Cta() {
  return (
    <section className="cta">
      <div className="wrap cta-inner">
        <div className="cta-main">
          <p className="eyebrow">01 / YOUR NEXT MOVE</p>
          <h2>Make room for what comes next.</h2>
          <p>
            One place for the orders you have and the growth you're planning.
          </p>
        </div>
        <div className="cta-action">
          <span>FROM YOUR FIRST BOX TO YOUR NEXT MILESTONE</span>
          <a className="button light" href={authUrl}>
            Start shipping <ArrowUpRight size={20} />
          </a>
        </div>
      </div>
      <div className="wrap cta-foot">
        <span>PLAN</span>
        <span>PACK</span>
        <span>MOVE</span>
        <span>GROW</span>
      </div>
    </section>
  );
}
export function SiteFooter() {
  return (
    <footer>
      <div className="wrap footer-top">
        <div className="footer-identity">
          <Brand />
          <p>Beyond the box is everything you're building.</p>
          <Link className="footer-contact" href="/contact">
            Talk to us <MoveUpRight size={21} />
          </Link>
        </div>
        <div className="footer-links">
          {Object.entries(groups).map(([title, links]) => (
            <div className="footer-group" key={title}>
              <h3>{title}</h3>
              {links.map(([name, url]) => (
                <Link href={url} key={url}>
                  {name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="wrap footer-statement" aria-hidden="true">
        BOX <span>&amp;</span> BEYOND
      </div>
      <div className="wrap footer-bottom">
        <span>&copy; {new Date().getFullYear()} Box & Beyond Services</span>
        <div>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms of service</Link>
          <Link href="/track">
            <Package size={16} /> Track a shipment
          </Link>
        </div>
        <a href="#main">
          Back to top <ArrowRight size={16} />
        </a>
      </div>
    </footer>
  );
}
