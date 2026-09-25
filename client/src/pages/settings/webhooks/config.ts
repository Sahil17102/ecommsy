import { CheckCircle2, Clock, RefreshCw, XCircle, type LucideIcon } from "lucide-react";
import type { DeliveryStatus, WebhookEventName } from "./types";

/**
 * The order statuses that arrive as webhook events, in lifecycle order.
 * Every endpoint receives all of them — this list is for display only.
 */
export const LIFECYCLE_EVENTS: Array<{ event: WebhookEventName; label: string; hint: string }> = [
  { event: "order.created", label: "Created", hint: "Order accepted and stored" },
  { event: "order.booked", label: "Booked", hint: "Courier confirmed, AWB assigned" },
  { event: "order.pickup_initiated", label: "Pickup initiated", hint: "Manifested, pickup raised" },
  { event: "order.shipped", label: "Picked up", hint: "Courier collected the parcel" },
  { event: "order.in_transit", label: "In transit", hint: "Moving between facilities" },
  { event: "order.out_for_delivery", label: "Out for delivery", hint: "With the delivery agent" },
  { event: "order.delivered", label: "Delivered", hint: "Handed to the buyer" },
  { event: "order.ndr", label: "NDR", hint: "A delivery attempt failed" },
  { event: "order.rto_initiated", label: "RTO initiated", hint: "Return leg started" },
  { event: "order.rto_in_transit", label: "RTO in transit", hint: "On the way back to you" },
  { event: "order.rto_delivered", label: "RTO delivered", hint: "Back with you" },
  { event: "order.cancelled", label: "Cancelled", hint: "Order cancelled" },
  { event: "order.lost", label: "Lost", hint: "Reported lost or damaged" },
];

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

export interface StatusPresentation {
  label: string;
  /** What this state means for the seller, in plain words. */
  hint: string;
  icon: LucideIcon;
  text: string;
  bg: string;
  border: string;
  dot: string;
}

export const DELIVERY_STATUS: Record<DeliveryStatus, StatusPresentation> = {
  success: {
    label: "Delivered",
    hint: "Your endpoint accepted this event.",
    icon: CheckCircle2,
    text: "text-success",
    bg: "bg-success-bg",
    border: "border-success-border",
    dot: "bg-success",
  },
  pending: {
    label: "Retrying",
    hint: "The attempt failed and is queued to be sent again.",
    icon: Clock,
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    dot: "bg-violet-500",
  },
  retrying: {
    label: "Sending",
    hint: "An attempt is in flight right now.",
    icon: RefreshCw,
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    dot: "bg-violet-500",
  },
  failed: {
    label: "Failed",
    hint: "All 5 attempts were used. Fix the endpoint, then resend.",
    icon: XCircle,
    text: "text-error",
    bg: "bg-error-bg",
    border: "border-error-border",
    dot: "bg-error",
  },
};

/** The retry schedule, stated once so the UI and the docs agree. */
export const RETRY_SCHEDULE = "immediately, then after 1 min, 5 min, 30 min and 2 hours";
export const MAX_ATTEMPTS = 5;

/** "2 min ago" / "3 h ago" — relative time reads faster than a timestamp in a health strip. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** "in 4 min" — for timestamps that have not happened yet, such as a queued retry. */
export function timeUntil(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.round((then - Date.now()) / 1000);
  if (seconds <= 0) return "any moment now";
  if (seconds < 60) return `in ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `in ${hours} h`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Base URL of the published API docs, derived from the API the app talks to. */
export function docsUrl(): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "");
  return base ? `${base}/docs` : "/api/docs";
}
