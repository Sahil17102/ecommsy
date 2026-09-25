import { eq, inArray } from "drizzle-orm";
import { db } from "../config/db.js";
import { notifications, notificationPreferences, users } from "../db/schema.js";
import logger from "../config/logger.js";
import { getEvent, type EventChannel, type EventDefinition } from "../config/notificationEvents.js";
import { UserRole } from "../models/User.js";
import { renderTemplate } from "../utils/template.js";
import { sendEmail } from "./mailer.js";
// WhatsApp channel is not supported at the moment — keep the import commented
// so it can be re-enabled once the Meta Cloud API integration is ready.
// import { sendWhatsApp } from "./whatsapp.js";
import { emitToUser } from "./realtime.js";

const TAG = "[Notify]";

export interface NotifyInput {
  /** Target user. Pass null for unauthenticated flows (OTP) with overrideEmail/Phone. */
  userId: string | null;
  event: string;
  data?: Record<string, unknown>;
  /** Force-send to an email even without a userId (e.g. OTP before account exists). */
  overrideEmail?: string;
  overridePhone?: string;
  /** Explicit channel override — bypass preferences. Used for mandatory events. */
  forceChannels?: EventChannel[];
}

/**
 * Dispatch a notification across enabled channels.
 * Config-driven: the event registry decides templates + defaults; user prefs refine.
 * Non-blocking: errors in one channel don't block others; all errors are logged.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const eventDef = getEvent(input.event);
  if (!eventDef) {
    logger.warn(`${TAG} Unknown event ${input.event}`);
    return;
  }

  const data = input.data ?? {};
  const userId = input.userId ?? null;

  // Resolve user context for email/phone/name
  let user: { email?: string; phone?: string; name?: string } | null = null;
  if (userId) {
    const u = await db.query.users
      .findFirst({ where: eq(users.id, userId) })
      .catch(() => null);
    if (u) {
      user = {
        email: u.email ?? undefined,
        phone: u.contactNumber ?? u.phone ?? undefined,
        name: u.firstName ?? u.name ?? "there",
      };
    }
  }

  // Global template variables — available to every event template so copy
  // and redirect links stay in sync with deployment config.
  const BRAND = "Searchcraft";
  const APP_URL = process.env.CLIENT_URL ?? "https://ecommsy-83qx.onrender.com";
  const ADMIN_URL = process.env.ADMIN_URL ?? "https://ecommsy-admin.onrender.com";
  const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@searchcraftdigital.com";

  const mergedData = {
    name: user?.name ?? "there",
    brand: BRAND,
    appUrl: APP_URL,
    adminUrl: ADMIN_URL,
    supportEmail: SUPPORT_EMAIL,
    year: String(new Date().getFullYear()),
    ...data,
  };

  // Resolve channels via prefs
  const channels = await resolveChannels(userId, eventDef, input.forceChannels);

  const delivered: EventChannel[] = [];

  // ── In-app (always first, so the bell shows it even if email/WA fail) ──
  if (channels.inApp && eventDef.inApp && userId) {
    const title = renderTemplate(eventDef.inApp.title, mergedData);
    const body = renderTemplate(eventDef.inApp.body, mergedData);
    const link = eventDef.inApp.link ? renderTemplate(eventDef.inApp.link, mergedData) : undefined;
    try {
      // Schema's `notifications` table has: id, userId, event, title, body, data, readAt, createdAt.
      // `category`, `link`, `channelsDelivered` from the old Mongoose model
      // do not exist — store them inside the `data` jsonb so consumers can
      // still recover them if needed.
      const [doc] = await db
        .insert(notifications)
        .values({
          userId,
          event: eventDef.key,
          title,
          body,
          data: { ...mergedData, _category: eventDef.category, _link: link, _channelsDelivered: ["inApp"] },
        })
        .returning();
      delivered.push("inApp");
      // Push over socket
      emitToUser(userId, "notification:new", {
        _id: doc.id,
        event: eventDef.key,
        category: eventDef.category,
        title,
        body,
        link,
        createdAt: doc.createdAt,
        readAt: null,
      });
    } catch (err) {
      logger.error(`${TAG} inApp failed (${eventDef.key}): ${(err as Error).message}`);
    }
  }

  // ── Email ──
  if (channels.email && eventDef.email) {
    const to = input.overrideEmail ?? user?.email;
    if (to) {
      const subject = renderTemplate(eventDef.email.subject, mergedData);
      const html = renderTemplate(eventDef.email.html, mergedData);
      const ok = await sendEmail({ to, subject, html });
      if (ok) delivered.push("email");
    }
  }

  // ── WhatsApp (disabled) ──
  // WhatsApp delivery is currently unsupported. The preference UI hides the
  // channel and the send call is commented out until the Meta Cloud API
  // integration is finalised.

  logger.info(`${TAG} ${eventDef.key} → user=${userId ?? "anon"} delivered=[${delivered.join(",")}]`);
}

/** Fire-and-forget wrapper — safe from request paths. */
export function notifyAsync(input: NotifyInput): void {
  notify(input).catch((err) => {
    logger.error(`${TAG} notifyAsync failed for ${input.event}: ${(err as Error).message}`);
  });
}

/**
 * Broadcast a notification to every admin user.
 * Fan-out: one notify() call per admin, so each admin gets their own in-app entry
 * and their own per-channel preferences apply.
 */
export function notifyAdmins(
  event: string,
  data?: Record<string, unknown>,
): void {
  (async () => {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, [UserRole.ADMIN, UserRole.SUPERADMIN]));
    if (admins.length === 0) {
      logger.warn(`${TAG} notifyAdmins(${event}) — no admin users found`);
      return;
    }
    for (const a of admins) {
      notifyAsync({ userId: a.id, event, data });
    }
  })().catch((err) => {
    logger.error(`${TAG} notifyAdmins(${event}) failed: ${(err as Error).message}`);
  });
}

// Shape of the legacy prefs blob stored as jsonb under `prefs`.
type LegacyPrefsShape = {
  events?:
    | Array<{ key: string; email?: boolean; whatsapp?: boolean; inApp?: boolean }>
    | Record<string, { email?: boolean; whatsapp?: boolean; inApp?: boolean }>;
  mute?: { email?: boolean; whatsapp?: boolean; inApp?: boolean };
};

async function resolveChannels(
  userId: string | null,
  eventDef: EventDefinition,
  forced?: EventChannel[],
): Promise<Record<EventChannel, boolean>> {
  const supported = new Set(eventDef.channels);
  const result: Record<EventChannel, boolean> = { email: false, whatsapp: false, inApp: false };

  // If forced, use forced ∩ supported
  if (forced) {
    for (const c of forced) if (supported.has(c)) result[c] = true;
    return result;
  }

  // Start from defaults
  for (const c of eventDef.channels) {
    result[c] = eventDef.defaultEnabled[c];
  }

  if (!userId) return result;

  const row = await db.query.notificationPreferences
    .findFirst({ where: eq(notificationPreferences.userId, userId) })
    .catch(() => null);
  const prefs = (row?.prefs ?? null) as LegacyPrefsShape | null;
  if (prefs) {
    // Tolerant of both the new array shape and the legacy Map shape (plain
    // object) so pre-migration docs still resolve correctly.
    let eventPref: Record<string, boolean> | undefined;
    const raw = prefs.events as unknown;
    if (Array.isArray(raw)) {
      eventPref = (raw as Array<Record<string, unknown>>).find((e) => e.key === eventDef.key) as
        | Record<string, boolean>
        | undefined;
    } else if (raw && typeof raw === "object") {
      const legacy = (raw as Record<string, Record<string, boolean>>)[eventDef.key];
      if (legacy) eventPref = legacy;
    }

    if (eventPref && !eventDef.mandatory) {
      for (const c of eventDef.channels) {
        const val = eventPref[c];
        if (typeof val === "boolean") result[c] = val;
      }
    }
    // Global mute (only applies to non-mandatory events)
    if (!eventDef.mandatory && prefs.mute) {
      if (prefs.mute.email) result.email = false;
      if (prefs.mute.whatsapp) result.whatsapp = false;
      if (prefs.mute.inApp) result.inApp = false;
    }
  }

  return result;
}
