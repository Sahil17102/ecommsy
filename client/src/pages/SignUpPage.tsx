import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/contexts/AuthContext";
import { AppLogo } from "@/components/common/AppLogo";
import { useSendOtp, useVerifyOtp, useLoginWithPassword } from "@/queries/useAuth";
import { BrandingPanel } from "@/components/auth/BrandingPanel";
import { IdentifierStep } from "@/components/auth/IdentifierStep";
import { OtpVerificationStep } from "@/components/auth/OtpVerificationStep";

// ── Constants ──

const RESEND_COOLDOWN = 30; // seconds

// ── Types ──

type LoginMethod = "otp" | "password";
type AuthStep = "identifier" | "otp";

// ── Main page ──

export function SignUpPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  // OTP flow state
  const [step, setStep] = useState<AuthStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Login method
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("otp");

  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();
  const loginPasswordMutation = useLoginWithPassword();

  const loading = sendOtpMutation.isPending || verifyOtpMutation.isPending || loginPasswordMutation.isPending;
  const error = sendOtpMutation.error?.message ?? verifyOtpMutation.error?.message ?? loginPasswordMutation.error?.message ?? null;

  // Redirect if already logged in
  useEffect(() => {
    if (!user) return;
    navigate(user.onboardingComplete ? "/home" : "/onboarding", { replace: true });
  }, [user, navigate]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  // ── Helpers ──

  function afterLogin(resultUser: User, newUser = false) {
    login(resultUser);
    navigate(newUser || !resultUser.onboardingComplete ? "/onboarding" : "/home", {
      replace: true,
    });
  }

  function resetMutations() {
    sendOtpMutation.reset();
    verifyOtpMutation.reset();
    loginPasswordMutation.reset();
  }

  // ── OTP flow ──

  async function sendOtp() {
    resetMutations();
    const result = await sendOtpMutation.mutateAsync(identifier.trim());
    setIsNewUser(result.isNewUser);
    setDevOtp(result.devOtp ?? null);
    setStep("otp");
    setResendTimer(RESEND_COOLDOWN);
  }

  async function handleIdentifierSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    try { await sendOtp(); } catch { /* captured by mutation */ }
  }

  async function handleOtpComplete(code: string) {
    resetMutations();
    try {
      const result = await verifyOtpMutation.mutateAsync({ identifier: identifier.trim(), code });
      afterLogin(result.user, result.isNewUser);
    } catch { /* captured by mutation */ }
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    try { await sendOtp(); } catch { /* captured by mutation */ }
  }

  // ── Password flow ──

  async function handlePasswordSubmit(password: string) {
    resetMutations();
    try {
      const result = await loginPasswordMutation.mutateAsync({ identifier: identifier.trim(), password });
      afterLogin(result.user);
    } catch { /* captured by mutation */ }
  }

  function switchLoginMethod(method: LoginMethod) {
    setLoginMethod(method);
    resetMutations();
  }

  function goBack() {
    setStep("identifier");
    resetMutations();
  }

  return (
    <div className="min-h-screen flex bg-[#f6f5ff]" style={{ '--color-primary': '#4E4AC3', '--color-primary-hover': '#332D7A', '--color-accent': '#4E4AC3', '--color-accent-hover': '#332D7A' } as React.CSSProperties}>
      {/* Left branding panel (desktop only) */}
      <BrandingPanel />

      {/* Right form panel */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#fbfbff]">
        <div className="absolute inset-0 opacity-70" style={{
          backgroundImage:
            "linear-gradient(rgba(78,74,195,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(78,74,195,.07) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }} />
        {/* Mobile logo bar */}
        <div className="lg:hidden flex items-center justify-between px-5 h-16 border-b border-border-light">
          <AppLogo size="sm" />
          <a href={import.meta.env.VITE_MARKETING_URL || "https://boxsbeyond.com"} className="text-xs font-medium text-muted hover:text-foreground transition-colors no-underline">
            Back to home
          </a>
        </div>

        <div className="relative flex-1 flex items-center justify-center px-5 sm:px-8 py-10 sm:py-16">
          <div className="w-full max-w-md rounded-[28px] border border-[#dddafa] bg-white/90 p-7 shadow-2xl shadow-[#332d7a]/10 backdrop-blur">
            <AnimatePresence mode="wait">
              {step === "identifier" ? (
                <IdentifierStep
                  loginMethod={loginMethod}
                  identifier={identifier}
                  loading={loading}
                  error={error}
                  onLoginMethodChange={switchLoginMethod}
                  onIdentifierChange={setIdentifier}
                  onOtpSubmit={handleIdentifierSubmit}
                  onPasswordSubmit={handlePasswordSubmit}
                  onGoogleSuccess={afterLogin}
                />
              ) : (
                <OtpVerificationStep
                  identifier={identifier}
                  isNewUser={isNewUser}
                  devOtp={devOtp}
                  loading={loading}
                  error={error}
                  resendTimer={resendTimer}
                  onBack={goBack}
                  onOtpComplete={handleOtpComplete}
                  onResend={handleResend}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
