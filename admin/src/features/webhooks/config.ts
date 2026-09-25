import type { DeliveryStatus } from "./types";

/** Ant Design Tag colour + label per delivery status. */
export const STATUS_META: Record<DeliveryStatus, { label: string; color: string; hint: string }> = {
  success: {
    label: "Delivered",
    color: "green",
    hint: "The seller's endpoint returned a 2xx.",
  },
  pending: {
    label: "Retrying",
    color: "purple",
    hint: "The attempt failed and is queued for another try.",
  },
  retrying: {
    label: "Sending",
    color: "blue",
    hint: "An attempt is in flight right now.",
  },
  failed: {
    label: "Failed",
    color: "red",
    hint: "All 5 attempts were used up. Nothing will be sent unless it is redelivered.",
  },
};

export const STATUS_OPTIONS = [
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Retrying" },
  { value: "retrying", label: "Sending" },
  { value: "success", label: "Delivered" },
];

export const WINDOW_OPTIONS = [
  { value: 1, label: "Last hour" },
  { value: 24, label: "Last 24 hours" },
  { value: 168, label: "Last 7 days" },
  { value: 720, label: "Last 30 days" },
];

export const MAX_ATTEMPTS = 5;

/** Compact label for a rolling window, e.g. 24 -> "24h", 168 -> "7d". */
export function windowLabel(hours: number): string {
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** Industry acronyms that must not be sentence-cased into "Ndr" / "Rto". */
const ACRONYMS = new Set(["ndr", "rto", "awb", "cod"]);

/** "order.out_for_delivery" → "Out for delivery"; "order.rto_delivered" → "RTO delivered". */
export function eventLabel(event: string): string {
  const bare = event.replace(/^order\./, "").replace(/^webhook\./, "");
  const words = bare.split("_").map((word, index) => {
    if (ACRONYMS.has(word)) return word.toUpperCase();
    return index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  });
  return words.join(" ");
}

/**
 * Turns a raw failure into something an admin can act on without reading
 * transport internals.
 */
export function explainFailure(error: string | null, responseStatus: number | null): string | null {
  if (!error && responseStatus == null) return null;

  if (responseStatus != null && responseStatus >= 500) {
    return "The seller's server errored. Usually theirs to fix — ask them to check their logs.";
  }
  if (responseStatus === 404 || responseStatus === 410) {
    return "The URL does not exist any more. The seller needs to update or delete this endpoint.";
  }
  if (responseStatus === 401 || responseStatus === 403) {
    return "The endpoint rejected us as unauthorised — often a signature check failing after a secret rotation.";
  }
  if (responseStatus != null && responseStatus >= 300 && responseStatus < 400) {
    return "The endpoint redirected. We do not follow redirects — the seller must register the final URL.";
  }
  if (responseStatus != null && responseStatus >= 400) {
    return "The endpoint rejected the request. Check the response body below for their reason.";
  }

  const text = (error ?? "").toLowerCase();
  if (text.includes("timeout") || text.includes("etimedout") || text.includes("aborted")) {
    return "The endpoint did not answer within 10 seconds. Ask the seller to acknowledge first and process afterwards.";
  }
  if (text.includes("enotfound") || text.includes("eai_again")) {
    return "The hostname does not resolve. The domain is wrong, expired, or DNS is down.";
  }
  if (text.includes("econnrefused")) {
    return "Nothing is listening on that host and port.";
  }
  if (text.includes("certificate") || text.includes("altnames") || text.includes("ssl")) {
    return "The TLS certificate could not be verified — expired or wrong domain.";
  }
  return null;
}
