"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Package,
  Layers,
  Wallet,
  BarChart3,
  Truck,
  Headphones,
  Check,
  Plus,
  Minus,
  Search,
  ShieldCheck,
  Globe2,
} from "lucide-react";
import { authUrl, Cta } from "./SiteChrome";
import { tracePointer } from "./tracePointer";
const Scene = dynamic(() => import("./ShippingScene"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading">Preparing your next delivery...</div>
  ),
});
export const features = [
  {
    icon: Layers,
    title: "More orders. Less busywork.",
    text: "Import orders, print labels and arrange pickups from one workspace.",
    slug: "ecommerce",
  },
  {
    icon: Truck,
    title: "The right courier, every time.",
    text: "Compare shipping options for the route, weight and service you need.",
    slug: "ecommerce",
  },
  {
    icon: Wallet,
    title: "Keep your cash moving.",
    text: "Follow COD collections and remittances alongside your shipments.",
    slug: "ecommerce",
  },
  {
    icon: BarChart3,
    title: "Clarity in every delivery.",
    text: "Get a connected view of delivery performance, costs and returns.",
    slug: "b2b",
  },
  {
    icon: Package,
    title: "Returns without the runaround.",
    text: "Keep return orders and delivery exceptions in the same place.",
    slug: "returns",
  },
  {
    icon: Headphones,
    title: "A partner in your corner.",
    text: "Get help with your shipping questions through the seller support panel.",
    slug: "returns",
  },
];
const channels = [
  {
    name: "Shopify",
    detail: "Bring storefront orders into one shipping workflow.",
    initials: "S",
  },
  {
    name: "WooCommerce",
    detail: "Keep your store and dispatch operations connected.",
    initials: "W",
  },
  {
    name: "Amazon",
    detail: "See marketplace orders beside your other shipments.",
    initials: "A",
  },
  {
    name: "Flipkart",
    detail: "Manage eligible marketplace dispatches in one view.",
    initials: "F",
  },
  {
    name: "Meesho",
    detail: "Give multichannel selling a clearer shipping process.",
    initials: "M",
  },
  {
    name: "Your own store",
    detail: "Create orders manually or bring them in by spreadsheet.",
    initials: "+",
  },
];
const couriers = [
  ["DELHIVERY.", "delhivery"],
  ["Blue Dart", "bluedart"],
  ["Xpressbees", "xpress"],
  ["DTDC", "dtdc"],
  ["ekart", "ekart"],
];
const faqs = [
  [
    "How do I get started?",
    "Create your account, complete your business and KYC details, add a pickup address and choose an available courier for your first order.",
  ],
  [
    "Can I ship both prepaid and COD orders?",
    "Yes. Select prepaid or cash on delivery when creating an order. COD availability and fees depend on the courier and destination.",
  ],
  [
    "How is shipping weight calculated?",
    "Couriers generally charge the higher of actual weight and volumetric weight. Our weight estimator shows both; the applicable divisor and minimum slab depend on your courier.",
  ],
  [
    "Can I connect my online store?",
    "The platform includes sales-channel integrations so you can manage orders alongside manual and bulk uploads. Check available connections in your seller account.",
  ],
  [
    "Where can I track my shipment?",
    "Use Track order with your AWB number or order ID. Updates are displayed as they become available from the courier.",
  ],
];
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="faq-band">
      <div className="section wrap faq-section">
        <div>
          <p className="eyebrow">A LITTLE MORE CLARITY</p>
          <h2>
            Good questions.
            <br />
            Straight answers.
          </h2>
          <p>Still curious about something?</p>
          <Link className="text-link" href="/contact">
            Talk to our team <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          {faqs.map(([q, a], i) => (
            <div className="faq" key={q}>
              <button
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
              >
                {q}
                {open === i ? <Minus size={18} /> : <Plus size={18} />}
              </button>
              {open === i && <p>{a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default function Home() {
  const [awb, setAwb] = useState("");
  const [activeChannel, setActiveChannel] = useState(0);
  return (
    <>
      <section className="hero">
        <div className="wrap hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> BUILT FOR BUSINESSES GOING PLACES
            </p>
            <h1>
              Box & Beyond
              <span>
                Moving more
                <br />
                possibilities.
              </span>
            </h1>
            <p className="hero-description">
              Your ambition goes beyond a box.
              <br />
              Your shipping partner should, too.
            </p>
            <p className="hero-detail">
              Connect your stores, find the right courier and make every
              delivery a reason to come back.
            </p>
            <div className="button-row">
              <a href={authUrl} className="button">
                Start shipping <ArrowUpRight size={19} />
              </a>
              <Link
                href="/resources/rate-calculator"
                className="button outline"
              >
                Explore shipping rates <ArrowRight size={18} />
              </Link>
            </div>
            <div className="hero-assurance">
              <span>
                <Check size={14} /> One connected platform
              </span>
              <span>
                <Check size={14} /> Built for your growth
              </span>
            </div>
          </div>
          <Scene />
        </div>
        <div className="wrap quick-track">
          <div>
            <Package size={21} />
            <strong>Something good on its way?</strong>
            <span>Follow your box, every step.</span>
          </div>
          <form action="/track">
            <label className="sr-only" htmlFor="home-awb">
              AWB or order ID
            </label>
            <input
              id="home-awb"
              name="q"
              required
              maxLength={80}
              placeholder="Enter AWB / order ID"
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
            />
            <button aria-label="Track shipment" type="submit">
              Track shipment <ArrowRight size={17} />
            </button>
          </form>
        </div>
      </section>
      <section className="partners-strip wrap">
        <p>
          YOUR FAVOURITE COURIERS.
          <br />
          <strong>ONE CONNECTED WORKSPACE.</strong>
        </p>
        <div className="courier-marquee" aria-label="Courier partners">
          <div className="courier-track">
            {[0, 1].map((copy) => (
              <div className="courier-set" key={copy} aria-hidden={copy === 1}>
                {couriers.map(([name, style]) => (
                  <Link
                    className={`courier ${style}`}
                    href="/integrations/courier-partners"
                    key={`${copy}-${name}`}
                    tabIndex={copy === 1 ? -1 : undefined}
                  >
                    {name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section manifest-band">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LESS FRICTION. MORE FORWARD.</p>
              <h2>
                Big ideas deserve
                <br />
                better shipping.
              </h2>
            </div>
            <p>
              From your first order to your busiest season,
              <br />
              everything you need to keep moving.
            </p>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text, slug }, i) => (
              <Link
                href={`/services/${slug}`}
                className="feature interactive-edge"
                key={title}
                onPointerMove={tracePointer}
              >
                <span className="manifest-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className={`feature-icon tone-${i % 3}`}>
                  <Icon size={25} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <ArrowUpRight className="feature-arrow" size={20} />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="operations">
        <div className="wrap operations-grid">
          <div className="photo-panel">
            <img
              src="/parcel-composition.webp"
              alt="Art-directed arrangement of prepared shipping parcels"
              loading="lazy"
            />
            <span className="photo-caption">
              <span className="status-dot" /> FROM YOUR SHELF TO THEIR DOORSTEP
            </span>
          </div>
          <div>
            <p className="eyebrow">ONE PLATFORM. EVERY NEXT STEP.</p>
            <h2>
              A little less logistics.
              <br />A lot more business.
            </h2>
            <p>
              You build the brand. We help you bring it home. Bring your orders,
              couriers and delivery updates together in one clear view.
            </p>
            <ul className="check-list">
              <li>
                <Check />
                Centralise orders across your channels
              </li>
              <li>
                <Check />
                Compare rates before you book
              </li>
              <li>
                <Check />
                Manage NDR, returns and COD
              </li>
              <li>
                <Check />
                Keep your customers in the loop
              </li>
            </ul>
            <Link className="button" href="/platform">
              Explore the platform <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>
      <section className="section process-band">
        <div className="wrap process-layout">
          <div className="section-heading">
            <div>
              <p className="eyebrow">READY. SET. SHIP.</p>
              <h2>
                Your next delivery
                <br />
                starts in three steps.
              </h2>
            </div>
            <a href={authUrl} className="text-link">
              Let's get started <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="steps">
            {[
              [
                "01",
                "Make yourself at home",
                "Create your account and add your business and pickup details.",
              ],
              [
                "02",
                "Bring your orders along",
                "Connect a sales channel, upload a sheet or add an order manually.",
              ],
              [
                "03",
                "Send it beyond",
                "Choose a courier, print your label and get your parcel on its way.",
              ],
            ].map(([n, t, d], i) => (
              <Link
                href={
                  i === 0
                    ? authUrl
                    : i === 1
                      ? "/integrations/sales-channels"
                      : "/platform"
                }
                className="step-row interactive-edge"
                onPointerMove={tracePointer}
                key={n}
              >
                <span className="step-num">{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
                <ArrowUpRight className="step-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="integration-band">
        <div className="wrap integration-inner">
          <div>
            <p className="eyebrow">FITS RIGHT INTO YOUR WORLD</p>
            <h2>
              Your stores.
              <br />
              Together at last.
            </h2>
            <p>More selling. Less switching between tabs.</p>
            <Link href="/integrations/sales-channels" className="text-link">
              Discover integrations <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="channel-selector">
            <div className="channel-rail" aria-label="Sales channels">
              {channels.map((channel, i) => (
                <button
                  type="button"
                  key={channel.name}
                  className={`channel-option interactive-edge ${activeChannel === i ? "active" : ""}`}
                  aria-pressed={activeChannel === i}
                  onPointerMove={tracePointer}
                  onClick={() => setActiveChannel(i)}
                >
                  <span className="channel-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={`channel-symbol channel-${i}`}>
                    {channel.initials}
                  </span>
                  <strong>{channel.name}</strong>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
            <div className="channel-detail" aria-live="polite">
              <span className="eyebrow">
                CHANNEL / {String(activeChannel + 1).padStart(2, "0")}
              </span>
              <h3>{channels[activeChannel].name}</h3>
              <p>{channels[activeChannel].detail}</p>
              <Link href="/integrations/sales-channels" className="text-link">
                View connection options <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="section wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">GOOD TOOLS. BETTER DECISIONS.</p>
            <h2>Know before you send.</h2>
          </div>
          <p>A little planning makes every parcel go further.</p>
        </div>
        <div className="tool-links">
          {[
            [
              Globe2,
              "Find your shipping rate",
              "Check a route and get a live shipping quote.",
              "/resources/rate-calculator",
            ],
            [
              Package,
              "Measure what matters",
              "Calculate volumetric and chargeable weight.",
              "/resources/weight-estimator",
            ],
            [
              Search,
              "Follow every milestone",
              "Find the latest update on your delivery.",
              "/track",
            ],
          ].map(([Icon, t, d, url]: any, i: number) => (
            <Link
              className="tool-link interactive-edge"
              onPointerMove={tracePointer}
              href={url}
              key={t}
            >
              <span className="tool-index">0{i + 1} / TOOL</span>
              <Icon size={28} />
              <h3>{t}</h3>
              <p>{d}</p>
              <span className="text-link">
                Let's go <ArrowUpRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="seller-band">
        <div className="wrap seller-content">
          <ShieldCheck size={38} />
          <p className="eyebrow">BUILT AROUND THE PEOPLE WHO SHIP</p>
          <h2>
            Behind every box,
            <br />
            there's a business going places.
          </h2>
          <p>
            For the independent seller, the growing D2C brand and the team
            managing the next big dispatch. Your next chapter belongs here.
          </p>
          <Link href="/about" className="text-link">
            Get to know Box & Beyond <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <Faq />
      <section className="journal-band">
        <div className="section wrap journal-preview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE SHIPPING JOURNAL</p>
              <h2>Ahead of the next delivery.</h2>
            </div>
            <Link href="/blogs" className="text-link">
              All stories <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="article-grid">
            {[
              [
                "shipping-weight",
                "PACKING SMARTER",
                "Actual vs volumetric weight: what you need to know",
                "/dispatch-scale.webp",
              ],
              [
                "reduce-returns",
                "DELIVERING BETTER",
                "A practical guide to fewer delivery exceptions",
                "/packing-workspace.webp",
              ],
              [
                "first-shipment",
                "GETTING STARTED",
                "Your first shipment, from order to doorstep",
                "/parcel-composition.webp",
              ],
            ].map(([s, k, t, img]) => (
              <Link
                href={`/blogs/${s}`}
                className="article interactive-edge"
                onPointerMove={tracePointer}
                key={s}
              >
                <img src={img} alt={t} loading="lazy" />
                <p className="eyebrow">{k}</p>
                <h3>{t}</h3>
                <span className="text-link">
                  Read story <ArrowUpRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Cta />
    </>
  );
}
