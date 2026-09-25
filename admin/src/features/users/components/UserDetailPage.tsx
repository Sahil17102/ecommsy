import { useParams, useNavigate } from "react-router-dom";
import { Spin, Tabs } from "antd";
import { ArrowLeft, User, Package, ShieldCheck, Landmark, Building2, MapPin, Users, BarChart3 } from "lucide-react";
import { useUser } from "../queries";
import { useAdminKyc } from "@/features/kyc/queries";
import { KycReviewPanel } from "@/features/kyc";
import { BankAccountsPanel } from "@/features/bank-accounts";
import { PickupAddressesPanel } from "@/features/pickup-addresses";
import type { KycStatus } from "@/features/kyc/types";
import { UserProfileHeader } from "./UserProfileHeader";
import { UserOverviewTab } from "./UserOverviewTab";
import { UserSummaryTab } from "./UserSummaryTab";
import { UserOrdersTab } from "./UserOrdersTab";
import { UserCompanyProfileTab } from "./UserCompanyProfileTab";
import { UserTeamMembersTab } from "./UserTeamMembersTab";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useUser(id!);
  const { data: kyc } = useAdminKyc(id!);

  const user = data?.user;
  const kycStatus = kyc?.status as KycStatus | undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-muted">
        <p className="text-lg">User not found</p>
        <button
          className="text-primary text-sm mt-2"
          onClick={() => navigate("/users-management")}
        >
          Back to users
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        onClick={() => navigate("/users-management")}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back to users
      </button>

      {/* Profile header */}
      <UserProfileHeader user={user} kycStatus={kycStatus} />

      {/* Tabs */}
      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: "overview",
            label: (
              <span className="flex items-center gap-1.5">
                <User size={14} />
                Overview
              </span>
            ),
            children: <UserOverviewTab user={user} />,
          },
          {
            key: "summary",
            label: (
              <span className="flex items-center gap-1.5">
                <BarChart3 size={14} />
                Summary
              </span>
            ),
            children: <UserSummaryTab userId={user.id} />,
          },
          {
            key: "kyc",
            label: (
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} />
                KYC Verification
                {kycStatus && kycStatus !== "not_submitted" && (
                  <span
                    className={`w-2 h-2 rounded-full ${kycStatus === "approved"
                      ? "bg-green-500"
                      : kycStatus === "rejected"
                        ? "bg-red-500"
                        : "bg-violet-500"
                      }`}
                  />
                )}
              </span>
            ),
            children: (
              <div className="pt-1">
                <KycReviewPanel userId={user.id} />
              </div>
            ),
          },
          {
            key: "company-profile",
            label: (
              <span className="flex items-center gap-1.5">
                <Building2 size={14} />
                Company Profile
              </span>
            ),
            children: <UserCompanyProfileTab user={user} />,
          },
          {
            key: "bank-accounts",
            label: (
              <span className="flex items-center gap-1.5">
                <Landmark size={14} />
                Bank Accounts
              </span>
            ),
            children: (
              <div className="pt-1">
                <BankAccountsPanel userId={user.id} />
              </div>
            ),
          },
          {
            key: "pickup-addresses",
            label: (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                Pickup Addresses
              </span>
            ),
            children: (
              <div className="pt-1">
                <PickupAddressesPanel userId={user.id} />
              </div>
            ),
          },
          {
            key: "team-members",
            label: (
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                Team Members
              </span>
            ),
            children: (
              <UserTeamMembersTab
                userId={user.id}
                ownerName={
                  user.name ||
                  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                  user.email ||
                  "this user"
                }
              />
            ),
          },
          {
            key: "orders",
            label: (
              <span className="flex items-center gap-1.5">
                <Package size={14} />
                Orders
              </span>
            ),
            children: <UserOrdersTab userId={user.id} />,
          },
        ]}
      />
    </div>
  );
}
