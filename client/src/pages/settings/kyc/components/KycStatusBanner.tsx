import {
  ShieldCheck,
  Clock,
  ShieldX,
  AlertTriangle,
} from "lucide-react";
import type { KycStatus } from "../types";

interface KycStatusBannerProps {
  status: KycStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  KycStatus,
  {
    icon: typeof ShieldCheck;
    title: string;
    description: string;
    bg: string;
    border: string;
    iconColor: string;
    titleColor: string;
  }
> = {
  not_submitted: {
    icon: AlertTriangle,
    title: "KYC Not Started",
    description:
      "Complete your KYC verification to unlock all platform features including COD orders and wallet withdrawals.",
    bg: "bg-accent/[0.06]",
    border: "border-accent/20",
    iconColor: "text-accent",
    titleColor: "text-accent",
  },
  pending: {
    icon: Clock,
    title: "KYC Under Review",
    description:
      "Your documents have been submitted and are currently being reviewed. This usually takes 1-2 business days.",
    bg: "bg-primary/[0.06]",
    border: "border-primary/20",
    iconColor: "text-primary",
    titleColor: "text-primary",
  },
  approved: {
    icon: ShieldCheck,
    title: "KYC Verified",
    description:
      "Your identity has been verified. All platform features are unlocked.",
    bg: "bg-success/[0.06]",
    border: "border-success/20",
    iconColor: "text-success",
    titleColor: "text-success",
  },
  rejected: {
    icon: ShieldX,
    title: "KYC Rejected",
    description:
      "Your KYC was rejected. Please review the rejection reasons and re-upload the affected documents.",
    bg: "bg-error/[0.06]",
    border: "border-error/20",
    iconColor: "text-error",
    titleColor: "text-error",
  },
};

export function KycStatusBanner({ status, className = "" }: KycStatusBannerProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl border ${config.border} ${config.bg} p-4 flex items-start gap-3 ${className}`}
    >
      <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className={`text-sm font-bold ${config.titleColor}`}>
          {config.title}
        </p>
        <p className="text-xs text-muted mt-0.5">{config.description}</p>
      </div>
    </div>
  );
}
