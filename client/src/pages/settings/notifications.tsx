import { useMemo } from "react";
import { Switch } from "antd";
import { Mail, MessageSquare, Bell as BellIcon, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  useNotificationPreferences,
  useUpdatePreference,
} from "@/queries/useNotifications";
import type { PreferenceItem } from "@/lib/notificationsApi";
import { formatKeyword } from "@/lib/utils";

type Channel = "email" | "whatsapp" | "inApp";

const CHANNEL_ICON = {
  email: Mail,
  whatsapp: MessageSquare,
  inApp: BellIcon,
} as const;

const CHANNEL_LABEL = {
  email: "Email",
  whatsapp: "WhatsApp",
  inApp: "In-app",
} as const;

export default function NotificationPreferencesPage() {
  const { data, isLoading } = useNotificationPreferences();
  const update = useUpdatePreference();

  const pendingVars = update.isPending ? update.variables : undefined;
  const isMuteLoading = (ch: Channel): boolean =>
    !!pendingVars?.mute && ch in pendingVars.mute;
  const isEventLoading = (eventKey: string, ch: Channel): boolean =>
    !!pendingVars && pendingVars.event === eventKey && pendingVars.channel === ch;

  const grouped = useMemo(() => {
    const out: Record<string, PreferenceItem[]> = {};
    for (const e of data?.events ?? []) {
      (out[e.category] ??= []).push(e);
    }
    return out;
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-xs text-muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notification preferences</h1>
        <p className="text-xs text-muted mt-1">
          Choose how and when you want to hear from Searchcraft.
        </p>
      </div>

      {/* Global mute */}
      <div className="bg-background-elevated border border-border-light rounded-xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Mute channels</h2>
        <p className="text-xs text-muted mb-4">
          Muting a channel stops all non-essential notifications on it. Security alerts
          (OTP, password reset) are always delivered.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["email", "inApp"] as const).map((ch) => {
            const Icon = CHANNEL_ICON[ch];
            const muted = data.mute[ch];
            return (
              <div
                key={ch}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-background border border-border-light"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted" />
                  <span className="text-xs font-medium text-foreground">{CHANNEL_LABEL[ch]}</span>
                </div>
                <Switch
                  size="small"
                  checked={!muted}
                  loading={isMuteLoading(ch)}
                  onChange={(on) => update.mutate(
                    { mute: { [ch]: !on } },
                    { onError: () => toast.error("Couldn't update preference. Try again.") },
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-event matrix */}
      {Object.entries(grouped).map(([category, events]) => (
        <div
          key={category}
          className="bg-background-elevated border border-border-light rounded-xl overflow-hidden"
        >
          <div className="px-4 sm:px-5 py-3 border-b border-border-light">
            <h2 className="text-sm font-semibold text-foreground">{formatKeyword(category)}</h2>
          </div>
          <ul className="divide-y divide-border-light">
            {events.map((evt) => (
              <li key={evt.key} className="px-4 sm:px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{evt.label}</p>
                      {evt.mandatory && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted bg-muted/10 px-1.5 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" />
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{evt.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    {evt.channels.map((ch) => {
                      const Icon = CHANNEL_ICON[ch];
                      const enabled = evt.settings[ch];
                      return (
                        <div key={ch} className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-muted" />
                          <Switch
                            size="small"
                            disabled={evt.mandatory}
                            checked={enabled}
                            loading={isEventLoading(evt.key, ch)}
                            onChange={(on) =>
                              update.mutate(
                                { event: evt.key, channel: ch, enabled: on },
                                {
                                  onError: () =>
                                    toast.error("Couldn't update preference. Try again."),
                                },
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
