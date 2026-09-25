import { useState, useCallback } from "react";
import { Button, Popconfirm, Modal, Input, message } from "antd";
import {
  CheckCircle,
  XCircle,
  FileText,
  Image as ImageIcon,
  Download,
  Upload,
  Eye,
  AlertCircle,
} from "lucide-react";
import { DOCUMENT_LABELS } from "../config";
import { useApproveDocument, useRejectDocument } from "../queries";
import { fetchDocumentBlob } from "../api";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import type { DocumentField, DocumentKey, DocumentStatus } from "../types";

interface DocumentReviewCardProps {
  kycId: string;
  userId: string;
  documentKey: DocumentKey;
  field: DocumentField;
}

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; className: string; dotClass: string }
> = {
  not_uploaded: {
    label: "Not Uploaded",
    className: "text-muted bg-surface-muted",
    dotClass: "bg-muted/50",
  },
  pending: {
    label: "Pending",
    className: "text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/40",
    dotClass: "bg-violet-500",
  },
  approved: {
    label: "Approved",
    className: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
    dotClass: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    className: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40",
    dotClass: "bg-red-500",
  },
};

export function DocumentReviewCard({
  kycId,
  userId,
  documentKey,
  field,
}: DocumentReviewCardProps) {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    "preview" | "download" | null
  >(null);

  const approveMutation = useApproveDocument(userId);
  const rejectMutation = useRejectDocument(userId);

  const status = field?.status || "not_uploaded";
  const label = DOCUMENT_LABELS[documentKey];
  const isImage = field?.mime?.startsWith("image/");
  const isPdf = field?.mime === "application/pdf";
  const hasFile = !!field?.url;
  const filename = field?.url?.split("/").pop() || `${documentKey}.bin`;
  const statusCfg = STATUS_CONFIG[status];

  const withBlob = useCallback(
    async (source: "preview" | "download", action: (url: string) => void) => {
      if (blobUrl) {
        action(blobUrl);
        return;
      }
      setLoadingAction(source);
      try {
        const url = await fetchDocumentBlob(userId, documentKey, filename);
        setBlobUrl(url);
        action(url);
      } catch {
        message.error("Failed to load document");
      } finally {
        setLoadingAction(null);
      }
    },
    [blobUrl, userId, documentKey, filename],
  );

  const handlePreview = () => withBlob("preview", () => setPreviewOpen(true));

  const handleDownload = () =>
    withBlob("download", (url) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    });

  const handleApprove = () => {
    approveMutation.mutate(
      { id: kycId, key: documentKey },
      { onSuccess: () => message.success(`${label} approved`) },
    );
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      message.error("Please enter a rejection reason");
      return;
    }
    rejectMutation.mutate(
      { id: kycId, key: documentKey, reason: rejectionReason.trim() },
      {
        onSuccess: () => {
          message.success(`${label} rejected`);
          setRejectModalOpen(false);
          setRejectionReason("");
        },
      },
    );
  };

  return (
    <div className="group relative bg-background border border-border-light rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/25 hover:shadow-sm">
      {/* Card body */}
      <div className="p-3.5 sm:p-4">
        {/* Top section: icon, label, status badge, action buttons */}
        <div className="flex items-start gap-3">
          {/* Document icon */}
          <div
            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
              status === "approved"
                ? "bg-emerald-50 dark:bg-emerald-950/30"
                : status === "rejected"
                  ? "bg-red-50 dark:bg-red-950/30"
                  : "bg-primary-bg"
            }`}
          >
            {!hasFile ? (
              <Upload size={16} className="text-muted" />
            ) : isImage ? (
              <ImageIcon
                size={16}
                className={
                  status === "approved"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : status === "rejected"
                      ? "text-red-500 dark:text-red-400"
                      : "text-primary"
                }
              />
            ) : isPdf ? (
              <FileText
                size={16}
                className={
                  status === "rejected"
                    ? "text-red-500 dark:text-red-400"
                    : "text-red-500"
                }
              />
            ) : (
              <FileText size={16} className="text-muted" />
            )}
          </div>

          {/* Label + status */}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-foreground leading-tight">
              {label}
            </p>
            <span
              className={`inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusCfg.className}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`}
              />
              {statusCfg.label}
            </span>
          </div>

          {/* Action buttons */}
          {hasFile && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handlePreview}
                disabled={loadingAction === "preview"}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-50"
                title="Preview"
              >
                <Eye size={15} />
              </button>
              <button
                onClick={handleDownload}
                disabled={loadingAction === "download"}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-50"
                title="Download"
              >
                <Download size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Rejection reason */}
        {status === "rejected" && field?.rejectionReason && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50/80 dark:bg-red-950/20 border border-red-200/60 dark:border-red-800/30">
            <AlertCircle
              size={13}
              className="text-red-500 dark:text-red-400 shrink-0 mt-0.5"
            />
            <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
              {field.rejectionReason}
            </p>
          </div>
        )}
      </div>

      {/* Action footer — only for pending documents */}
      {hasFile && status === "pending" && (
        <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-surface-muted/50 border-t border-border-light">
          <Popconfirm
            title={`Approve ${label}?`}
            onConfirm={handleApprove}
            okText="Approve"
          >
            <Button
              size="small"
              icon={<CheckCircle size={13} />}
              loading={approveMutation.isPending}
              className="!rounded-lg !text-xs !font-medium !text-emerald-700 dark:!text-emerald-400 !border-emerald-300 dark:!border-emerald-700 hover:!bg-emerald-50 dark:hover:!bg-emerald-950/30 hover:!border-emerald-400"
            >
              Approve
            </Button>
          </Popconfirm>
          <Button
            size="small"
            icon={<XCircle size={13} />}
            onClick={() => setRejectModalOpen(true)}
            className="!rounded-lg !text-xs !font-medium !text-red-600 dark:!text-red-400 !border-red-300 dark:!border-red-700 hover:!bg-red-50 dark:hover:!bg-red-950/30 hover:!border-red-400"
          >
            Reject
          </Button>
        </div>
      )}

      {/* Preview modal */}
      {blobUrl && (
        <DocumentPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          url={blobUrl}
          title={label}
          mime={field?.mime}
        />
      )}

      {/* Rejection reason modal */}
      <Modal
        title={`Reject ${label}`}
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleReject}
        okText="Reject Document"
        okButtonProps={{
          danger: true,
          loading: rejectMutation.isPending,
        }}
      >
        <p className="text-sm text-muted mb-3">
          Please provide a reason for rejecting this document:
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
