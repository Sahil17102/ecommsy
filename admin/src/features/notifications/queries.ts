import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "./api";

export const NOTIFICATIONS_KEY = ["admin", "notifications"] as const;
export const NOTIFICATIONS_UNREAD_KEY = ["admin", "notifications", "unread-count"] as const;

export function useNotifications(opts?: { limit?: number; unread?: boolean }) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, opts],
    queryFn: () => notificationsApi.list(opts),
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: NOTIFICATIONS_UNREAD_KEY,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_KEY });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_KEY });
    },
  });
}
