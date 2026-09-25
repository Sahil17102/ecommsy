import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useKyc } from "@/pages/settings/kyc/queries";

export function KycBanner() {
  const { data: kyc } = useKyc();
  const [dismissed, setDismissed] = useState(false);

  // Only show if KYC is not approved and not dismissed
  if (dismissed || !kyc || kyc.status === "approved") return null;

  const isRejected = kyc.status === "rejected";
  const isPending = kyc.status === "pending";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`relative rounded-xl border p-4 mb-6 flex items-center gap-4 ${
          isRejected
            ? "bg-error/[0.06] border-error/20"
            : isPending
              ? "bg-primary/[0.06] border-primary/20"
              : "bg-accent/[0.06] border-accent/20"
        }`}
      >
        <div
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            isRejected
              ? "bg-error/10"
              : isPending
                ? "bg-primary/10"
                : "bg-accent/10"
          }`}
        >
          <ShieldAlert
            className={`w-5 h-5 ${
              isRejected
                ? "text-error"
                : isPending
                  ? "text-primary"
                  : "text-accent"
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-bold ${
              isRejected
                ? "text-error"
                : isPending
                  ? "text-primary"
                  : "text-accent"
            }`}
          >
            {isRejected
              ? "KYC Rejected — Action Required"
              : isPending
                ? "KYC Under Review"
                : "Complete Your KYC"}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {isRejected
              ? "Please review rejection reasons and re-upload your documents."
              : isPending
                ? "Your documents are being reviewed. This usually takes 1-2 business days."
                : "Verify your identity to unlock COD orders, wallet withdrawals, and more."}
          </p>
        </div>

        <Link
          to="/settings/kyc"
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary-hover transition-colors"
        >
          {isRejected ? "Fix Now" : isPending ? "View Status" : "Start KYC"}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {!isPending && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
