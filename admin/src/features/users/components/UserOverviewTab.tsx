import { Tag } from "antd";
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  ShoppingBag,
  Package,
  Clock,
  CalendarDays,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { UserListItem } from "../types";

const VOLUME_LABELS: Record<string, string> = {
  "0-100": "0 – 100",
  "100-500": "100 – 500",
  "500-1000": "500 – 1,000",
  "1000-5000": "1,000 – 5,000",
  "5000+": "5,000+",
};

interface UserOverviewTabProps {
  user: UserListItem;
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-light/60 last:border-0">
      <span className="flex items-center gap-2 text-muted text-sm w-28 shrink-0 pt-0.5">
        {icon}
        {label}
      </span>
      <span className="text-sm text-foreground min-w-0">{children}</span>
    </div>
  );
}

export function UserOverviewTab({ user }: UserOverviewTabProps) {
  return (
    <div className="space-y-4 pt-1">
      {/* Two-column info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contact */}
        <div className="bg-background-elevated border border-border-light rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Contact Information
          </h3>
          <div>
            <InfoRow icon={<Mail size={13} />} label="Email">
              {user.email || "—"}
            </InfoRow>
            <InfoRow icon={<Phone size={13} />} label="Phone">
              {user.phone || "—"}
            </InfoRow>
            <InfoRow icon={<MapPin size={13} />} label="Pincode">
              {user.pincode || "—"}
            </InfoRow>
          </div>
        </div>

        {/* Business */}
        <div className="bg-background-elevated border border-border-light rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Business Details
          </h3>
          <div>
            <InfoRow icon={<Building2 size={13} />} label="Business">
              {user.businessName || "—"}
            </InfoRow>
            <InfoRow icon={<ShoppingBag size={13} />} label="Sells On">
              {user.sellsOn.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {user.sellsOn.map((p) => (
                    <Tag
                      key={p}
                      bordered={false}
                      className="!text-xs capitalize"
                    >
                      {p}
                    </Tag>
                  ))}
                </div>
              ) : (
                "—"
              )}
            </InfoRow>
            <InfoRow icon={<Package size={13} />} label="Volume">
              {user.monthlyShipmentVolume
                ? `${VOLUME_LABELS[user.monthlyShipmentVolume] ?? user.monthlyShipmentVolume} / month`
                : "—"}
            </InfoRow>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="bg-background-elevated border border-border-light rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Activity</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-blue-500" />
            <span className="text-sm text-muted">Joined</span>
            <span className="text-sm font-medium text-foreground">
              {formatDate(user.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-violet-500" />
            <span className="text-sm text-muted">Last login</span>
            <span className="text-sm font-medium text-foreground">
              {user.lastLogin ? formatDateTime(user.lastLogin) : "Never"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-emerald-500" />
            <span className="text-sm text-muted">Last updated</span>
            <span className="text-sm font-medium text-foreground">
              {formatDateTime(user.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
