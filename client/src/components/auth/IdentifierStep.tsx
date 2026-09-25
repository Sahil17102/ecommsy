import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, Mail, UserRound } from "lucide-react";
import { animationConfig } from "@/config/animations";
import { GoogleButton } from "./GoogleButton";
import { ErrorBanner } from "./ErrorBanner";
import { SubmitButton } from "./SubmitButton";
import type { User } from "@/contexts/AuthContext";

type LoginMethod = "otp" | "password";
const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const slideVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const formSlideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -40 }),
};

interface IdentifierStepProps {
  loginMethod: LoginMethod;
  identifier: string;
  loading: boolean;
  error: string | null;
  onLoginMethodChange: (method: LoginMethod) => void;
  onIdentifierChange: (value: string) => void;
  onOtpSubmit: (e: React.FormEvent) => void;
  onPasswordSubmit: (password: string) => void;
  onGoogleSuccess: (user: User, isNewUser?: boolean) => void;
}

export function IdentifierStep({
  loginMethod,
  identifier,
  loading,
  error,
  onLoginMethodChange,
  onIdentifierChange,
  onOtpSubmit,
  onPasswordSubmit,
  onGoogleSuccess,
}: IdentifierStepProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [slideDir, setSlideDir] = useState(1);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLoadingChange = useCallback((isLoading: boolean) => {
    setGoogleLoading(isLoading);
  }, []);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    onPasswordSubmit(password);
  }

  function handleMethodChange(method: LoginMethod) {
    setSlideDir(method === "password" ? 1 : -1);
    onLoginMethodChange(method);
  }

  // Email-only identifier input
  function renderIdentifierInput() {
    return (
      <div
        className={`relative flex items-center h-12 rounded-xl border transition-all duration-200 ${
          focusedField === "identifier"
            ? "border-primary/40 bg-primary/[0.02] ring-[3px] ring-primary-bg"
            : "border-border-light bg-surface-muted/50 hover:border-border"
        }`}
      >
        <span className={`flex items-center justify-center w-10 h-full transition-colors ${focusedField === "identifier" ? "text-primary" : "text-tertiary"}`}>
          <Mail className="w-4 h-4" />
        </span>
        <input
          type="email"
          inputMode="email"
          value={identifier}
          onChange={(e) => onIdentifierChange(e.target.value)}
          onFocus={() => setFocusedField("identifier")}
          onBlur={() => setFocusedField(null)}
          placeholder="you@company.com"
          autoFocus
          className="flex-1 h-full pr-3 text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary"
        />
      </div>
    );
  }

  return (
    <motion.div
      key="identifier"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.25, ease: animationConfig.ease.out }}
    >
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5">Get started</h2>
        <p className="text-sm text-muted">
          {loginMethod === "password"
            ? "Sign in with your email or phone number"
            : "Sign in or create your account to continue"}
        </p>
      </div>

      {/* Google button */}
      {GOOGLE_ENABLED && (
        <>
          <GoogleButton onSuccess={onGoogleSuccess} disabled={loading} onLoadingChange={handleGoogleLoadingChange} />
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border-light" />
            <span className="text-xs text-tertiary font-medium">or</span>
            <div className="flex-1 h-px bg-border-light" />
          </div>
        </>
      )}

      {/* Login method tabs */}
      <div className="flex items-center border-b border-border-light mb-5">
        {(["otp", "password"] as const).map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => handleMethodChange(method)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              loginMethod === method ? "text-primary" : "text-muted hover:text-foreground"
            }`}
          >
            {method === "otp" ? "OTP" : "Password"}
            {loginMethod === method && (
              <motion.div
                layoutId="method-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Animated form area */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={slideDir}>
          {loginMethod === "otp" ? (
            <motion.div
              key="otp-form"
              custom={slideDir}
              variants={formSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: animationConfig.ease.out }}
            >
              <form onSubmit={onOtpSubmit} className="space-y-4">
                {renderIdentifierInput()}
                {error && <ErrorBanner message={error} />}
                <SubmitButton loading={loading} label="Continue" disabled={googleLoading} />
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="password-form"
              custom={slideDir}
              variants={formSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: animationConfig.ease.out }}
            >
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* Email or phone identifier */}
                <div
                  className={`relative flex items-center h-12 rounded-xl border transition-all duration-200 ${
                    focusedField === "pwd-identifier"
                      ? "border-primary/40 bg-primary/[0.02] ring-[3px] ring-primary-bg"
                      : "border-border-light bg-surface-muted/50 hover:border-border"
                  }`}
                >
                  <span className={`flex items-center justify-center w-10 h-full transition-colors ${focusedField === "pwd-identifier" ? "text-primary" : "text-tertiary"}`}>
                    <UserRound className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    inputMode="email"
                    value={identifier}
                    onChange={(e) => onIdentifierChange(e.target.value)}
                    onFocus={() => setFocusedField("pwd-identifier")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Email or 10-digit phone number"
                    autoFocus
                    className="flex-1 h-full pr-3 text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary"
                  />
                </div>

                <div
                  className={`flex items-center h-12 rounded-xl border transition-all duration-200 ${
                    focusedField === "password"
                      ? "border-primary/40 bg-primary/[0.02] ring-[3px] ring-primary-bg"
                      : "border-border-light bg-surface-muted/50 hover:border-border"
                  }`}
                >
                  <span className={`flex items-center justify-center w-10 h-full transition-colors ${focusedField === "password" ? "text-primary" : "text-tertiary"}`}>
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Your password"
                    className="flex-1 h-full text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                    className="px-3 text-tertiary hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && <ErrorBanner message={error} />}
                <SubmitButton loading={loading} label="Sign in" disabled={googleLoading} />
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-center text-xs text-tertiary mt-4 leading-relaxed">
        By continuing, you agree to our{" "}
        <Link to="/terms" className="text-muted hover:text-foreground transition-colors no-underline">Terms</Link>
        {" "}and{" "}
        <Link to="/privacy" className="text-muted hover:text-foreground transition-colors no-underline">Privacy Policy</Link>
      </p>
    </motion.div>
  );
}
