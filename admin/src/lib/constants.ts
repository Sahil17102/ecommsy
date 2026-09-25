/* ─── Regex Patterns ─── */

export const regex = {
  /** 15-character Indian GSTIN format: 22AAAAA0000A1Z5 */
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/,
  /** 6-digit Indian pincode */
  pincode: /^\d{6}$/,
  /** 10-digit Indian phone number */
  phone: /^\d{10}$/,
  /** Digits only (zero or more) */
  digitsOnly: /^\d*$/,
} as const;

/* ─── Service Provider Colors ─── */

export interface ServiceProviderVariant {
  label: string;
  /** Ant Design preset Tag color */
  color: string;
  /** Tailwind classes for custom badge styling */
  badgeClass: string;
}

/**
 * Color mapping for each service provider slug.
 * Used consistently across all admin tables/badges.
 */
export const SERVICE_PROVIDER_VARIANTS: Record<string, ServiceProviderVariant> = {
  delhivery: {
    label: "Delhivery",
    color: "red",
    badgeClass: "bg-red-500/[0.08] text-red-600 border border-red-500/15",
  },
  xpressbees: {
    label: "Xpressbees",
    color: "gold",
    badgeClass: "bg-violet-500/[0.08] text-violet-600 border border-violet-500/15",
  },
  ekart: {
    label: "Ekart",
    color: "blue",
    badgeClass: "bg-blue-500/[0.08] text-blue-600 border border-blue-500/15",
  },
  dpworld: {
    label: "DP World",
    color: "cyan",
    badgeClass: "bg-cyan-500/[0.08] text-cyan-600 border border-cyan-500/15",
  },
  shipexindia: {
    label: "Shipex India",
    color: "green",
    badgeClass: "bg-emerald-500/[0.08] text-emerald-600 border border-emerald-500/15",
  },
  manual: {
    label: "Manual",
    color: "purple",
    badgeClass: "bg-purple-500/[0.08] text-purple-600 border border-purple-500/15",
  },
  dtdc: {
    label: "DTDC",
    color: "purple",
    badgeClass: "bg-purple-500/[0.08] text-purple-600 border border-purple-500/15",
  },
} as const;

/** Fallback variant for unknown providers */
export const SP_FALLBACK_VARIANT: ServiceProviderVariant = {
  label: "Unknown",
  color: "default",
  badgeClass: "bg-surface-muted text-muted border border-border-light",
};

/** Get the variant for a provider slug, with fallback */
export function getSpVariant(slug: string): ServiceProviderVariant {
  return SERVICE_PROVIDER_VARIANTS[slug] ?? SP_FALLBACK_VARIANT;
}
