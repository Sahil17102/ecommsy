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
