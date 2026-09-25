import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { animationConfig } from "@/config/animations";
import { OtpInput } from "./OtpInput";
import { ErrorBanner } from "./ErrorBanner";

const slideVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

interface OtpVerificationStepProps {
  identifier: string;
  isNewUser: boolean;
  devOtp: string | null;
  loading: boolean;
  error: string | null;
  resendTimer: number;
  onBack: () => void;
  onOtpComplete: (code: string) => void;
  onResend: () => void;
}

export function OtpVerificationStep({
  identifier,
  isNewUser,
  devOtp,
  loading,
  error,
  resendTimer,
  onBack,
  onOtpComplete,
  onResend,
}: OtpVerificationStepProps) {
  return (
    <motion.div
      key="otp"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.25, ease: animationConfig.ease.out }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {isNewUser ? "Welcome!" : "Welcome back!"}
        </h2>
        <p className="text-sm text-muted">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-foreground">{identifier}</span>
        </p>
      </div>

      <div className="mb-6">
        {devOtp && (
          <p className="mb-4 rounded-xl border border-[#dddafa] bg-[#f6f5ff] px-4 py-3 text-center text-sm text-foreground">
            Local development OTP: <strong className="tracking-[0.2em]">{devOtp}</strong>
          </p>
        )}
        <OtpInput onComplete={onOtpComplete} disabled={loading} length={6} />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-muted">Verifying...</span>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      <p className="text-center text-sm text-muted mt-4">
        Didn't receive the code?{" "}
        {resendTimer > 0 ? (
          <span className="text-tertiary">Resend in {resendTimer}s</span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={loading}
            className="text-primary font-semibold hover:text-primary-hover transition-colors disabled:opacity-50"
          >
            Resend
          </button>
        )}
      </p>
    </motion.div>
  );
}
