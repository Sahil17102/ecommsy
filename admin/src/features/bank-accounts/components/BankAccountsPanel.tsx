import { useState } from "react";
import { Tag, Spin, Modal, Input, Empty } from "antd";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  Landmark,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAdminBankAccounts,
  useApproveBankAccount,
  useRejectBankAccount,
} from "../queries";
import { formatDateTime } from "@/lib/utils";
import type { BankAccount } from "../types";

interface BankAccountsPanelProps {
  userId: string;
}

const STATUS_MAP = {
  pending: { icon: Clock, color: "text-violet-500", tag: "warning", label: "Pending" },
  approved: { icon: CheckCircle2, color: "text-green-500", tag: "success", label: "Approved" },
  rejected: { icon: XCircle, color: "text-red-500", tag: "error", label: "Rejected" },
} as const;

export function BankAccountsPanel({ userId }: BankAccountsPanelProps) {
  const { data: accounts, isLoading } = useAdminBankAccounts(userId);
  const approveMutation = useApproveBankAccount(userId);
  const rejectMutation = useRejectBankAccount(userId);

  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (account: BankAccount) => {
    try {
      await approveMutation.mutateAsync(account.id);
      toast.success("Bank account approved");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({
        id: rejectModal.id,
        reason: rejectReason.trim(),
      });
      toast.success("Bank account rejected");
      setRejectModal(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin />
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="py-12">
        <Empty description="No bank accounts added by this user" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      {accounts.map((account) => {
        const isUpi = account.type === "upi";
        const status = STATUS_MAP[account.status];
        const StatusIcon = status.icon;

        return (
          <div
            key={account.id}
            className="bg-background-elevated border border-border-light rounded-xl p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {/* Title row */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Landmark size={14} className="text-muted shrink-0" />
                  <span className="text-sm font-semibold text-foreground">
                    {isUpi ? "UPI" : account.bankName}
                  </span>
                  <Tag bordered={false} className="!text-[10px] uppercase !px-1.5">
                    {isUpi ? "UPI" : "Bank"}
                  </Tag>
                  {account.isPrimary && (
                    <Tag
                      bordered={false}
                      color="blue"
                      className="!text-[10px]"
                      icon={<Star size={10} className="inline mr-0.5" />}
                    >
                      Primary
                    </Tag>
                  )}
                  <Tag bordered={false} color={status.tag as any} className="!text-[10px]">
                    <StatusIcon size={10} className="inline mr-0.5" />
                    {status.label}
                  </Tag>
                </div>

                {/* Details */}
                <div className="text-xs text-muted space-y-0.5 mt-1">
                  <p>
                    <span className="font-medium text-foreground">Holder:</span>{" "}
                    {account.accountHolderName}
                  </p>
                  {isUpi ? (
                    <p>
                      <span className="font-medium text-foreground">UPI ID:</span>{" "}
                      {account.upiId}
                      {account.upiVerified && (
                        <CheckCircle2
                          size={12}
                          className="inline ml-1 text-green-500"
                        />
                      )}
                    </p>
                  ) : (
                    <>
                      <p>
                        <span className="font-medium text-foreground">Account:</span>{" "}
                        {account.accountNumber} &middot;{" "}
                        {account.accountType
                          ? account.accountType.charAt(0).toUpperCase() +
                            account.accountType.slice(1)
                          : ""}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">IFSC:</span>{" "}
                        {account.ifscCode}
                        {account.branchName && ` — ${account.branchName}`}
                      </p>
                      {account.cancelledCheque?.url && (
                        <p className="text-primary font-medium">
                          Cancelled cheque uploaded
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-[11px] text-muted/70 pt-1">
                    Added {formatDateTime(account.createdAt)}
                  </p>
                </div>

                {/* Rejection reason */}
                {account.status === "rejected" && account.rejectionReason && (
                  <div className="mt-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs text-red-600">
                      <span className="font-semibold">Rejected:</span>{" "}
                      {account.rejectionReason}
                    </p>
                  </div>
                )}
              </div>

              {/* Admin actions */}
              {account.status === "pending" && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(account)}
                    disabled={approveMutation.isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      setRejectModal({
                        id: account.id,
                        name: isUpi
                          ? account.upiId || "UPI"
                          : `****${account.accountNumber?.slice(-4) || ""}`,
                      })
                    }
                    disabled={rejectMutation.isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Reject modal */}
      <Modal
        title={`Reject account ${rejectModal?.name || ""}`}
        open={!!rejectModal}
        onCancel={() => {
          setRejectModal(null);
          setRejectReason("");
        }}
        onOk={handleReject}
        okText="Reject"
        okButtonProps={{
          danger: true,
          disabled: !rejectReason.trim() || rejectMutation.isPending,
          loading: rejectMutation.isPending,
        }}
      >
        <div className="py-2">
          <label className="block text-xs font-medium text-foreground mb-1.5">
            Rejection reason
          </label>
          <Input.TextArea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter the reason for rejection"
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}
