import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Landmark,
  Loader2,
  Plus,
  Trash2,
  Star,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Wifi,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  useBankAccounts,
  useAddBankAccount,
  useAddUpi,
  useDeleteBankAccount,
  useSetPrimaryBankAccount,
} from "./queries";
import {
  addBankAccountSchema,
  defaultBankAccountValues,
  type AddBankAccountFormValues,
  addUpiSchema,
  defaultUpiValues,
  type AddUpiFormValues,
} from "./schema";
import type { BankAccount } from "./types";
import { regex } from "@/lib/constants";

import { useTheme } from "@/contexts/ThemeContext";

type FormTab = "bank_account" | "upi";

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: "Pending Approval",
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

export default function BankDetailsPage() {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const { data: accounts, isLoading } = useBankAccounts();
  const addBankMutation = useAddBankAccount();
  const addUpiMutation = useAddUpi();
  const deleteMutation = useDeleteBankAccount();
  const setPrimaryMutation = useSetPrimaryBankAccount();

  const [showForm, setShowForm] = useState(false);
  const [visibleAccounts, setVisibleAccounts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<FormTab>("bank_account");
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [chequePreview, setChequePreview] = useState<string | null>(null);
  const [chequeError, setChequeError] = useState<string | null>(null);
  const [upiVerified, setUpiVerified] = useState(false);
  const [upiHolderName, setUpiHolderName] = useState<string | null>(null);
  const chequeInputRef = useRef<HTMLInputElement>(null);

  // Bank account form
  const bankForm = useForm<AddBankAccountFormValues>({
    resolver: zodResolver(addBankAccountSchema),
    defaultValues: defaultBankAccountValues,
  });

  // UPI form
  const upiForm = useForm<AddUpiFormValues>({
    resolver: zodResolver(addUpiSchema),
    defaultValues: defaultUpiValues,
  });

  const resetForms = () => {
    bankForm.reset(defaultBankAccountValues);
    upiForm.reset(defaultUpiValues);
    setChequeFile(null);
    setChequePreview(null);
    setChequeError(null);
    setUpiVerified(false);
    setUpiHolderName(null);
  };

  const handleChequeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setChequeError(null);
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setChequeError("File size must be less than 5 MB");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setChequeError("Only JPEG, PNG, WebP, or PDF files are allowed");
      return;
    }

    setChequeFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setChequePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setChequePreview(null);
    }

    e.target.value = "";
  };

  const onSubmitBank = async (values: AddBankAccountFormValues) => {
    if (!chequeFile) {
      setChequeError("Cancelled cheque is required");
      return;
    }

    const formData = new FormData();
    formData.append("type", "bank_account");
    formData.append("accountHolderName", values.accountHolderName);
    formData.append("accountNumber", values.accountNumber);
    formData.append("ifscCode", values.ifscCode.toUpperCase());
    formData.append("bankName", values.bankName);
    if (values.branchName) formData.append("branchName", values.branchName);
    formData.append("accountType", values.accountType);
    formData.append("cancelledCheque", chequeFile);

    try {
      await addBankMutation.mutateAsync(formData);
      toast.success("Bank account added — pending admin approval");
      resetForms();
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add bank account");
    }
  };

  const onSubmitUpi = async (values: AddUpiFormValues) => {
    if (!upiVerified) {
      toast.error("Please verify your UPI ID first");
      return;
    }
    try {
      await addUpiMutation.mutateAsync({
        accountHolderName: values.accountHolderName,
        upiId: values.upiId,
      });
      toast.success("UPI account added — pending admin approval");
      resetForms();
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add UPI account");
    }
  };

  const handleVerifyUpi = () => {
    const upiId = upiForm.getValues("upiId");
    if (!upiId) {
      upiForm.setError("upiId", { message: "Enter a UPI ID to verify" });
      return;
    }

    upiForm.clearErrors("upiId");
    if (regex.upi.test(upiId)) {
      setUpiVerified(true);
      setUpiHolderName(null);
      toast.success("UPI ID format verified");
    } else {
      setUpiVerified(false);
      setUpiHolderName(null);
      upiForm.setError("upiId", { message: "Invalid UPI ID format. Expected: name@bank" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Account removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await setPrimaryMutation.mutateAsync(id);
      toast.success("Primary account updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const inputClass =
    "w-full h-11 px-4 text-sm font-medium text-foreground bg-background rounded-xl border-2 border-border-light outline-none transition-all placeholder:text-tertiary hover:border-primary/20 focus:border-primary focus:bg-primary/[0.03] focus:shadow-md focus:shadow-primary/10";

  const labelClass = "block text-xs font-semibold text-foreground mb-1.5";

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 animate-fade-in-up">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-primary/[0.06] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground">
                Bank Details
              </h1>
              <p className="text-[11px] sm:text-xs text-muted">
                Manage your bank accounts and UPI for COD remittance
              </p>
            </div>
          </div>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-primary to-primary-hover shadow-md shadow-primary/20 hover:shadow-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-background-elevated rounded-2xl border border-border-light mb-4 overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex border-b border-border-light">
              <button
                type="button"
                onClick={() => { setActiveTab("bank_account"); setUpiVerified(false); setUpiHolderName(null); }}
                className={`flex-1 py-3 text-sm font-semibold text-center transition-all relative ${
                  activeTab === "bank_account"
                    ? "text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Bank Account
                {activeTab === "bank_account" && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("upi"); setChequeFile(null); setChequePreview(null); setChequeError(null); }}
                className={`flex-1 py-3 text-sm font-semibold text-center transition-all relative ${
                  activeTab === "upi"
                    ? "text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                UPI
                {activeTab === "upi" && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {/* ── Bank Account Tab ── */}
              {activeTab === "bank_account" && (
                <form onSubmit={bankForm.handleSubmit(onSubmitBank)}>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>
                        Account Holder Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        {...bankForm.register("accountHolderName")}
                        className={inputClass}
                      />
                      {bankForm.formState.errors.accountHolderName && (
                        <p className="text-xs text-red-500 mt-1">
                          {bankForm.formState.errors.accountHolderName.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>
                          Account Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Enter account number"
                          {...bankForm.register("accountNumber")}
                          className={inputClass}
                        />
                        {bankForm.formState.errors.accountNumber && (
                          <p className="text-xs text-red-500 mt-1">
                            {bankForm.formState.errors.accountNumber.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>
                          Confirm Account Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Re-enter account number"
                          {...bankForm.register("confirmAccountNumber")}
                          className={inputClass}
                        />
                        {bankForm.formState.errors.confirmAccountNumber && (
                          <p className="text-xs text-red-500 mt-1">
                            {bankForm.formState.errors.confirmAccountNumber.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>
                          IFSC Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="SBIN0001234"
                          maxLength={11}
                          {...bankForm.register("ifscCode")}
                          className={`${inputClass} uppercase`}
                        />
                        {bankForm.formState.errors.ifscCode && (
                          <p className="text-xs text-red-500 mt-1">
                            {bankForm.formState.errors.ifscCode.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>
                          Bank Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="State Bank of India"
                          {...bankForm.register("bankName")}
                          className={inputClass}
                        />
                        {bankForm.formState.errors.bankName && (
                          <p className="text-xs text-red-500 mt-1">
                            {bankForm.formState.errors.bankName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Branch Name</label>
                        <input
                          type="text"
                          placeholder="Main Branch"
                          {...bankForm.register("branchName")}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Account Type</label>
                        <select
                          {...bankForm.register("accountType")}
                          className={inputClass}
                        >
                          <option value="current">Current</option>
                          <option value="savings">Savings</option>
                        </select>
                      </div>
                    </div>

                    {/* Cancelled Cheque Upload */}
                    <div>
                      <label className={labelClass}>
                        Upload Cancelled Cheque <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={chequeInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleChequeChange}
                        className="hidden"
                      />

                      {!chequeFile ? (
                        <button
                          type="button"
                          onClick={() => chequeInputRef.current?.click()}
                          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-border-light bg-background hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Upload className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-foreground">
                              Click to upload cancelled cheque
                            </p>
                            <p className="text-[11px] text-muted mt-0.5">
                              JPEG, PNG, WebP or PDF — Max 5 MB
                            </p>
                          </div>
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-success/30 bg-success/5">
                          <div className="shrink-0 w-10 h-10 rounded-lg bg-background-elevated flex items-center justify-center overflow-hidden">
                            {chequePreview ? (
                              <img
                                src={chequePreview}
                                alt="Cheque preview"
                                className="w-full h-full object-cover"
                              />
                            ) : chequeFile.type === "application/pdf" ? (
                              <FileText className="w-5 h-5 text-error" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {chequeFile.name}
                            </p>
                            <p className="text-[11px] text-muted">
                              {(chequeFile.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setChequeFile(null);
                              setChequePreview(null);
                              setChequeError(null);
                            }}
                            className="shrink-0 p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/[0.06] transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {chequeError && (
                        <p className="text-xs text-red-500 mt-1">{chequeError}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border-light">
                    <button
                      type="submit"
                      disabled={addBankMutation.isPending}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-hover shadow-md shadow-primary/20 hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {addBankMutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Add Bank Account
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); resetForms(); }}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* ── UPI Tab ── */}
              {activeTab === "upi" && (
                <form onSubmit={upiForm.handleSubmit(onSubmitUpi)}>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>
                        Account Holder <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter account holder's name"
                        {...upiForm.register("accountHolderName")}
                        className={inputClass}
                      />
                      {upiForm.formState.errors.accountHolderName && (
                        <p className="text-xs text-red-500 mt-1">
                          {upiForm.formState.errors.accountHolderName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>
                        UPI ID <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="yourname@paytm"
                            {...upiForm.register("upiId", {
                              onChange: () => { setUpiVerified(false); setUpiHolderName(null); },
                            })}
                            className={`${inputClass} ${
                              upiVerified ? "!border-success !bg-success/[0.03]" : ""
                            }`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyUpi}
                          disabled={upiVerified}
                          className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            upiVerified
                              ? "text-success bg-success/10 border-2 border-success/30"
                              : "text-primary bg-primary/[0.06] hover:bg-primary/[0.12] border-2 border-primary/20"
                          } disabled:opacity-60`}
                        >
                          {upiVerified ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : null}
                          {upiVerified ? "Verified" : "Verify"}
                        </button>
                      </div>
                      {upiForm.formState.errors.upiId && (
                        <p className="text-xs text-red-500 mt-1">
                          {upiForm.formState.errors.upiId.message}
                        </p>
                      )}
                      {upiVerified && (
                        <p className="text-xs text-success font-medium mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {upiHolderName
                            ? `Verified — ${upiHolderName}`
                            : "UPI ID verified"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border-light">
                    <button
                      type="submit"
                      disabled={addUpiMutation.isPending || !upiVerified}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-hover shadow-md shadow-primary/20 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addUpiMutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Add UPI Account
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); resetForms(); }}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accounts list */}
      {!isLoading && accounts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {accounts.length === 0 && !showForm && (
            <div className="md:col-span-2 flex flex-col items-center justify-center py-16 text-center bg-background-elevated rounded-2xl border border-border-light">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Landmark className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                No bank accounts added
              </p>
              <p className="text-xs text-muted max-w-xs">
                Add a bank account or UPI to receive your COD remittance payouts.
              </p>
            </div>
          )}

          {accounts.map((account: BankAccount, i: number) => {
            const statusConfig = STATUS_CONFIG[account.status];
            const StatusIcon = statusConfig.icon;
            const isUpi = account.type === "upi";

            /* ── Light mode: soft warm/cool tinted cards with dark text ── */
            /* ── Dark mode: dark navy cards with white text (as before) ── */
            const lightGrads = [
              "from-[#F0EDE8] to-[#E8E4DF]", // warm ivory
              "from-[#E8ECF0] to-[#DFE3E8]", // cool silver
              "from-[#EDE8F0] to-[#E4DFE8]", // soft lavender
              "from-[#E8F0EC] to-[#DFE8E3]", // muted sage
            ];
            const darkGrads = [
              "from-[#1B2838] to-[#0F1923]",
              "from-[#1E293B] to-[#0F172A]",
              "from-[#1C2333] to-[#111827]",
              "from-[#212A3E] to-[#0D1321]",
            ];
            const grad = (isDark ? darkGrads : lightGrads)[i % 4];

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="group"
              >
                <div
                  className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${grad} h-full flex flex-col`}
                  style={{
                    boxShadow: isDark
                      ? "0 2px 8px rgba(0,0,0,0.3)"
                      : "0 1px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Orb */}
                  <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${
                    isDark ? "bg-white/[0.04]" : "bg-white/40"
                  }`} />

                  <div className="relative px-4 pt-3.5 pb-2.5 flex-1 flex flex-col">
                    {/* Row 1: Chip + contactless + actions */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {isUpi ? (
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                            isDark ? "bg-white/[0.08]" : "bg-black/[0.06]"
                          }`}>
                            <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 ${isDark ? "text-white/60" : "text-foreground/50"}`} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M7 15l5-10 5 10" /><path d="M5.5 12h13" />
                            </svg>
                          </div>
                        ) : (
                          <div className={`w-8 h-[22px] rounded-[3px] flex items-center justify-center ${
                            isDark
                              ? "bg-gradient-to-br from-[#D4A853] via-[#C4973D] to-[#B8892F]"
                              : "bg-gradient-to-br from-[#C9A84C] via-[#B89430] to-[#A68425]"
                          }`}>
                            <div className="w-[18px] h-3 rounded-[1.5px] border border-black/10" />
                          </div>
                        )}
                        <Wifi className={`w-3.5 h-3.5 rotate-90 ${
                          isDark ? "text-white/20" : "text-foreground/15"
                        }`} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {account.isPrimary && (
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide ${
                            isDark
                              ? "bg-white/[0.08] text-white/50"
                              : "bg-black/[0.05] text-foreground/45"
                          }`}>
                            <Star className="w-2.5 h-2.5 fill-current" />
                            PRIMARY
                          </span>
                        )}
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {!account.isPrimary && account.status === "approved" && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(account.id)}
                              disabled={setPrimaryMutation.isPending}
                              className={`p-1 rounded transition-all ${
                                isDark
                                  ? "text-white/25 hover:text-white/70 hover:bg-white/[0.08]"
                                  : "text-foreground/25 hover:text-foreground/60 hover:bg-black/[0.06]"
                              }`}
                              title="Set as primary"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!(account.status === "approved" && account.isPrimary) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(account.id)}
                              disabled={deleteMutation.isPending}
                              className={`p-1 rounded transition-all ${
                                isDark
                                  ? "text-white/25 hover:text-red-400/70 hover:bg-white/[0.06]"
                                  : "text-foreground/25 hover:text-error hover:bg-error/[0.06]"
                              }`}
                              title="Delete account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Account number / UPI */}
                    {isUpi ? (
                      <p className={`text-[13px] font-semibold font-mono tracking-wide truncate mb-3 ${
                        isDark ? "text-white/90" : "text-foreground/85"
                      }`}>
                        {account.upiId}
                      </p>
                    ) : (() => {
                      const isVisible = visibleAccounts.has(account.id);
                      return (
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`flex items-center gap-[6px] font-mono text-[13px] font-semibold tracking-[0.14em]`}>
                            {isVisible ? (
                              <span className={isDark ? "text-white/90" : "text-foreground/85"}>
                                {account.accountNumber}
                              </span>
                            ) : (
                              <>
                                <span className={isDark ? "text-white/15" : "text-foreground/20"}>****</span>
                                <span className={isDark ? "text-white/15" : "text-foreground/20"}>****</span>
                                <span className={isDark ? "text-white/15" : "text-foreground/20"}>****</span>
                                <span className={isDark ? "text-white/90" : "text-foreground/85"}>{account.accountNumber?.slice(-4)}</span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setVisibleAccounts(prev => {
                              const next = new Set(prev);
                              if (next.has(account.id)) next.delete(account.id);
                              else next.add(account.id);
                              return next;
                            })}
                            className={`p-0.5 rounded transition-all ${
                              isDark
                                ? "text-white/25 hover:text-white/60"
                                : "text-foreground/25 hover:text-foreground/60"
                            }`}
                            title={isVisible ? "Hide account number" : "Show account number"}
                          >
                            {isVisible
                              ? <EyeOff className="w-3.5 h-3.5" />
                              : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })()}

                    {/* Row 3: Holder + Bank */}
                    <div className="flex items-end justify-between gap-2 mt-auto">
                      <div className="min-w-0">
                        <p className={`text-[8px] uppercase tracking-[0.12em] leading-none mb-[3px] ${
                          isDark ? "text-white/25" : "text-foreground/30"
                        }`}>
                          {isUpi ? "Account Holder" : "Card Holder"}
                        </p>
                        <p className={`text-[11px] font-medium tracking-wide truncate ${
                          isDark ? "text-white/60" : "text-foreground/60"
                        }`}>
                          {account.accountHolderName?.toUpperCase()}
                        </p>
                        {!isUpi && (
                          <p className={`text-[8px] mt-0.5 tracking-wide ${
                            isDark ? "text-white/25" : "text-foreground/30"
                          }`}>
                            {account.ifscCode}
                            {account.branchName && ` · ${account.branchName}`}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[13px] font-bold tracking-wide ${
                          isDark ? "text-white/85" : "text-foreground/80"
                        }`}>
                          {isUpi ? "UPI" : (account.bankName || "").toUpperCase()}
                        </p>
                        <p className={`text-[8px] uppercase tracking-[0.12em] ${
                          isDark ? "text-white/25" : "text-foreground/30"
                        }`}>
                          {isUpi ? "Virtual Pay" : account.accountType
                            ? account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)
                            : "Account"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status footer */}
                  <div className={`px-4 py-1.5 border-t ${
                    isDark
                      ? "bg-white/[0.03] border-white/[0.05]"
                      : "bg-black/[0.02] border-black/[0.04]"
                  }`}>
                    <div className="flex items-center gap-1">
                      <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                      <span className={`text-[10px] font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    {account.status === "rejected" && account.rejectionReason && (
                      <p className={`text-[9px] mt-0.5 ${isDark ? "text-red-400/70" : "text-error/70"}`}>
                        {account.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
