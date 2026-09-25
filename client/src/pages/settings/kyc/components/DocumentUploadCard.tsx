import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Image as ImageIcon,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { DOCUMENT_LABELS, DOCUMENT_ACCEPT } from "../config";
import { useUploadKycDocument } from "../queries";
import type { DocumentField, DocumentKey } from "../types";

interface DocumentUploadCardProps {
  documentKey: DocumentKey;
  field: DocumentField;
}

const STATUS_CONFIG = {
  not_uploaded: {
    icon: Upload,
    label: "Not Uploaded",
    color: "text-muted",
    bg: "bg-background",
    border: "border-border-light border-dashed",
  },
  pending: {
    icon: Clock,
    label: "Under Review",
    color: "text-accent",
    bg: "bg-accent/[0.06]",
    border: "border-accent/20",
  },
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    color: "text-success",
    bg: "bg-success/5",
    border: "border-success/30",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    color: "text-error",
    bg: "bg-error/5",
    border: "border-error/30",
  },
};

export function DocumentUploadCard({
  documentKey,
  field,
}: DocumentUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const uploadMutation = useUploadKycDocument();

  /** Fetch document via authenticated API and create a blob URL */
  const openPreview = useCallback(async () => {
    if (!field?.url || !field.mime) return;
    setShowPreview(true);

    // If we already have a blob URL, reuse it
    if (previewBlobUrl) return;

    setPreviewLoading(true);
    try {
      // Derive extension from the stored URL (e.g. "kyc/userId/cancelledCheque.webp" → "webp")
      const ext = field.url.split(".").pop() || "jpg";
      const res = await api.get(`/kyc/document/${documentKey}/${documentKey}.${ext}`, {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(res.data);
      setPreviewBlobUrl(blobUrl);
    } catch {
      toast.error("Failed to load document preview");
      setShowPreview(false);
    } finally {
      setPreviewLoading(false);
    }
  }, [documentKey, field?.url, field?.mime, previewBlobUrl]);

  const status = field?.status || "not_uploaded";
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  const label = DOCUMENT_LABELS[documentKey];
  const accept = DOCUMENT_ACCEPT[documentKey];

  const isSelfie = documentKey === "selfie";
  const canUpload =
    !isSelfie && (status === "not_uploaded" || status === "rejected");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5 MB");
      return;
    }

    // Show preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    try {
      await uploadMutation.mutateAsync({ documentKey, file });
      toast.success(`${label} uploaded successfully`);
    } catch (err: any) {
      const message =
        err?.response?.data?.error || err?.message || "Upload failed";
      toast.error(message);
      setPreview(null);
    }

    // Reset input
    e.target.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 ${config.border} ${config.bg} p-4 transition-all`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Document icon or preview */}
          <div className="shrink-0 w-10 h-10 rounded-lg bg-background-elevated flex items-center justify-center overflow-hidden">
            {preview || (field?.url && field.mime?.startsWith("image/")) ? (
              <ImageIcon className="w-5 h-5 text-primary" />
            ) : field?.url && field.mime === "application/pdf" ? (
              <FileText className="w-5 h-5 text-error" />
            ) : (
              <Upload className="w-5 h-5 text-muted" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {label}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
              <span className={`text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Preview button — shown when document has been uploaded */}
          {field?.url && status !== "not_uploaded" && (
            <button
              type="button"
              onClick={openPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-foreground bg-background hover:bg-primary/[0.06] hover:text-primary border border-border-light transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </button>
          )}

          {/* Selfie: must be re-taken via camera, not uploaded */}
          {isSelfie && status === "rejected" && (
            <span className="text-[11px] font-medium text-muted">
              Re-take via camera
            </span>
          )}

          {/* Upload button (non-selfie docs only) */}
          {canUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-primary/[0.06] hover:bg-primary/[0.12] transition-colors disabled:opacity-50"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {status === "rejected" ? "Re-upload" : "Upload"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rejection reason */}
      {status === "rejected" && field?.rejectionReason && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-error/[0.06] border border-error/20">
          <p className="text-xs text-error font-medium">
            Reason: {field.rejectionReason}
          </p>
        </div>
      )}

      {/* Document preview modal */}
      <AnimatePresence>
        {showPreview && field?.url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border-light">
                <p className="text-sm font-bold text-foreground">{label}</p>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-background-elevated transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Document content */}
              <div className="p-4 flex items-center justify-center overflow-auto max-h-[calc(85vh-56px)]">
                {previewLoading && (
                  <div className="flex flex-col items-center gap-2 py-16">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-xs text-muted">Loading document...</p>
                  </div>
                )}
                {!previewLoading && previewBlobUrl && (
                  field.mime === "application/pdf" ? (
                    <iframe
                      src={previewBlobUrl}
                      title={label}
                      className="w-full h-[70vh] rounded-lg border border-border-light"
                    />
                  ) : (
                    <img
                      src={previewBlobUrl}
                      alt={label}
                      className="max-w-full max-h-[70vh] rounded-lg object-contain"
                    />
                  )
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
