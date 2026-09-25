import { useState } from "react";
import { Tag, Switch, Popconfirm, Select, Tooltip, message } from "antd";
import { Crown, Wallet, ArrowUpCircle, ArrowDownCircle, History, KeyRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PLAN_COLORS } from "@/lib/config";
import { formatCurrency } from "@/lib/utils";
import { useToggleUserActive, useUpdateUserPlan, useResetUserPassword } from "../queries";
import { TempPasswordModal } from "./TempPasswordModal";
import { usePlans } from "@/features/plans/queries";
import { walletsApi } from "@/features/wallets/api";
import { WALLETS_KEY } from "@/features/wallets/queries";
import AdjustWalletModal from "@/features/wallets/components/AdjustWalletModal";
import TransactionsDrawer from "@/features/wallets/components/TransactionsDrawer";
import { KYC_STATUS_COLORS, KYC_STATUS_LABELS } from "@/features/kyc/config";
import type { KycStatus } from "@/features/kyc/types";
import type { UserListItem } from "../types";

interface UserProfileHeaderProps {
  user: UserListItem;
  kycStatus?: KycStatus;
}

export function UserProfileHeader({ user, kycStatus }: UserProfileHeaderProps) {
  const toggleActive = useToggleUserActive();
  const updatePlan = useUpdateUserPlan();
  const resetPassword = useResetUserPassword();
  const { data: plansData } = usePlans({ isActive: true });
  const activePlans = plansData?.plans ?? [];
  const [tempPwd, setTempPwd] = useState<string | null>(null);

  async function handleResetPassword() {
    try {
      const result = await resetPassword.mutateAsync(user.id);
      setTempPwd(result.tempPassword);
    } catch (err) {
      message.error((err as { message?: string })?.message ?? "Failed to reset password");
    }
  }

  // Wallet
  const { data: walletData } = useQuery({
    queryKey: [...WALLETS_KEY, "user", user.id],
    queryFn: () => walletsApi.getByUserId(user.id),
    enabled: !!user.id,
  });
  const walletBalance = walletData?.wallet?.balance ?? 0;
  const [adjustType, setAdjustType] = useState<"credit" | "debit" | null>(null);
  const [showTxns, setShowTxns] = useState(false);

  const displayName =
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "Unknown User";
  const initials =
    displayName !== "Unknown User"
      ? displayName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";

  function handleToggle() {
    const action = user.isActive ? "deactivate" : "activate";
    toggleActive.mutate(user.id, {
      onSuccess: () => message.success(`User ${action}d`),
    });
  }

  return (
    <div className="bg-background-elevated border border-border-light rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left: avatar + info */}
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold shrink-0 ${
              user.isActive
                ? "bg-primary-bg text-primary"
                : "bg-error/10 text-error"
            }`}
          >
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground leading-tight">
              {displayName}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Tag bordered={false} color={user.isActive ? "green" : "red"}>
                {user.isActive ? "Active" : "Inactive"}
              </Tag>
              <Tag bordered={false} color={user.isVerified ? "cyan" : "default"}>
                {user.isVerified ? "Verified" : "Unverified"}
              </Tag>
              <Tag
                bordered={false}
                color={user.onboardingComplete ? "blue" : "purple"}
              >
                {user.onboardingComplete ? "Onboarded" : "Onboarding Pending"}
              </Tag>
              {kycStatus && kycStatus !== "not_submitted" && (
                <Tag bordered={false} color={KYC_STATUS_COLORS[kycStatus]}>
                  KYC: {KYC_STATUS_LABELS[kycStatus]}
                </Tag>
              )}
            </div>
          </div>
        </div>

        {/* Right: plan + toggle */}
        <div className="flex items-center gap-4 shrink-0 self-start">
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-violet-500" />
            <Select
              value={user.plan ?? "basic"}
              size="small"
              className="w-32"
              loading={updatePlan.isPending}
              onChange={(val) => {
                updatePlan.mutate(
                  { id: user.id, plan: val },
                  { onSuccess: () => message.success("Plan updated") },
                );
              }}
              options={activePlans.map((p) => ({
                label: (
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: PLAN_COLORS[p.slug] ?? "#888" }}
                    />
                    {p.name}
                  </span>
                ),
                value: p.slug,
              }))}
            />
          </div>
          <Popconfirm
            title={`${user.isActive ? "Deactivate" : "Activate"} this user?`}
            onConfirm={handleToggle}
            okText={user.isActive ? "Deactivate" : "Activate"}
            okButtonProps={{ danger: user.isActive }}
          >
            <Switch
              checked={user.isActive}
              loading={toggleActive.isPending}
              size="small"
            />
          </Popconfirm>
        </div>
      </div>

      {/* Wallet row */}
      <div className="mt-4 pt-4 border-t border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Wallet size={16} className="text-primary" />
          <span className="text-sm text-muted font-medium">Wallet Balance:</span>
          <span
            className={`text-sm font-bold tabular-nums ${
              walletBalance > 0
                ? "text-emerald-600"
                : walletBalance === 0
                  ? "text-muted"
                  : "text-red-600"
            }`}
          >
            {formatCurrency(walletBalance)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip title="Transaction History">
            <button
              type="button"
              onClick={() => setShowTxns(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-light text-xs font-medium text-muted hover:text-foreground hover:border-border transition-colors"
            >
              <History size={13} />
              History
            </button>
          </Tooltip>
          <button
            type="button"
            onClick={() => setAdjustType("credit")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <ArrowUpCircle size={13} />
            Credit
          </button>
          <button
            type="button"
            onClick={() => setAdjustType("debit")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            <ArrowDownCircle size={13} />
            Debit
          </button>
          <Popconfirm
            title="Reset this user's password?"
            description="Their current session will be ended and a new temporary password will be shown once."
            okText="Reset"
            okButtonProps={{ danger: true }}
            onConfirm={handleResetPassword}
          >
            <button
              type="button"
              disabled={resetPassword.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors disabled:opacity-60"
            >
              <KeyRound size={13} />
              Reset password
            </button>
          </Popconfirm>
        </div>
      </div>

      {tempPwd && (
        <TempPasswordModal
          open
          onClose={() => setTempPwd(null)}
          targetName={displayName}
          password={tempPwd}
        />
      )}

      {/* Wallet modals */}
      <AdjustWalletModal
        open={!!adjustType}
        onClose={() => setAdjustType(null)}
        userId={user.id}
        userName={displayName}
        currentBalance={walletBalance}
        initialType={adjustType ?? "credit"}
      />
      <TransactionsDrawer
        open={showTxns}
        onClose={() => setShowTxns(false)}
        userId={user.id}
        userName={displayName}
      />
    </div>
  );
}
