import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, ArrowRight, Check, Package } from "lucide-react";
import { pages, articles } from "../../lib/content";
import { authUrl, Cta } from "../../components/SiteChrome";
import { Faq } from "../../components/Home";
import ShippingTools from "../../components/ShippingTools";
import ContactForm from "../../components/ContactForm";
const tools: Record<
  string,
  {
    kind: "track" | "rate" | "weight";
    title: string;
    tag: string;
    description: string;
  }
> = {
  track: {
    kind: "track",
    tag: "SHIPMENT TRACKING",
    title: "Good things are on their way.",
    description:
      "From the first pickup to the final doorstep. Follow your delivery here.",
  },
  "resources/rate-calculator": {
    kind: "rate",
    tag: "SHIPPING RATE CALCULATOR",
    title: "Make your next move count.",
    description: "Check a live shipping quote before you send.",
  },
  "resources/weight-estimator": {
    kind: "weight",
    tag: "VOLUMETRIC WEIGHT CALCULATOR",
    title: "Measure once. Ship smarter.",
    description:
      "Know your actual, volumetric and chargeable weight before booking.",
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join("/");
  return {
    title:
      pages[path]?.title ||
      tools[path]?.tag ||
      articles.find((a) => path === `blogs/${a.slug}`)?.title ||
      path[0].toUpperCase() + path.slice(1),
  };
}
function Intro({
  tag,
  title,
  description,
}: {
  tag: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page-intro-band">
      <div className="page-intro wrap">
        <p className="eyebrow">{tag}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = slug.join("/");
  const alias: Record<string, string> = {
    tracking: "/track",
    "rate-calculator": "/resources/rate-calculator",
    "weight-calculator": "/resources/weight-estimator",
    Contact: "/contact",
    signup: authUrl,
    login: authUrl,
  };
  if (alias[path]) redirect(alias[path]);
  if (tools[path]) {
    const t = tools[path];
    return (
      <>
        <Intro {...t} />
        <section className="wrap tool-section">
          <ShippingTools key={path} kind={t.kind} />
        </section>
        <Faq />
        <Cta />
      </>
    );
  }
  if (path === "contact")
    return (
      <>
        <Intro
          tag="LET'S TALK"
          title="People behind the parcels."
          description="Shipping questions, business opportunities or your next big idea. Let's find the right next step."
        />
        <section className="wrap tool-section">
          <ContactForm />
        </section>
      </>
    );
  if (path === "blogs")
    return (
      <>
        <Intro
          tag="THE SHIPPING JOURNAL"
          title="A little insight. A long way."
          description="Practical reading for the business behind the box."
        />
        <section className="wrap section article-grid">
          {articles.map((a) => (
            <Link href={`/blogs/${a.slug}`} className="article" key={a.slug}>
              <img src={a.image} alt="" />
              <p className="eyebrow">{a.tag}</p>
              <h2>{a.title}</h2>
              <p>{a.intro}</p>
              <span className="text-link">
                Read story <ArrowUpRight size={17} />
              </span>
            </Link>
          ))}
        </section>
        <Cta />
      </>
    );
  const article = articles.find((a) => path === `blogs/${a.slug}`);
  if (article)
    return (
      <>
        <article className="wrap reading">
          <Link href="/blogs" className="text-link">
            Back to journal <ArrowRight size={16} />
          </Link>
          <p className="eyebrow">{article.tag} / 4 MIN READ</p>
          <h1>{article.title}</h1>
          <p className="lead">{article.intro}</p>
          <img
            className="article-cover"
            src={article.image}
            alt="Parcel preparation and shipping"
          />
          {article.sections.map(([h, p]) => (
            <section key={h}>
              <h2>{h}</h2>
              <p>{p}</p>
            </section>
          ))}
          <Link className="button" href="/resources/weight-estimator">
            Try the weight estimator <ArrowUpRight size={18} />
          </Link>
        </article>
        <Cta />
      </>
    );
  if (path === "privacy" || path === "terms")
    return (
      <article className="wrap reading">
        <p className="eyebrow">BOX & BEYOND SERVICES</p>
        <h1>{path === "privacy" ? "Privacy policy" : "Terms of service"}</h1>
        <p className="lead">
          Information about using this website and the seller platform.
        </p>
        {(path === "privacy"
          ? [
              [
                "Information you provide",
                "Account details, business information and shipment information are used to provide the seller service. Avoid including unnecessary personal or sensitive information in support requests.",
              ],
              [
                "Shipment information",
                "Delivery details may need to be shared with the courier selected for an order. Public tracking is intended to show shipment progress, rather than full personal addresses or contact details.",
              ],
              [
                "Cookies and account access",
                "The seller panel uses account session information to keep you signed in. You can manage browser storage through your browser settings.",
              ],
              [
                "Privacy requests",
                "Use seller support to ask about access to, correction of or deletion of your account information. Retention requirements may apply to shipping and transaction records.",
              ],
            ]
          : [
              [
                "Using the service",
                "Provide accurate account, package and recipient details. Courier availability and pricing depend on the selected service and route.",
              ],
              [
                "Rates and measurements",
                "Displayed quotes may change based on final measured weight, dimensions, applicable charges and your account terms. Verify the final amount before booking.",
              ],
              [
                "Shipment restrictions",
                "You are responsible for checking courier restrictions and ensuring that the contents may lawfully be transported.",
              ],
              [
                "Delivery and support",
                "Delivery estimates depend on the courier and operational conditions. Raise shipment issues through seller support with the relevant order reference.",
              ],
            ]
        ).map(([h, p]) => (
          <section key={h}>
            <h2>{h}</h2>
            <p>{p}</p>
          </section>
        ))}
        <p>
          For questions about your account,{" "}
          <a href={authUrl}>contact seller support</a>.
        </p>
      </article>
    );
  const data = pages[path];
  if (!data) notFound();
  return (
    <>
      <Intro {...data} />
      {data.image && (
        <div className="wrap wide-photo">
          <img src={data.image} alt={data.title} />
          <span>BOX & BEYOND / MOVING MORE POSSIBILITIES</span>
        </div>
      )}
      <section className="section wrap detail-grid">
        {data.items.map(([title, description], i) => (
          <div key={title}>
            <span className="detail-index">0{i + 1}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        ))}
      </section>
      <section className="wrap inline-cta">
        <div>
          <Package size={26} />
          <h2>Ready for your next step?</h2>
        </div>
        <Link
          href={
            path === "careers" || path === "partners" ? "/contact" : authUrl
          }
          className="button"
        >
          {path === "careers" || path === "partners"
            ? "Get in touch"
            : "Open your account"}
          <ArrowUpRight size={18} />
        </Link>
      </section>
      <Faq />
      <Cta />
    </>
  );
}
