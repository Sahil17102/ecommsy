import type { Request, Response } from "express";
import crypto from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { supportTickets, users } from "../db/schema.js";
import { notifyAsync, notifyAdmins } from "../services/notificationService.js";
import { emitToUser, emitToAdmins } from "../services/realtime.js";
import { uploadDocument, downloadDocument } from "../services/storage.js";
import { MIME_TO_EXT } from "../config/constants.js";

type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
};

// Inlined ticket constants / types (were in the Mongoose model).
export const TICKET_STATUSES = ["open", "pending", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = [
  "general",
  "billing",
  "shipping",
  "kyc",
  "technical",
  "other",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export interface ITicketAttachment {
  _id: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
}

interface ITicketMessage {
  _id: string;
  fromRole: "seller" | "admin";
  fromUserId: string;
  body: string;
  attachments: ITicketAttachment[];
  createdAt: string; // stored as ISO string in jsonb
}

// Metadata blob for legacy fields not present on the Drizzle schema:
// ticketNumber, relatedOrderId, lastMessageAt, unreadByAdmin, unreadBySeller.
interface TicketMetadata {
  ticketNumber?: string;
  relatedOrderId?: string;
  lastMessageAt?: string;
  unreadByAdmin?: number;
  unreadBySeller?: number;
}

export function generateTicketNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TKT-${ts}-${rand}`;
}

function genId(): string {
  // 24-char hex, mimics ObjectId for client compatibility
  return crypto.randomBytes(12).toString("hex");
}

function getMeta(row: { metadata: unknown }): TicketMetadata {
  return (row.metadata ?? {}) as TicketMetadata;
}

async function storeAttachments(
  ticketId: string,
  messageId: string,
  files: MulterFile[] | undefined,
): Promise<ITicketAttachment[]> {
  if (!files || files.length === 0) return [];
  const results: ITicketAttachment[] = [];
  for (const file of files) {
    const ext = MIME_TO_EXT[file.mimetype] || file.originalname.split(".").pop() || "bin";
    const attachmentId = genId();
    const key = `support-tickets/${ticketId}/${messageId}/${attachmentId}.${ext}`;
    await uploadDocument(key, file.buffer, file.mimetype);
    results.push({
      _id: attachmentId,
      url: key,
      name: file.originalname,
      contentType: file.mimetype,
      size: file.size,
    });
  }
  return results;
}

// ── Seller endpoints ──

export async function handleSellerListTickets(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const status = req.query.status as TicketStatus | undefined;
  const conditions = [eq(supportTickets.userId, userId)];
  if (status && TICKET_STATUSES.includes(status)) conditions.push(eq(supportTickets.status, status));
  // Order by lastMessageAt isn't a column — fall back to updatedAt (which the
  // reply/update flows always touch).
  const tickets = await db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      subject: supportTickets.subject,
      category: supportTickets.category,
      priority: supportTickets.priority,
      status: supportTickets.status,
      metadata: supportTickets.metadata,
      closedAt: supportTickets.closedAt,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
    })
    .from(supportTickets)
    .where(and(...conditions))
    .orderBy(desc(supportTickets.updatedAt));
  res.json({ items: tickets });
}

export async function handleSellerCreateTicket(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { subject, category, priority, message, relatedOrderId } = req.body as {
    subject?: string;
    category?: TicketCategory;
    priority?: TicketPriority;
    message?: string;
    relatedOrderId?: string;
  };
  const files = (req.files as MulterFile[] | undefined) ?? [];
  if (!subject?.trim() || (!message?.trim() && files.length === 0)) {
    res.status(400).json({ error: "subject and either a message or attachment are required" });
    return;
  }

  // We can't pre-compute the uuid for the row (Postgres assigns it on insert).
  // Insert a placeholder first, then store attachments under that ticket id.
  const messageId = genId();
  const ticketNumber = generateTicketNumber();
  const now = new Date();

  const initialMessage: ITicketMessage = {
    _id: messageId,
    fromRole: "seller",
    fromUserId: userId,
    body: message?.trim() ?? "",
    attachments: [],
    createdAt: now.toISOString(),
  };

  const [ticket] = await db
    .insert(supportTickets)
    .values({
      userId,
      subject: subject.trim(),
      category: category && TICKET_CATEGORIES.includes(category) ? category : "general",
      priority: priority && TICKET_PRIORITIES.includes(priority) ? priority : "medium",
      status: "open",
      messages: [initialMessage],
      metadata: {
        ticketNumber,
        relatedOrderId,
        lastMessageAt: now.toISOString(),
        unreadByAdmin: 1,
        unreadBySeller: 0,
      } as TicketMetadata,
    })
    .returning();

  // Now upload attachments under the real ticket id
  if (files.length > 0) {
    const attachments = await storeAttachments(ticket.id, messageId, files);
    initialMessage.attachments = attachments;
    await db
      .update(supportTickets)
      .set({ messages: [initialMessage], updatedAt: new Date() })
      .where(eq(supportTickets.id, ticket.id));
  }

  notifyAsync({
    userId,
    event: "support.ticket_created",
    data: {
      ticketNumber,
      ticketId: ticket.id,
      subject: ticket.subject,
    },
  });
  emitToAdmins("support:new_ticket", {
    _id: ticket.id,
    ticketNumber,
    subject: ticket.subject,
  });

  (async () => {
    const seller = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { name: true, firstName: true, email: true },
    });
    const sellerName = seller?.name ?? seller?.firstName ?? "A seller";
    notifyAdmins("admin.new_support_ticket", {
      ticketNumber,
      ticketId: ticket.id,
      subject: ticket.subject,
      sellerName,
      sellerEmail: seller?.email ?? "",
    });
  })().catch(() => {});

  res.status(201).json({ ticket });
}

export async function handleSellerGetTicket(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { id } = req.params;

  const existing = await db.query.supportTickets.findFirst({
    where: and(eq(supportTickets.id, id), eq(supportTickets.userId, userId)),
  });
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const meta = { ...getMeta(existing), unreadBySeller: 0 } as TicketMetadata;

  const [ticket] = await db
    .update(supportTickets)
    .set({ metadata: meta, updatedAt: new Date() })
    .where(and(eq(supportTickets.id, id), eq(supportTickets.userId, userId)))
    .returning();
  res.json({ ticket });
}

export async function handleSellerReply(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const { id } = req.params;
  const { message } = req.body as { message?: string };
  const files = (req.files as MulterFile[] | undefined) ?? [];
  if (!message?.trim() && files.length === 0) {
    res.status(400).json({ error: "message or attachment required" });
    return;
  }
  const ticket = await db.query.supportTickets.findFirst({
    where: and(eq(supportTickets.id, id), eq(supportTickets.userId, userId)),
  });
  if (!ticket) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const messageId = genId();
  const attachments = await storeAttachments(ticket.id, messageId, files);
  const now = new Date();
  const newMessage: ITicketMessage = {
    _id: messageId,
    fromRole: "seller",
    fromUserId: userId,
    body: message?.trim() ?? "",
    attachments,
    createdAt: now.toISOString(),
  };
  const existingMessages = (ticket.messages ?? []) as ITicketMessage[];
  const updatedMessages = [...existingMessages, newMessage];
  const meta = getMeta(ticket);
  const newStatus =
    ticket.status === "resolved" || ticket.status === "closed" ? "open" : ticket.status;

  const [updated] = await db
    .update(supportTickets)
    .set({
      messages: updatedMessages,
      status: newStatus,
      metadata: {
        ...meta,
        lastMessageAt: now.toISOString(),
        unreadByAdmin: (meta.unreadByAdmin ?? 0) + 1,
      },
      updatedAt: now,
    })
    .where(eq(supportTickets.id, id))
    .returning();

  emitToAdmins("support:ticket_updated", { _id: updated.id });

  (async () => {
    const seller = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { name: true, firstName: true },
    });
    const preview = (message?.trim() || `📎 ${attachments.length} attachment${attachments.length > 1 ? "s" : ""}`).slice(0, 140);
    notifyAdmins("admin.support_ticket_reply", {
      ticketNumber: meta.ticketNumber,
      ticketId: updated.id,
      sellerName: seller?.name ?? seller?.firstName ?? "A seller",
      preview,
    });
  })().catch(() => {});

  res.json({ ticket: updated });
}

// ── Admin endpoints ──

export async function handleAdminListTickets(req: Request, res: Response): Promise<void> {
  const status = req.query.status as TicketStatus | undefined;
  const conditions: ReturnType<typeof eq>[] = [];
  if (status && TICKET_STATUSES.includes(status)) conditions.push(eq(supportTickets.status, status));
  const whereClause = conditions.length ? and(...conditions) : undefined;

  // Join with users so admins see basic seller info inline.
  const tickets = await db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      subject: supportTickets.subject,
      category: supportTickets.category,
      priority: supportTickets.priority,
      status: supportTickets.status,
      metadata: supportTickets.metadata,
      closedAt: supportTickets.closedAt,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      user: {
        name: users.name,
        email: users.email,
        businessName: users.businessName,
      },
    })
    .from(supportTickets)
    .leftJoin(users, eq(users.id, supportTickets.userId))
    .where(whereClause)
    .orderBy(desc(supportTickets.updatedAt));
  res.json({ items: tickets });
}

export async function handleAdminGetTicket(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await db.query.supportTickets.findFirst({
    where: eq(supportTickets.id, id),
  });
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const meta = { ...getMeta(existing), unreadByAdmin: 0 } as TicketMetadata;

  const [updated] = await db
    .update(supportTickets)
    .set({ metadata: meta, updatedAt: new Date() })
    .where(eq(supportTickets.id, id))
    .returning();

  // Manual join for user details
  const seller = await db.query.users.findFirst({
    where: eq(users.id, updated.userId),
    columns: { name: true, email: true, businessName: true, contactNumber: true },
  });
  res.json({ ticket: { ...updated, user: seller } });
}

export async function handleAdminReply(req: Request, res: Response): Promise<void> {
  const adminId = req.userId!;
  const { id } = req.params;
  const { message } = req.body as { message?: string };
  const files = (req.files as MulterFile[] | undefined) ?? [];
  if (!message?.trim() && files.length === 0) {
    res.status(400).json({ error: "message or attachment required" });
    return;
  }
  const ticket = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, id) });
  if (!ticket) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const messageId = genId();
  const attachments = await storeAttachments(ticket.id, messageId, files);
  const now = new Date();
  const newMessage: ITicketMessage = {
    _id: messageId,
    fromRole: "admin",
    fromUserId: adminId,
    body: message?.trim() ?? "",
    attachments,
    createdAt: now.toISOString(),
  };
  const existingMessages = (ticket.messages ?? []) as ITicketMessage[];
  const updatedMessages = [...existingMessages, newMessage];
  const meta = getMeta(ticket);
  const newStatus = ticket.status === "open" ? "pending" : ticket.status;

  const [updated] = await db
    .update(supportTickets)
    .set({
      messages: updatedMessages,
      status: newStatus,
      metadata: {
        ...meta,
        lastMessageAt: now.toISOString(),
        unreadBySeller: (meta.unreadBySeller ?? 0) + 1,
      },
      updatedAt: now,
    })
    .where(eq(supportTickets.id, id))
    .returning();

  notifyAsync({
    userId: updated.userId,
    event: "support.ticket_reply",
    data: {
      ticketNumber: meta.ticketNumber,
      ticketId: updated.id,
      preview: (message?.trim() || `📎 ${attachments.length} attachment${attachments.length > 1 ? "s" : ""}`).slice(0, 140),
    },
  });
  emitToUser(updated.userId, "support:ticket_updated", { _id: updated.id });
  res.json({ ticket: updated });
}

// ── Attachment serving ──

async function serveAttachment(
  req: Request,
  res: Response,
  opts: { requireOwner: boolean },
): Promise<void> {
  const { id, attachmentId } = req.params;
  const whereClause = opts.requireOwner
    ? and(eq(supportTickets.id, id), eq(supportTickets.userId, req.userId!))
    : eq(supportTickets.id, id);
  const ticket = await db.query.supportTickets.findFirst({
    where: whereClause,
    columns: { messages: true, userId: true },
  });
  if (!ticket) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  let attachment: ITicketAttachment | undefined;
  for (const m of (ticket.messages ?? []) as ITicketMessage[]) {
    const a = (m.attachments ?? []).find((x) => x._id === attachmentId);
    if (a) {
      attachment = a;
      break;
    }
  }
  if (!attachment) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }
  try {
    const { buffer, contentType } = await downloadDocument(attachment.url);
    res.set({
      "Content-Type": contentType || attachment.contentType,
      "Content-Disposition": `inline; filename="${attachment.name}"`,
      "Content-Length": String(buffer.length),
    });
    res.send(buffer);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
}

export async function handleSellerGetAttachment(req: Request, res: Response): Promise<void> {
  await serveAttachment(req, res, { requireOwner: true });
}

export async function handleAdminGetAttachment(req: Request, res: Response): Promise<void> {
  await serveAttachment(req, res, { requireOwner: false });
}

export async function handleAdminUpdateStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, id) });
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { status, priority } = req.body as { status?: TicketStatus; priority?: TicketPriority };
  const update: Record<string, unknown> = {};
  if (status && TICKET_STATUSES.includes(status)) update.status = status;
  if (priority && TICKET_PRIORITIES.includes(priority)) update.priority = priority;
  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  update.updatedAt = new Date();
  const [ticket] = await db
    .update(supportTickets)
    .set(update)
    .where(eq(supportTickets.id, id))
    .returning();
  if (!ticket) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const meta = getMeta(ticket);
  if (status === "resolved") {
    notifyAsync({
      userId: ticket.userId,
      event: "support.ticket_resolved",
      data: {
        ticketNumber: meta.ticketNumber,
        ticketId: ticket.id,
      },
    });
  }
  emitToUser(ticket.userId, "support:ticket_updated", { _id: ticket.id });
  res.json({ ticket });
}
