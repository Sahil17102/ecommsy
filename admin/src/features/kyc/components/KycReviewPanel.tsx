import { useState } from "react";
import { Button, Popconfirm, Modal, Input, Spin, message } from "antd";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Building2,
  Hash,
} from "lucide-react";
import { useAdminKyc, useApproveKyc, useRejectKyc } from "../queries";
import { DocumentReviewCard } from "./DocumentReviewCard";
import { KYC_STATUS_LABELS } from "../config";
import { formatKeyword } from "@/lib/utils";
import { DOCUMENT_KEYS, type DocumentKey, type KycStatus } from "../types";

interface KycReviewPanelProps {
  userId: string;
}

const STATUS_STYLE: Record<KycStatus, string> = {
  not_submitted: "bg-surface-muted text-muted",
  pending:
    "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  approved:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

export function KycReviewPanel({ userId }: KycReviewPanelProps) {
  const { data: kyc, isLoading } = useAdminKyc(userId);
  const approveMutation = useApproveKyc(userId);
  const rejectMutation = useRejectKyc(userId);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spin />
      </div>
    );
  }

  if (!kyc) {
    return (
      <div className="bg-background-elevated border border-border-light rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={16} className="text-muted" />
          <h3 className="text-sm font-semibold text-foreground">
            KYC Verification
          </h3>
        </div>
        <p className="text-sm text-muted">
          KYC has not been started by this user.
        </p>
      </div>
    );
  }

  const handleApproveAll = () => {
    approveMutation.mutate(kyc.id, {
      onSuccess: () => message.success("KYC approved successfully"),
    });
  };

  const handleRejectAll = () => {
    if (!rejectionReason.trim()) {
      message.error("Please enter a rejection reason");
      return;
    }
    rejectMutation.mutate(
      { id: kyc.id, reason: rejectionReason.trim() },
      {
        onSuccess: () => {
          message.success("KYC rejected");
          setRejectModalOpen(false);
          setRejectionReason("");
        },
      },
    );
  };

  const uploadedDocs = DOCUMENT_KEYS.filter(
    (key: DocumentKey) => kyc[key]?.url && kyc[key]?.status !== "not_uploaded",
  );

  const showBulkActions = kyc.status === "pending";

  return (
    <div className="bg-background-elevated border border-border-light rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-border-light">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-bg flex items-center justify-center">
              <ShieldCheck size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground leading-tight">
                KYC Verification
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[kyc.status]}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    kyc.status === "approved"
                      ? "bg-emerald-500"
                      : kyc.status === "rejected"
                        ? "bg-red-500"
                        : kyc.status === "pending"
                          ? "bg-violet-500"
                          : "bg-muted/50"
                  }`}
                />
                {KYC_STATUS_LABELS[kyc.status]}
              </span>
            </div>
          </div>

          {showBulkActions && (
            <div className="flex items-center gap-2">
              <Popconfirm
                title="Approve all documents and verify KYC?"
                onConfirm={handleApproveAll}
                okText="Approve All"
              >
                <Button
                  size="small"
                  icon={<CheckCircle size={13} />}
                  loading={approveMutation.isPending}
                  className="!rounded-lg !text-xs !font-medium !text-emerald-700 dark:!text-emerald-400 !border-emerald-300 dark:!border-emerald-700 hover:!bg-emerald-50 dark:hover:!bg-emerald-950/30 hover:!border-emerald-400"
                >
                  Approve All
                </Button>
              </Popconfirm>
              <Button
                size="small"
                icon={<XCircle size={13} />}
                onClick={() => setRejectModalOpen(true)}
                className="!rounded-lg !text-xs !font-medium !text-red-600 dark:!text-red-400 !border-red-300 dark:!border-red-700 hover:!bg-red-50 dark:hover:!bg-red-950/30 hover:!border-red-400"
              >
                Reject All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Business details */}
      {kyc.businessStructure && (
        <div className="px-4 sm:px-5 py-3.5 border-b border-border-light bg-surface-muted/30">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Building2 size={14} className="text-muted shrink-0" />
              <span className="text-muted">Business Structure</span>
              <span className="font-medium text-foreground">
                {formatKeyword(kyc.businessStructure)}
              </span>
            </div>
            {kyc.companyType && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 size={14} className="text-muted shrink-0" />
                <span className="text-muted">Company Type</span>
                <span className="font-medium text-foreground">
                  {formatKeyword(kyc.companyType)}
                </span>
              </div>
            )}
            {kyc.gstin && (
              <div className="flex items-center gap-2 text-sm">
                <Hash size={14} className="text-muted shrink-0" />
                <span className="text-muted">GSTIN</span>
                <code className="text-xs px-1.5 py-0.5 rounded-md bg-surface-muted font-mono text-foreground border border-border-light">
                  {kyc.gstin}
                </code>
              </div>
            )}
            {kyc.cin && (
              <div className="flex items-center gap-2 text-sm">
                <Hash size={14} className="text-muted shrink-0" />
                <span className="text-muted">CIN</span>
                <code className="text-xs px-1.5 py-0.5 rounded-md bg-surface-muted font-mono text-foreground border border-border-light">
                  {kyc.cin}
                </code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document cards */}
      <div className="p-4 sm:p-5">
        {uploadedDocs.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Documents
              </h4>
              <span className="text-[11px] text-muted tabular-nums">
                {uploadedDocs.length} uploaded
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {uploadedDocs.map((key: DocumentKey) => (
                <DocumentReviewCard
                  key={key}
                  kycId={kyc.id}
                  userId={userId}
                  documentKey={key}
                  field={kyc[key]}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted py-2">
            No documents uploaded yet.
          </p>
        )}
      </div>

      {/* Reject all modal */}
      <Modal
        title="Reject KYC"
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleRejectAll}
        okText="Reject KYC"
        okButtonProps={{
          danger: true,
          loading: rejectMutation.isPending,
        }}
      >
        <p className="text-sm text-muted mb-3">
          Please provide a reason for rejecting this user's KYC:
        </p>
        <Input.TextArea
          rows={3}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Enter rejection reason..."
        />
      </Modal>
    </div>
  );
}
