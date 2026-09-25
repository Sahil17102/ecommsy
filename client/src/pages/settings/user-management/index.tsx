import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Plus,
  KeyRound,
  Loader2,
  Copy,
  Check,
  X,
  Mail,
  Phone,
  UserX,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useTeamMembers,
  useCreateTeamMember,
  useToggleTeamMemberActive,
  useResetTeamMemberPassword,
} from "./queries";
import {
  createTeamMemberSchema,
  defaultCreateTeamMemberValues,
  type CreateTeamMemberFormValues,
} from "./schema";
import type { TeamMember } from "./types";
import { useAuth } from "@/contexts/AuthContext";

const inputClass =
  "w-full h-11 px-4 text-sm font-medium text-foreground bg-background rounded-xl border-2 border-border-light outline-none transition-all placeholder:text-tertiary hover:border-primary/20 focus:border-primary focus:bg-primary/[0.03] focus:shadow-md focus:shadow-primary/10";

export default function UserManagementPage() {
  const { user } = useAuth();
  const isOwner = user?.teamRole === "owner";
  const { data: members = [], isLoading } = useTeamMembers();
  const createMutation = useCreateTeamMember();
  const toggleActiveMutation = useToggleTeamMemberActive();
  const resetMutation = useResetTeamMemberPassword();

  const [showAddForm, setShowAddForm] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    member: TeamMember;
    password: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "reset" | "toggleActive";
    member: TeamMember;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamMemberFormValues>({
    resolver: zodResolver(createTeamMemberSchema),
    defaultValues: defaultCreateTeamMemberValues,
  });

  const onSubmit = async (values: CreateTeamMemberFormValues) => {
    try {
      await createMutation.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
      });
      toast.success("Team member added");
      reset(defaultCreateTeamMemberValues);
      setShowAddForm(false);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "Failed to add member";
      toast.error(msg);
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      await toggleActiveMutation.mutateAsync(member.id);
      toast.success(
        member.isActive ? "Team member marked as inactive" : "Team member marked as active",
      );
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Failed to update status");
    } finally {
      setConfirmAction(null);
    }
  };

  const handleReset = async (member: TeamMember) => {
    try {
      const result = await resetMutation.mutateAsync(member.id);
      setTempPasswordModal({ member, password: result.tempPassword });
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Failed to reset password");
    } finally {
      setConfirmAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
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
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground">User Management</h2>
              <p className="text-xs text-muted">
                Add team members to collaborate on your account. They'll see the same orders, wallet, and settings.
              </p>
            </div>
          </div>
        </div>

        {isOwner && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add member
          </button>
        )}
      </div>

      {!isOwner && (
        <div className="rounded-lg border border-border-light bg-background-elevated p-4 text-sm text-muted">
          You're signed in as a team member. Only the account owner can add or remove team members.
        </div>
      )}

      {/* Add member form */}
      <AnimatePresence>
        {showAddForm && isOwner && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit(onSubmit)}
            className="overflow-hidden rounded-xl border border-border-light bg-background-elevated"
          >
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Add a new team member</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    reset(defaultCreateTeamMemberValues);
                  }}
                  className="text-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First name" error={errors.firstName?.message}>
                  <input
                    {...register("firstName")}
                    className={inputClass}
                    placeholder="Anita"
                  />
                </Field>
                <Field label="Last name" error={errors.lastName?.message}>
                  <input
                    {...register("lastName")}
                    className={inputClass}
                    placeholder="Sharma"
                  />
                </Field>
                <Field label="Email" error={errors.email?.message}>
                  <input
                    {...register("email")}
                    type="email"
                    className={inputClass}
                    placeholder="anita@example.com"
                  />
                </Field>
                <Field label="Phone (optional)" error={errors.phone?.message}>
                  <input
                    {...register("phone")}
                    className={inputClass}
                    placeholder="9876543210"
                  />
                </Field>
                <Field label="Initial password" error={errors.password?.message}>
                  <input
                    {...register("password")}
                    type="text"
                    className={inputClass}
                    placeholder="Min 8 characters"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Share this with the team member. They can change it later from Settings → Change Password.
                  </p>
                </Field>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    reset(defaultCreateTeamMemberValues);
                  }}
                  className="rounded-lg border border-border-light px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {(isSubmitting || createMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Add member
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Members list */}
      <div className="rounded-xl border border-border-light bg-background-elevated">
        <div className="border-b border-border-light px-5 py-3">
          <h3 className="text-sm font-bold text-foreground">
            Team members <span className="font-normal text-muted">({members.length})</span>
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : members.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-muted/40" />
            <p className="text-sm font-medium text-foreground">No team members yet</p>
            <p className="mt-1 text-xs text-muted">
              {isOwner
                ? 'Click "Add member" to invite your first teammate.'
                : "Your account owner hasn't added any other team members."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border-light">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {m.name ?? m.email ?? "—"}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        m.isActive
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {m.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {m.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {m.email}
                      </span>
                    )}
                    {m.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {m.phone}
                      </span>
                    )}
                  </div>
                </div>

                {isOwner && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setConfirmAction({ type: "reset", member: m })}
                      disabled={resetMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-md border border-border-light px-2 py-1.5 text-xs font-medium text-foreground hover:bg-background disabled:opacity-50"
                      title="Reset password"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Reset
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: "toggleActive", member: m })}
                      disabled={toggleActiveMutation.isPending}
                      className={`inline-flex items-center gap-1 rounded-md border border-border-light px-2 py-1.5 text-xs font-medium disabled:opacity-50 ${
                        m.isActive
                          ? "text-error hover:bg-error/5"
                          : "text-emerald-600 hover:bg-emerald-500/5"
                      }`}
                      title={m.isActive ? "Mark inactive" : "Mark active"}
                    >
                      {m.isActive ? (
                        <UserX className="h-3.5 w-3.5" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      {m.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirm action modal */}
      <AnimatePresence>
        {confirmAction && (
          <ConfirmModal
            title={
              confirmAction.type === "reset"
                ? "Reset password"
                : confirmAction.member.isActive
                  ? "Deactivate team member"
                  : "Activate team member"
            }
            description={
              confirmAction.type === "reset"
                ? `Are you sure you want to reset the password for ${confirmAction.member.name ?? confirmAction.member.email}? Their current session will be ended.`
                : confirmAction.member.isActive
                  ? `Are you sure you want to deactivate ${confirmAction.member.name ?? confirmAction.member.email}? They will no longer be able to sign in.`
                  : `Are you sure you want to reactivate ${confirmAction.member.name ?? confirmAction.member.email}? They will be able to sign in again.`
            }
            confirmLabel={
              confirmAction.type === "reset"
                ? "Reset password"
                : confirmAction.member.isActive
                  ? "Deactivate"
                  : "Activate"
            }
            variant={
              confirmAction.type === "reset" || confirmAction.member.isActive
                ? "danger"
                : "primary"
            }
            isPending={
              confirmAction.type === "reset"
                ? resetMutation.isPending
                : toggleActiveMutation.isPending
            }
            onConfirm={() =>
              confirmAction.type === "reset"
                ? handleReset(confirmAction.member)
                : handleToggleActive(confirmAction.member)
            }
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </AnimatePresence>

      {/* Temp password reveal modal */}
      <AnimatePresence>
        {tempPasswordModal && (
          <TempPasswordModal
            member={tempPasswordModal.member}
            password={tempPasswordModal.password}
            onClose={() => setTempPasswordModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Field wrapper ──

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      {children}
      {error && <p className="mt-1 text-[11px] text-error">{error}</p>}
    </label>
  );
}

// ── Confirm modal ──

function ConfirmModal({
  title,
  description,
  confirmLabel,
  variant,
  isPending,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  variant: "danger" | "primary";
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-sm rounded-xl bg-background-elevated p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              variant === "danger"
                ? "bg-error/10 text-error"
                : "bg-primary/[0.08] text-primary"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted">{description}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border-light px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              variant === "danger"
                ? "bg-error hover:bg-error/90"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Temp password modal ──

function TempPasswordModal({
  member,
  password,
  onClose,
}: {
  member: TeamMember;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-xl bg-background-elevated p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
            <KeyRound className="h-4 w-4" />
          </span>
          <h3 className="text-base font-bold text-foreground">Password reset</h3>
        </div>
        <p className="text-sm text-muted">
          A new temporary password has been set for{" "}
          <span className="font-medium text-foreground">
            {member.name ?? member.email}
          </span>
          . Share it with them now — it won't be shown again.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border-light bg-background p-3">
          <code className="flex-1 truncate font-mono text-sm text-foreground">
            {password}
          </code>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <p className="mt-3 text-xs text-muted">
          They can sign in with this temporary password and update it from Settings → Change Password.
        </p>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
