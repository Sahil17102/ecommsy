/**
 * Seller-facing brand registry, keyed by service-provider slug.
 *
 * `serviceProviders.name` is an *account* label (e.g. "DTDC-SL2850",
 * "Expressbees-2") and should not be shown to sellers. This map gives the
 * canonical brand name + logo so two accounts under the same brand collapse
 * into one display (both "DTDC-SL2850" and "DTDC-SL1404" → "DTDC").
 *
 * Add a row here when you onboard a new provider slug.
 */
export interface CourierBrand {
  name: string;
  logoUrl: string;
}

export const COURIER_BRANDS: Record<string, CourierBrand> = {
  delhivery: {
    name: "Delhivery",
    logoUrl:
      "https://images.seeklogo.com/logo-png/35/2/delhivery-logo-png_seeklogo-356432.png",
  },
  xpressbees: {
    name: "Xpressbees",
    logoUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5DIXyf1ksuooW7rnfX-uTaCVtR-nM4Zpfqg&s",
  },
  "expressbees-2": {
    name: "Xpressbees",
    logoUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5DIXyf1ksuooW7rnfX-uTaCVtR-nM4Zpfqg&s",
  },
  "dtdc-2": {
    name: "DTDC",
    logoUrl: "https://www.dtdc.com/wp-content/uploads/2025/08/favicon.png",
  },
  ekart: {
    name: "Ekart",
    logoUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRK3lx8d1DCKOUDLv7JcswXAYCAXLPbiGS4gw&s",
  },
  dpworld: {
    name: "DP World",
    logoUrl:
      "https://cdn.brandfetch.io/idDcPWYKZz/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1772442687464",
  },
  shipexindia: {
    name: "Shipex India",
    logoUrl:
      "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://shipexindia.com&size=128",
  },
  dtdc: {
    name: "DTDC",
    logoUrl: "https://www.dtdc.com/wp-content/uploads/2025/08/favicon.png",
  },
  dreamz: {
    name: "Dreamz Services",
    logoUrl: "https://dreamzservices.in/favicon.png",
  },
};

export function brandFor(slug: string): CourierBrand {
  const hit = COURIER_BRANDS[slug];
  if (hit) return hit;
  // Fallback: title-case the slug, no logo. Keeps the UI from showing raw kebab.
  const name = slug
    .split(/[-_\s]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
  return { name, logoUrl: "" };
}
