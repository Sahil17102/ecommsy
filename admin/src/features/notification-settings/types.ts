export type NotificationChannel = "email" | "whatsapp" | "inApp";

export interface PreferenceItem {
  key: string;
  category: string;
  label: string;
  description: string;
  channels: NotificationChannel[];
  mandatory: boolean;
  settings: Record<NotificationChannel, boolean>;
}

export interface PreferencesResponse {
  mute: Record<NotificationChannel, boolean>;
  events: PreferenceItem[];
  categories: string[];
}

export interface UpdatePreferencePayload {
  event?: string;
  channel?: NotificationChannel;
  enabled?: boolean;
  mute?: Partial<Record<NotificationChannel, boolean>>;
}
