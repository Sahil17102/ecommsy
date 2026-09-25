import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportTicketsApi } from "./api";
import type { TicketStatus, TicketPriority } from "./types";

export const SUPPORT_TICKETS_KEY = ["admin", "support-tickets"] as const;

export function useTickets(status?: TicketStatus) {
  return useQuery({
    queryKey: [...SUPPORT_TICKETS_KEY, "list", status],
    queryFn: () => supportTicketsApi.list(status),
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: [...SUPPORT_TICKETS_KEY, "detail", id],
    queryFn: () => supportTicketsApi.get(id!),
    enabled: !!id,
  });
}

export function useReplyTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { message: string; attachments?: File[] }) =>
      supportTicketsApi.reply(id, payload.message, payload.attachments),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPORT_TICKETS_KEY }),
  });
}

export function useUpdateTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (update: { status?: TicketStatus; priority?: TicketPriority }) =>
      supportTicketsApi.updateStatus(id, update),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPORT_TICKETS_KEY }),
  });
}
