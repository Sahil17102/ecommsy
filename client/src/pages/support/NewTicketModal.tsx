import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Paperclip,
  Loader2,
  Search,
  ShoppingBag,
  FileText,
  ImageIcon,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useCreateTicket } from "@/queries/useSupport";
import { api } from "@/lib/api";
import { formatKeyword, formatCurrency } from "@/lib/utils";
import type { TicketCategory, TicketPriority } from "@/lib/supportApi";

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "order", label: "Order issue" },
  { value: "payment", label: "Payment / billing" },
  { value: "wallet", label: "Wallet / recharge" },
  { value: "kyc", label: "KYC / account" },
  { value: "technical", label: "Technical issue" },
  { value: "general", label: "General inquiry" },
];

const PRIORITIES: { value: TicketPriority; label: string; dot: string }[] = [
  { value: "low", label: "Low", dot: "#6B7280" },
  { value: "medium", label: "Medium", dot: "#3B82F6" },
  { value: "high", label: "High", dot: "#F59E0B" },
  { value: "urgent", label: "Urgent", dot: "#EF4444" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

interface OrderSuggestion {
  id: string;
  orderId: string;
  awb?: string;
  status: string;
  serviceProvider?: string;
  city?: string;
  total?: number;
}

interface Props {
  onClose: () => void;
}

export function NewTicketModal({ onClose }: Props) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("general");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [message, setMessage] = useState("");
  const [relatedOrderId, setRelatedOrderId] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const create = useCreateTicket();
  const navigate = useNavigate();

  const canSubmit =
    subject.trim().length > 0 && (message.trim().length > 0 || attachments.length > 0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next: File[] = [];
    for (const f of Array.from(files)) {
      if (!ALLOWED_MIMES.includes(f.type)) {
        toast.error(`${f.name}: unsupported file type`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: exceeds 5 MB limit`);
        continue;
      }
      next.push(f);
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 5));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const ticket = await create.mutateAsync({
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
        relatedOrderId: relatedOrderId.trim() || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      toast.success(`Ticket ${ticket.ticketNumber} created`);
      onClose();
      navigate(`/support/${ticket.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative w-full max-w-[600px] max-h-[90vh] bg-background-elevated border border-border-light rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-light shrink-0">
            <h2 className="text-base font-bold text-foreground">New support ticket</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-background transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 py-4 space-y-4">
            <Field label="Subject" required>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={120}
                placeholder="Briefly describe the issue"
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-background border border-border-light text-foreground outline-none placeholder:text-muted focus:border-primary/40"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Category">
                <Dropdown
                  value={category}
                  options={CATEGORIES}
                  onChange={(v) => {
                    setCategory(v as TicketCategory);
                    if (v !== "order") setRelatedOrderId("");
                  }}
                />
              </Field>
              <Field label="Priority">
                <Dropdown
                  value={priority}
                  options={PRIORITIES.map((p) => ({
                    value: p.value,
                    label: p.label,
                    dot: p.dot,
                  }))}
                  onChange={(v) => setPriority(v as TicketPriority)}
                />
              </Field>
            </div>

            {category === "order" && (
              <Field label="Related order (optional)">
                <OrderPicker value={relatedOrderId} onChange={setRelatedOrderId} />
              </Field>
            )}

            <Field
              label="Message"
              required={attachments.length === 0}
              hint={`${message.length} / 4000`}
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="Describe what's happening, steps to reproduce, what you expected."
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-background border border-border-light text-foreground outline-none placeholder:text-muted focus:border-primary/40 resize-none"
              />
            </Field>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-foreground">
                  Attachments (optional)
                </label>
                <span className="text-[10px] text-muted">
                  Up to 5 files · JPEG/PNG/WEBP/PDF · 5 MB each
                </span>
              </div>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((f, i) => (
                    <AttachmentChip
                      key={`${f.name}-${i}`}
                      file={f}
                      onRemove={() =>
                        setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    />
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= 5}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border-light text-xs text-muted hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Attach photos or files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_MIMES.join(",")}
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-light shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground bg-background border border-border-light hover:border-primary/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || create.isPending}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
            >
              {create.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit ticket
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Sub-components ──

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

interface DropdownOption {
  value: string;
  label: string;
  dot?: string;
}

function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg bg-background border text-foreground transition-colors ${
          open ? "border-primary/40" : "border-border-light hover:border-primary/20"
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.dot && (
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selected.dot }} />
          )}
          {selected?.label ?? "Select"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 4 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 left-0 right-0 mt-1 py-1 bg-background-elevated border border-border-light rounded-lg shadow-lg overflow-hidden"
          >
            {options.map((opt) => {
              const isSel = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    isSel
                      ? "bg-primary/[0.08] text-primary font-semibold"
                      : "text-foreground hover:bg-primary/[0.04]"
                  }`}
                >
                  {opt.dot && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: opt.dot }}
                    />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OrderSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const { data } = await api.get("/orders", {
        params: { search: q || undefined, limit: 6 },
      });
      const items: OrderSuggestion[] = (data.orders ?? []).map((o: any) => ({
        id: o.id,
        orderId: o.orderId,
        awb: o.awb,
        status: o.status,
        serviceProvider: o.serviceProvider,
        city: o.deliveryAddress?.city,
        total: o.total ?? o.totalAmount ?? o.rate?.finalAmount,
      }));
      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, open, doSearch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedPreview = value ? value : "";

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg bg-background border transition-colors ${
          open ? "border-primary/40" : "border-border-light"
        }`}
      >
        <ShoppingBag className="w-4 h-4 text-muted shrink-0" />
        <input
          type="text"
          value={open ? query : selectedPreview}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search by order ID, AWB or city…"
          className="flex-1 min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted"
        />
        {value && !open && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-0.5 text-muted hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 4 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 left-0 right-0 mt-1 bg-background-elevated border border-border-light rounded-lg shadow-lg overflow-hidden max-h-[260px] overflow-y-auto"
          >
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 text-muted animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted">
                {query ? `No orders for "${query}"` : "No recent orders"}
              </div>
            ) : (
              results.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onChange(o.orderId);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-primary/[0.04] transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">
                        {o.orderId}
                      </span>
                      {o.awb && (
                        <span className="text-[10px] text-muted">AWB {o.awb}</span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase">
                        {formatKeyword(o.status)}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5 truncate">
                      {o.serviceProvider ? `${formatKeyword(o.serviceProvider)} · ` : ""}
                      {o.city ?? "—"}
                      {typeof o.total === "number" ? ` · ${formatCurrency(o.total)}` : ""}
                    </div>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AttachmentChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border-light text-xs text-foreground max-w-[240px]">
      {isImage ? (
        <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
      ) : (
        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
      )}
      <span className="truncate">{file.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 text-muted hover:text-foreground"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
