import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  CreditCard,
} from "lucide-react";
import type { UserListItem } from "../types";

interface UserCompanyProfileTabProps {
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
      <span className="flex items-center gap-2 text-muted text-sm w-36 shrink-0 pt-0.5">
        {icon}
        {label}
      </span>
      <span className="text-sm text-foreground min-w-0">{children}</span>
    </div>
  );
}

export function UserCompanyProfileTab({ user }: UserCompanyProfileTabProps) {
  return (
    <div className="space-y-4 pt-1">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Business Info */}
        <div className="bg-background-elevated border border-border-light rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Business Information
          </h3>
          <div>
            <InfoRow icon={<Building2 size={13} />} label="Business Name">
              {user.businessName || "—"}
            </InfoRow>
            <InfoRow icon={<Building2 size={13} />} label="Brand Name">
              {user.name || "—"}
            </InfoRow>
            <InfoRow icon={<CreditCard size={13} />} label="Plan">
              <span className="uppercase font-medium">{user.plan || "basic"}</span>
            </InfoRow>
            <InfoRow icon={<Globe size={13} />} label="Website">
              {user.website ? (
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {user.website}
                </a>
              ) : (
                "—"
              )}
            </InfoRow>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-background-elevated border border-border-light rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Contact Details
          </h3>
          <div>
            <InfoRow icon={<Mail size={13} />} label="Support Email">
              {user.supportEmail || "—"}
            </InfoRow>
            <InfoRow icon={<Phone size={13} />} label="Contact Number">
              {user.contactNumber || "—"}
            </InfoRow>
            <InfoRow icon={<Mail size={13} />} label="Account Email">
              {user.email || "—"}
            </InfoRow>
            <InfoRow icon={<Phone size={13} />} label="Account Phone">
              {user.phone || "—"}
            </InfoRow>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-background-elevated border border-border-light rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Address
        </h3>
        <div>
          <InfoRow icon={<MapPin size={13} />} label="Address">
            {user.address || "—"}
          </InfoRow>
          <InfoRow icon={<MapPin size={13} />} label="City">
            {user.city || "—"}
          </InfoRow>
          <InfoRow icon={<MapPin size={13} />} label="State">
            {user.state || "—"}
          </InfoRow>
          <InfoRow icon={<MapPin size={13} />} label="Pincode">
            {user.pincode || "—"}
          </InfoRow>
        </div>
      </div>
    </div>
  );
}
