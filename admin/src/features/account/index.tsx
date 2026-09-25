import { useState } from "react";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input, Modal } from "antd";
import { toast } from "sonner";
import {
  UserCircle2,
  Mail,
  Phone,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Building,
  AlertTriangle,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useChangePassword, useLogout } from "@/features/auth/queries";
import { useNavigate } from "react-router-dom";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const changePassword = useChangePassword();
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onChange",
  });

  const onSubmit = async (values: PasswordFormValues) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      setShowSignOutModal(true);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to update password";
      toast.error(msg);
    }
  };

  const handleSignOutNow = async () => {
    await logoutMutation.mutateAsync();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <PageHeader
        icon={UserCircle2}
        title="Account"
        subtitle="Your profile and security settings."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left: profile card + role badge ── */}
        <div className="space-y-4">
          <section className="bg-background-elevated rounded-2xl border border-border-light p-5">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent text-white text-xl font-bold flex items-center justify-center mb-3">
                {(user.name ?? user.email ?? "?")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join("")}
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {user.name ?? "Unnamed"}
              </h3>
              {user.designation && (
                <p className="text-xs text-muted">{user.designation}</p>
              )}
              <span
                className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                  user.role === "superadmin"
                    ? "bg-violet-100 text-violet-700"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <ShieldCheck size={10} />
                {user.role === "superadmin" ? "Superadmin" : user.roleLabel ?? "Team member"}
              </span>
            </div>

            <ul className="space-y-2 text-xs">
              {user.email && (
                <li className="flex items-center gap-2">
                  <Mail size={13} className="text-muted shrink-0" />
                  <span className="text-foreground truncate">{user.email}</span>
                </li>
              )}
              {user.phone && (
                <li className="flex items-center gap-2">
                  <Phone size={13} className="text-muted shrink-0" />
                  <span className="text-foreground">{user.phone}</span>
                </li>
              )}
              {user.role === "admin" && (
                <li className="flex items-center gap-2">
                  <Building size={13} className="text-muted shrink-0" />
                  <span className="text-foreground">
                    {user.assignedSellerIds.length} seller
                    {user.assignedSellerIds.length === 1 ? "" : "s"} assigned
                  </span>
                </li>
              )}
            </ul>
          </section>

          <section className="bg-background-elevated rounded-2xl border border-border-light p-4">
            <p className="text-[11px] text-muted leading-relaxed">
              Your name, email, and phone can only be updated by a superadmin.
              Need a change? Reach out to your administrator.
            </p>
          </section>
        </div>

        {/* ── Right: password change form ── */}
        <div className="lg:col-span-2">
          <section className="bg-background-elevated rounded-2xl border border-border-light p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Change password</h2>
            </div>
            <p className="text-[11px] text-muted mb-5">
              Pick a strong password — at least 8 characters, mix of letters, numbers, and symbols recommended.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1.5">
                  Current password <span className="text-error">*</span>
                </label>
                <Controller
                  control={control}
                  name="currentPassword"
                  render={({ field }) => (
                    <Input
                      size="middle"
                      type={showCurrent ? "text" : "password"}
                      placeholder="Enter your current password"
                      status={errors.currentPassword ? "error" : undefined}
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowCurrent((v) => !v)}
                          className="text-muted hover:text-foreground transition-colors"
                          aria-label={showCurrent ? "Hide password" : "Show password"}
                        >
                          {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      }
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.currentPassword && (
                  <p className="text-[10px] text-error mt-1">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted block mb-1.5">
                  New password <span className="text-error">*</span>
                </label>
                <Controller
                  control={control}
                  name="newPassword"
                  render={({ field }) => (
                    <Input
                      size="middle"
                      type={showNew ? "text" : "password"}
                      placeholder="At least 8 characters"
                      status={errors.newPassword ? "error" : undefined}
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowNew((v) => !v)}
                          className="text-muted hover:text-foreground transition-colors"
                          aria-label={showNew ? "Hide password" : "Show password"}
                        >
                          {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      }
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.newPassword && (
                  <p className="text-[10px] text-error mt-1">{errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted block mb-1.5">
                  Confirm new password <span className="text-error">*</span>
                </label>
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <Input
                      size="middle"
                      type={showNew ? "text" : "password"}
                      placeholder="Type it again to confirm"
                      status={errors.confirmPassword ? "error" : undefined}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.confirmPassword && (
                  <p className="text-[10px] text-error mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200/50 dark:border-violet-500/20">
                <AlertTriangle
                  size={13}
                  className="text-violet-600 dark:text-violet-400 mt-0.5 shrink-0"
                />
                <p className="text-[11px] text-violet-700 dark:text-violet-300 leading-snug">
                  After changing your password, you'll be signed out everywhere and need to sign in again with the new password.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold transition-all ${
                    isSubmitting
                      ? "bg-border-light text-muted cursor-not-allowed"
                      : "bg-gradient-to-r from-primary to-accent text-white shadow-md hover:shadow-lg"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Updating…
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Update password
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* Post-change sign out prompt */}
      <Modal
        open={showSignOutModal}
        onCancel={() => setShowSignOutModal(false)}
        onOk={handleSignOutNow}
        okText="Sign out now"
        cancelText="Stay signed in"
        title={null}
      >
        <div className="py-2">
          <h3 className="text-base font-semibold text-foreground mb-2">
            Password updated successfully
          </h3>
          <p className="text-sm text-muted">
            You can keep working in this session, or sign out now and use your new password the next time you log in.
          </p>
        </div>
      </Modal>
    </motion.div>
  );
}
