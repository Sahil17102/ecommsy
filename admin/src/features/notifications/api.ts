import { api } from "@/lib/api";
import type { NotificationListResponse } from "./types";

export const notificationsApi = {
  list: async (opts?: { limit?: number; unread?: boolean }): Promise<NotificationListResponse> => {
    const { data } = await api.get<NotificationListResponse>("/notifications", {
      params: { limit: opts?.limit, unread: opts?.unread },
    });
    return data;
  },
  unreadCount: async (): Promise<number> => {
    const { data } = await api.get<{ count: number }>("/notifications/unread-count");
    return data.count;
  },
  markRead: async (id: string): Promise<void> => {
    await api.post(`/notifications/${id}/read`);
  },
  markAllRead: async (): Promise<void> => {
    await api.post("/notifications/read-all");
  },
};
