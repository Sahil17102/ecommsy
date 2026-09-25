import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useChangePassword } from "./queries";
import {
  changePasswordSchema,
  setPasswordSchema,
  defaultChangePasswordValues,
  type ChangePasswordFormValues,
} from "./schema";

const inputClass =
  "w-full h-11 px-4 pr-10 text-sm font-medium text-foreground bg-background rounded-xl border-2 border-border-light outline-none transition-all placeholder:text-tertiary hover:border-primary/20 focus:border-primary focus:bg-primary/[0.03] focus:shadow-md focus:shadow-primary/10";
const labelClass = "block text-xs font-semibold text-foreground mb-1.5";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const hasPassword = user?.hasPassword ?? false;
  const changeMutation = useChangePassword();
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(hasPassword ? changePasswordSchema : setPasswordSchema),
    defaultValues: defaultChangePasswordValues,
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      await changeMutation.mutateAsync({
        currentPassword: hasPassword ? values.currentPassword : undefined,
        newPassword: values.newPassword,
      });
      toast.success(hasPassword ? "Password updated successfully" : "Password set successfully");
      reset(defaultChangePasswordValues);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Failed to update password";
      toast.error(msg);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {hasPassword ? "Change Password" : "Set Password"}
            </h2>
            <p className="text-xs text-muted">
              {hasPassword
                ? "Update the password you use to sign in to your account."
                : "You signed up via OTP or Google. Set a password to also sign in with email and password."}
            </p>
          </div>
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-border-light bg-background-elevated p-5 sm:p-6 space-y-5"
      >
        {hasPassword && (
          <PasswordField
            label="Current password"
            error={errors.currentPassword?.message}
            show={show.current}
            onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
            inputProps={register("currentPassword")}
          />
        )}
        <PasswordField
          label="New password"
          error={errors.newPassword?.message}
          show={show.next}
          onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
          inputProps={register("newPassword")}
          helper="Minimum 8 characters."
        />
        <PasswordField
          label="Confirm new password"
          error={errors.confirmPassword?.message}
          show={show.confirm}
          onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
          inputProps={register("confirmPassword")}
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || changeMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {(isSubmitting || changeMutation.isPending) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {hasPassword ? "Update password" : "Set password"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

function PasswordField({
  label,
  error,
  helper,
  show,
  onToggle,
  inputProps,
}: {
  label: string;
  error?: string;
  helper?: string;
  show: boolean;
  onToggle: () => void;
  inputProps: UseFormRegisterReturn;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className={inputClass}
          autoComplete="off"
          {...inputProps}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {helper && !error && <p className="mt-1 text-[11px] text-muted">{helper}</p>}
      {error && <p className="mt-1 text-[11px] text-error">{error}</p>}
    </div>
  );
}
