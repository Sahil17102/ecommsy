import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type PreferencesResponse } from "@/lib/notificationsApi";

export const NOTIFICATIONS_KEY = ["notifications"] as const;
export const NOTIFICATIONS_UNREAD_KEY = ["notifications", "unread-count"] as const;
export const NOTIFICATION_PREFS_KEY = ["notifications", "preferences"] as const;

export function useNotifications(opts?: { limit?: number; unread?: boolean }) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, opts],
    queryFn: () => notificationsApi.list(opts),
    refetchInterval: 30_000, // fallback polling if socket disconnects
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

export function useNotificationPreferences() {
  return useQuery({
    queryKey: NOTIFICATION_PREFS_KEY,
    queryFn: notificationsApi.getPreferences,
  });
}

export function useUpdatePreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.updatePreference,
    // Optimistic update: flip the UI immediately so the switch feels instant
    // and the mutation's isPending ends as soon as the PUT returns (not after
    // a refetch).
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: NOTIFICATION_PREFS_KEY });
      const prev = qc.getQueryData<PreferencesResponse>(NOTIFICATION_PREFS_KEY);
      if (prev) {
        qc.setQueryData<PreferencesResponse>(NOTIFICATION_PREFS_KEY, (old) => {
          if (!old) return old;
          if (payload.mute) {
            return { ...old, mute: { ...old.mute, ...payload.mute } };
          }
          if (payload.event && payload.channel && typeof payload.enabled === "boolean") {
            const { event, channel, enabled } = payload;
            return {
              ...old,
              events: old.events.map((e) =>
                e.key === event
                  ? { ...e, settings: { ...e.settings, [channel]: enabled } }
                  : e,
              ),
            };
          }
          return old;
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // Roll back the optimistic update on failure.
      if (ctx?.prev) qc.setQueryData(NOTIFICATION_PREFS_KEY, ctx.prev);
    },
    onSettled: () => {
      // Fire-and-forget — do NOT return the promise, or isPending would wait
      // on the refetch and the switch loading state would hang.
      qc.invalidateQueries({ queryKey: NOTIFICATION_PREFS_KEY });
    },
  });
}
