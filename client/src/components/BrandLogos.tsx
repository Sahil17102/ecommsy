import { useBrandLogo } from "@/queries/useBrandLogo";

// ── Types ─────────────────────────────────────────────────
export type BrandEntry = {
  name: string;
  color: string;
  domain: string;
  category: "courier" | "channel";
};

// ── Shared logo component with fallback ─────────────────
export function BrandLogo({
  domain,
  name,
  color,
  size = 20,
  className = "",
}: {
  domain: string;
  name: string;
  color: string;
  size?: number;
  className?: string;
}) {
  const { data: src, isError } = useBrandLogo(domain, size * 2);

  if (isError || (!src && isError)) {
    return (
      <span
        className={`rounded-full shrink-0 flex items-center justify-center text-white font-bold ${className}`}
        style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.45 }}
      >
        {name.charAt(0)}
      </span>
    );
  }

  if (!src) {
    // loading — render a placeholder the same size to avoid layout shift
    return (
      <span
        className={`shrink-0 rounded-full bg-gray-100 animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// ── Data ──────────────────────────────────────────────────
export const courierPartnerBrands: BrandEntry[] = [
  { name: "BlueDart", color: "#003399", domain: "bluedart.com", category: "courier" },
  { name: "Delhivery", color: "#D42F2F", domain: "delhivery.com", category: "courier" },
  { name: "DTDC", color: "#E31E24", domain: "dtdc.in", category: "courier" },
  { name: "XpressBees", color: "#F5A623", domain: "xpressbees.com", category: "courier" },
  { name: "Ekart", color: "#2874F0", domain: "ekartlogistics.com", category: "courier" },
  { name: "Shadowfax", color: "#5C2D91", domain: "shadowfax.in", category: "courier" },
];

export const salesChannelBrands: BrandEntry[] = [
  { name: "Amazon", color: "#FF9900", domain: "amazon.com", category: "channel" },
  { name: "Flipkart", color: "#2874F0", domain: "flipkart.com", category: "channel" },
  { name: "Shopify", color: "#96BF48", domain: "shopify.com", category: "channel" },
  { name: "WooCommerce", color: "#96588A", domain: "woocommerce.com", category: "channel" },
  { name: "OpenCart", color: "#23A8E0", domain: "opencart.com", category: "channel" },
  { name: "Meesho", color: "#F43397", domain: "meesho.com", category: "channel" },
];

export const allBrands: BrandEntry[] = [
  ...courierPartnerBrands,
  ...salesChannelBrands,
];
