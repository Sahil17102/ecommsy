import { useMemo } from "react";
import { Switch } from "antd";
import { Mail, MessageSquare, Bell as BellIcon, Lock, Settings } from "lucide-react";
import { useNotificationPreferences, useUpdatePreference } from "./queries";
import type { NotificationChannel, PreferenceItem } from "./types";

const CHANNEL_ICON: Record<NotificationChannel, typeof Mail> = {
  email: Mail,
  whatsapp: MessageSquare,
  inApp: BellIcon,
};

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  inApp: "In-app",
};

function formatCategory(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function NotificationSettingsPage() {
  const { data, isLoading } = useNotificationPreferences();
  const update = useUpdatePreference();

  const pendingVars = update.isPending ? update.variables : undefined;
  const isMuteLoading = (ch: NotificationChannel): boolean =>
    !!pendingVars?.mute && ch in pendingVars.mute;
  const isEventLoading = (eventKey: string, ch: NotificationChannel): boolean =>
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
      <div className="p-6">
        <div className="text-xs text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Notification settings
        </h1>
        <p className="text-xs text-muted mt-1">
          Control how you receive alerts for admin events.
        </p>
      </div>

      {/* Global mute */}
      <div className="bg-background-elevated border border-border-light rounded-xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Mute channels</h2>
        <p className="text-xs text-muted mb-4">
          Muting a channel stops all non-essential notifications on it.
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
                  onChange={(on) => update.mutate({ mute: { [ch]: !on } })}
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
            <h2 className="text-sm font-semibold text-foreground">{formatCategory(category)}</h2>
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
                              update.mutate({ event: evt.key, channel: ch, enabled: on })
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
