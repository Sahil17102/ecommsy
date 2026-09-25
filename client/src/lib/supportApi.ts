import { api } from "./api";

export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "order" | "payment" | "kyc" | "wallet" | "technical" | "general";

export interface TicketAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

export interface TicketMessage {
  id: string;
  fromRole: "seller" | "admin";
  fromUserId: string;
  body: string;
  attachments?: TicketAttachment[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string | { id: string; name?: string; email?: string; businessName?: string };
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  relatedOrderId?: string;
  messages?: TicketMessage[];
  lastMessageAt: string;
  unreadBySeller: number;
  unreadByAdmin: number;
  createdAt: string;
}

export interface CreateTicketPayload {
  subject: string;
  message: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  relatedOrderId?: string;
  attachments?: File[];
}

function buildReplyFormData(message: string, attachments?: File[]): FormData {
  const fd = new FormData();
  fd.append("message", message);
  (attachments ?? []).forEach((f) => fd.append("attachments", f));
  return fd;
}

export const supportApi = {
  list: async (status?: TicketStatus) => {
    const { data } = await api.get<{ items: SupportTicket[] }>("/support-tickets", {
      params: { status },
    });
    return data.items;
  },
  get: async (id: string) => {
    const { data } = await api.get<{ ticket: SupportTicket }>(`/support-tickets/${id}`);
    return data.ticket;
  },
  create: async (payload: CreateTicketPayload) => {
    const fd = new FormData();
    fd.append("subject", payload.subject);
    fd.append("message", payload.message);
    if (payload.category) fd.append("category", payload.category);
    if (payload.priority) fd.append("priority", payload.priority);
    if (payload.relatedOrderId) fd.append("relatedOrderId", payload.relatedOrderId);
    (payload.attachments ?? []).forEach((f) => fd.append("attachments", f));
    // Leave Content-Type unset so the browser injects the boundary parameter.
    const { data } = await api.post<{ ticket: SupportTicket }>("/support-tickets", fd, {
      headers: { "Content-Type": undefined },
    });
    return data.ticket;
  },
  reply: async (id: string, message: string, attachments?: File[]) => {
    const { data } = await api.post<{ ticket: SupportTicket }>(
      `/support-tickets/${id}/reply`,
      buildReplyFormData(message, attachments),
      { headers: { "Content-Type": undefined } },
    );
    return data.ticket;
  },
  attachmentPath: (ticketId: string, attachmentId: string) =>
    `/support-tickets/${ticketId}/attachments/${attachmentId}`,
};
