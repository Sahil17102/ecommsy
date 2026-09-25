import { api } from "./api";

export interface NotificationItem {
  id: string;
  event: string;
  category: string;
  title: string;
  body: string;
  link?: string;
  readAt: string | null;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unreadCount: number;
}

export interface PreferenceItem {
  key: string;
  category: string;
  label: string;
  description: string;
  channels: ("email" | "whatsapp" | "inApp")[];
  mandatory: boolean;
  settings: { email: boolean; whatsapp: boolean; inApp: boolean };
}

export interface PreferencesResponse {
  mute: { email: boolean; whatsapp: boolean; inApp: boolean };
  events: PreferenceItem[];
  categories: string[];
}

export const notificationsApi = {
  list: async (opts?: { limit?: number; unread?: boolean }) => {
    const { data } = await api.get<NotificationListResponse>("/notifications", {
      params: { limit: opts?.limit, unread: opts?.unread },
    });
    return data;
  },
  unreadCount: async () => {
    const { data } = await api.get<{ count: number }>("/notifications/unread-count");
    return data.count;
  },
  markRead: async (id: string) => {
    await api.post(`/notifications/${id}/read`);
  },
  markAllRead: async () => {
    await api.post("/notifications/read-all");
  },
  getPreferences: async () => {
    const { data } = await api.get<PreferencesResponse>("/notifications/preferences");
    return data;
  },
  updatePreference: async (payload: {
    event?: string;
    channel?: "email" | "whatsapp" | "inApp";
    enabled?: boolean;
    mute?: Partial<{ email: boolean; whatsapp: boolean; inApp: boolean }>;
  }) => {
    await api.put("/notifications/preferences", payload);
  },
};
