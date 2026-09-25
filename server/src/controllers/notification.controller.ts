import type { Request, Response } from "express";
import { and, desc, eq, isNull, count } from "drizzle-orm";
import { db } from "../config/db.js";
import { notifications, notificationPreferences } from "../db/schema.js";
import { allEvents, eventsByCategory, getEvent } from "../config/notificationEvents.js";

// EventPref shape (was previously imported from the Mongoose model).
export type EventPref = {
  key: string;
  email: boolean;
  whatsapp: boolean;
  inApp: boolean;
};

type LegacyPrefsShape = {
  events?:
    | EventPref[]
    | Record<string, Partial<EventPref>>;
  mute?: { email?: boolean; whatsapp?: boolean; inApp?: boolean };
};

// Tolerant of both the new array shape and the legacy Map shape (stored as a
// plain BSON object) so pre-migration docs still render correctly.
function indexEvents(events: unknown): Record<string, EventPref> {
  const out: Record<string, EventPref> = {};
  if (!events) return out;
  if (Array.isArray(events)) {
    for (const e of events as EventPref[]) out[e.key] = e;
    return out;
  }
  if (typeof events === "object") {
    for (const [key, raw] of Object.entries(events as Record<string, unknown>)) {
      if (raw && typeof raw === "object") {
        const v = raw as Record<string, unknown>;
        out[key] = {
          key,
          email: typeof v.email === "boolean" ? v.email : true,
          whatsapp: typeof v.whatsapp === "boolean" ? v.whatsapp : false,
          inApp: typeof v.inApp === "boolean" ? v.inApp : true,
        };
      }
    }
  }
  return out;
}

export async function handleListNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const limit = Math.min(Number(req.query.limit ?? 30), 100);
  const unreadOnly = req.query.unread === "true";

  const whereClause = unreadOnly
    ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
    : eq(notifications.userId, userId);

  const [rows, unreadRow] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit),
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
  ]);
  const items = rows.map((row) => ({
    ...row,
    category: getEvent(row.event)?.category ?? "system",
  }));
  res.json({ items, unreadCount: unreadRow[0]?.value ?? 0 });
}

export async function handleMarkRead(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const id = req.params.id;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  res.json({ ok: true });
}

export async function handleMarkAllRead(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  res.json({ ok: true });
}

export async function handleGetUnreadCount(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const row = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  res.json({ count: row[0]?.value ?? 0 });
}

export async function handleGetPreferences(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const prefRow = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, userId),
  });
  const prefs = (prefRow?.prefs ?? null) as LegacyPrefsShape | null;
  const prefEvents = indexEvents(prefs?.events);
  const events = allEvents("seller").map((evt) => {
    const userPref = prefEvents[evt.key];
    return {
      key: evt.key,
      category: evt.category,
      label: evt.label,
      description: evt.description,
      // WhatsApp is temporarily unsupported.
      channels: evt.channels.filter((c) => c !== "whatsapp"),
      mandatory: !!evt.mandatory,
      settings: {
        email: userPref?.email ?? evt.defaultEnabled.email,
        whatsapp: userPref?.whatsapp ?? evt.defaultEnabled.whatsapp,
        inApp: userPref?.inApp ?? evt.defaultEnabled.inApp,
      },
    };
  });
  res.json({
    mute: prefs?.mute ?? { email: false, whatsapp: false, inApp: false },
    events,
    categories: Object.keys(eventsByCategory("seller")),
  });
}

// ── Admin notification preferences ──

export async function handleAdminGetPreferences(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const prefRow = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, userId),
  });
  const prefs = (prefRow?.prefs ?? null) as LegacyPrefsShape | null;
  const prefEvents = indexEvents(prefs?.events);
  const events = allEvents("admin").map((evt) => {
    const userPref = prefEvents[evt.key];
    return {
      key: evt.key,
      category: evt.category,
      label: evt.label,
      description: evt.description,
      channels: evt.channels.filter((c) => c !== "whatsapp"),
      mandatory: !!evt.mandatory,
      settings: {
        email: userPref?.email ?? evt.defaultEnabled.email,
        whatsapp: userPref?.whatsapp ?? evt.defaultEnabled.whatsapp,
        inApp: userPref?.inApp ?? evt.defaultEnabled.inApp,
      },
    };
  });
  res.json({
    mute: prefs?.mute ?? { email: false, whatsapp: false, inApp: false },
    events,
    categories: Object.keys(eventsByCategory("admin")),
  });
}

async function applyPreferenceUpdate(
  userId: string,
  body: {
    event?: string;
    channel?: "email" | "whatsapp" | "inApp";
    enabled?: boolean;
    mute?: { email?: boolean; whatsapp?: boolean; inApp?: boolean };
  },
): Promise<{ ok: true } | { error: string }> {
  const { event, channel, enabled, mute } = body;
  const hasEventChange = !!(event && channel && typeof enabled === "boolean");
  const hasMuteChange = !!mute && Object.values(mute).some((v) => typeof v === "boolean");

  if (!hasEventChange && !hasMuteChange) {
    return { error: "Nothing to update" };
  }

  // Read existing prefs (single jsonb blob)
  const existing = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, userId),
  });
  const current = (existing?.prefs ?? {}) as LegacyPrefsShape;

  // Apply mute changes
  const newMute = { ...(current.mute ?? {}) };
  if (mute) {
    if (typeof mute.email === "boolean") newMute.email = mute.email;
    if (typeof mute.whatsapp === "boolean") newMute.whatsapp = mute.whatsapp;
    if (typeof mute.inApp === "boolean") newMute.inApp = mute.inApp;
  }

  // Apply event change
  const indexed = indexEvents(current.events);
  if (hasEventChange) {
    const evtDef = getEvent(event!);
    const entry: EventPref = indexed[event!] ?? {
      key: event!,
      email: evtDef?.defaultEnabled.email ?? true,
      whatsapp: evtDef?.defaultEnabled.whatsapp ?? false,
      inApp: evtDef?.defaultEnabled.inApp ?? true,
    };
    entry[channel!] = enabled!;
    indexed[event!] = entry;
  }

  const newPrefs: LegacyPrefsShape = {
    events: Object.values(indexed),
    mute: newMute,
  };

  if (existing) {
    await db
      .update(notificationPreferences)
      .set({ prefs: newPrefs as unknown as Record<string, { email?: boolean; push?: boolean; sms?: boolean }>, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, userId));
  } else {
    await db
      .insert(notificationPreferences)
      .values({
        userId,
        prefs: newPrefs as unknown as Record<string, { email?: boolean; push?: boolean; sms?: boolean }>,
      });
  }

  return { ok: true };
}

export async function handleAdminUpdatePreferences(req: Request, res: Response): Promise<void> {
  const result = await applyPreferenceUpdate(req.userId!, req.body);
  if ("error" in result) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
}

export async function handleUpdatePreferences(req: Request, res: Response): Promise<void> {
  const result = await applyPreferenceUpdate(req.userId!, req.body);
  if ("error" in result) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
}
