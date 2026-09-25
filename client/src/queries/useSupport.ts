import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportApi, type TicketStatus } from "@/lib/supportApi";

export const SUPPORT_KEY = ["support"] as const;

export function useSupportTickets(status?: TicketStatus) {
  return useQuery({
    queryKey: [...SUPPORT_KEY, "list", status],
    queryFn: () => supportApi.list(status),
  });
}

export function useSupportTicket(id: string | undefined) {
  return useQuery({
    queryKey: [...SUPPORT_KEY, "detail", id],
    queryFn: () => supportApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: supportApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPORT_KEY }),
  });
}

export function useReplyTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { message: string; attachments?: File[] }) =>
      supportApi.reply(id, payload.message, payload.attachments),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPORT_KEY }),
  });
}
