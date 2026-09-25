import { api } from "@/lib/api";
import type { SupportTicket, TicketStatus, TicketPriority } from "./types";

export const supportTicketsApi = {
  list: async (status?: TicketStatus): Promise<SupportTicket[]> => {
    const { data } = await api.get<{ items: SupportTicket[] }>("/support-tickets", {
      params: { status },
    });
    return data.items;
  },
  get: async (id: string): Promise<SupportTicket> => {
    const { data } = await api.get<{ ticket: SupportTicket }>(`/support-tickets/${id}`);
    return data.ticket;
  },
  reply: async (
    id: string,
    message: string,
    attachments?: File[],
  ): Promise<SupportTicket> => {
    const fd = new FormData();
    fd.append("message", message);
    (attachments ?? []).forEach((f) => fd.append("attachments", f));
    // Leave Content-Type unset so the browser injects the boundary parameter.
    const { data } = await api.post<{ ticket: SupportTicket }>(
      `/support-tickets/${id}/reply`,
      fd,
      { headers: { "Content-Type": undefined } },
    );
    return data.ticket;
  },
  attachmentPath: (ticketId: string, attachmentId: string) =>
    `/support-tickets/${ticketId}/attachments/${attachmentId}`,
  updateStatus: async (
    id: string,
    update: { status?: TicketStatus; priority?: TicketPriority },
  ): Promise<SupportTicket> => {
    const { data } = await api.patch<{ ticket: SupportTicket }>(
      `/support-tickets/${id}`,
      update,
    );
    return data.ticket;
  },
};
