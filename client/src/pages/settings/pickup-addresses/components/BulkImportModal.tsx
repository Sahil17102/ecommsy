import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { readOrdersFromFile, downloadWorkbook } from "@/pages/BulkUpload/xlsxIo";
import { useBulkImportPickupAddresses, usePickupAddresses } from "../queries";
import { ADDRESS_ROLES } from "../types";
import type { BulkAddressImportRow, BulkAddressRowResult } from "../types";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Template columns (file headers). Header order here is the order rendered in
// the downloadable template. Mapping to payload fields happens in mapAndValidate.
const COLUMNS: { header: string; required: boolean; example: string }[] = [
  { header: "nickname", required: true, example: "Main Warehouse" },
  { header: "contact_name", required: true, example: "Ramesh Kumar" },
  { header: "phone", required: true, example: "9876543210" },
  { header: "email", required: true, example: "warehouse@example.com" },
  { header: "role", required: false, example: "warehouse_manager" },
  { header: "address_line_1", required: true, example: "12, Industrial Area Phase 1" },
  { header: "address_line_2", required: false, example: "Near SBI Bank" },
  { header: "landmark", required: false, example: "Opposite Metro Station" },
  { header: "city", required: true, example: "Ranchi" },
  { header: "state", required: true, example: "Jharkhand" },
  { header: "pincode", required: true, example: "834001" },
  { header: "country", required: false, example: "India" },
  { header: "gst_number", required: false, example: "20ABCDE1234F1Z5" },
];

const PHONE_RE = /^\d{10}$/;
const PINCODE_RE = /^\d{6}$/;

interface ParsedRow {
  rowNumber: number;
  payload: BulkAddressImportRow;
  error?: string;
}

function mapAndValidate(raw: Record<string, string>, rowNumber: number): ParsedRow {
  const get = (h: string) => (raw[h] ?? "").trim();
  const payload: BulkAddressImportRow = {
    nickname: get("nickname"),
    contactName: get("contact_name"),
    phone: get("phone"),
    email: get("email"),
    role: get("role") || undefined,
    landmark: get("landmark") || undefined,
    addressLine1: get("address_line_1"),
    addressLine2: get("address_line_2") || undefined,
    city: get("city"),
    state: get("state"),
    country: get("country") || undefined,
    pincode: get("pincode"),
    gstNumber: get("gst_number") || undefined,
  };

  let error: string | undefined;
  if (!payload.nickname) error = "Nickname is required";
  else if (!payload.contactName) error = "Contact name is required";
  else if (!PHONE_RE.test(payload.phone)) error = "Valid 10-digit phone required";
  else if (!payload.email) error = "Email is required";
  else if (payload.role && !ADDRESS_ROLES.includes(payload.role as (typeof ADDRESS_ROLES)[number]))
    error = `Role must be one of: ${ADDRESS_ROLES.join(", ")}`;
  else if (!payload.addressLine1) error = "Address line 1 is required";
  else if (!payload.city) error = "City is required";
  else if (!payload.state) error = "State is required";
  else if (!PINCODE_RE.test(payload.pincode)) error = "Valid 6-digit pincode required";

  return { rowNumber, payload, error };
}

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [serverResults, setServerResults] = useState<BulkAddressRowResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkImport = useBulkImportPickupAddresses();
  const { data: addresses = [] } = usePickupAddresses();

  const valid = parsed.filter((r) => !r.error);
  const invalid = parsed.filter((r) => r.error);

  function reset() {
    setStep("upload");
    setFileName("");
    setParsed([]);
    setServerResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleDownloadTemplate() {
    const headers = COLUMNS.map((c) => c.header);
    const example = COLUMNS.map((c) => c.example);
    const wb = XLSX.utils.book_new();

    // Sheet 1 — blank import form (headers + one example row to fill over).
    const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
    sheet["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    XLSX.utils.book_append_sheet(wb, sheet, "Pickup Addresses");

    // Sheet 2 — read-only snapshot of the addresses already saved, so the file
    // reflects the current data. Kept on a separate sheet: re-uploading sheet 1
    // must not re-create the rows listed here.
    const existingMatrix: string[][] = [headers];
    for (const a of addresses) {
      existingMatrix.push([
        a.nickname,
        a.contactName,
        a.phone,
        a.email,
        a.role,
        a.addressLine1,
        a.addressLine2 ?? "",
        a.landmark ?? "",
        a.city,
        a.state,
        a.pincode,
        a.country,
        a.gstNumber ?? "",
      ]);
    }
    const existingSheet = XLSX.utils.aoa_to_sheet(existingMatrix);
    existingSheet["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    XLSX.utils.book_append_sheet(wb, existingSheet, "Existing Addresses");

    downloadWorkbook(wb, "pickup-addresses-template.xlsx");
  }

  async function handleFile(file: File) {
    try {
      const { rows } = await readOrdersFromFile(file);
      if (rows.length === 0) {
        toast.error("No data rows found in the file");
        return;
      }
      const mapped = rows.map((r, i) => mapAndValidate(r, i + 1));
      setParsed(mapped);
      setFileName(file.name);
      setStep("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the file");
    }
  }

  async function handleImport() {
    if (valid.length === 0) return;
    try {
      const res = await bulkImport.mutateAsync(valid.map((r) => r.payload));
      setServerResults(res.results);
      setStep("done");
      if (res.successCount > 0) {
        toast.success(`${res.successCount} address${res.successCount !== 1 ? "es" : ""} imported`);
      }
      if (res.failedCount > 0) {
        toast.error(`${res.failedCount} row${res.failedCount !== 1 ? "s" : ""} failed`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Import failed");
    }
  }

  const serverSuccess = serverResults?.filter((r) => r.success).length ?? 0;
  const serverFailed = serverResults?.filter((r) => !r.success) ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-background border border-border-light shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/[0.08] flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Bulk Import Pickup Addresses</h2>
                  <p className="text-xs text-muted">Upload an Excel/CSV file to add many addresses at once</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {step === "upload" && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-border-light bg-foreground/[0.02] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Step 1 — Download the template</p>
                        <p className="text-xs text-muted mt-1">
                          Fill one row per address. Columns marked required must not be empty.
                          RTO is set the same as the pickup address for imported rows.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/[0.06] transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Template
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {COLUMNS.map((c) => (
                        <span
                          key={c.header}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/[0.05] text-muted font-mono"
                        >
                          {c.header}
                          {c.required && <span className="text-accent">*</span>}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Step 2 — Upload your file</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-xl border-2 border-dashed border-border-light hover:border-primary/40 hover:bg-primary/[0.02] transition-colors py-10 flex flex-col items-center gap-2"
                    >
                      <Upload className="w-7 h-7 text-muted" />
                      <span className="text-sm font-medium text-foreground">Click to choose a file</span>
                      <span className="text-xs text-muted">.xlsx, .xls or .csv</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </div>
                </div>
              )}

              {step === "preview" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="truncate">{fileName}</span>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
                      <p className="text-2xl font-bold text-emerald-600">{valid.length}</p>
                      <p className="text-xs text-muted">ready to import</p>
                    </div>
                    <div className="flex-1 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                      <p className="text-2xl font-bold text-red-500">{invalid.length}</p>
                      <p className="text-xs text-muted">rows with errors (skipped)</p>
                    </div>
                  </div>

                  {valid.length > 0 && (
                    <div className="rounded-xl border border-border-light overflow-hidden">
                      <div className="px-3 py-2 bg-foreground/[0.03] text-[11px] font-semibold text-muted uppercase tracking-wide">
                        Preview ({Math.min(valid.length, 8)} of {valid.length})
                      </div>
                      <div className="divide-y divide-border-light">
                        {valid.slice(0, 8).map((r) => (
                          <div key={r.rowNumber} className="px-3 py-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{r.payload.nickname}</p>
                              <p className="text-xs text-muted truncate">
                                {r.payload.contactName} · {r.payload.city}, {r.payload.state} - {r.payload.pincode}
                              </p>
                            </div>
                            <span className="text-xs text-muted shrink-0">{r.payload.phone}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {invalid.length > 0 && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] px-3 py-2 max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-red-500 mb-1 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Rows that will be skipped
                      </p>
                      <ul className="space-y-0.5">
                        {invalid.map((r) => (
                          <li key={r.rowNumber} className="text-xs text-muted">
                            <span className="font-mono">Row {r.rowNumber}</span> — {r.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {step === "done" && serverResults && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/[0.1] flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="text-lg font-bold text-foreground">Import complete</p>
                    <p className="text-sm text-muted">
                      {serverSuccess} added
                      {serverFailed.length > 0 ? ` · ${serverFailed.length} failed` : ""}
                    </p>
                  </div>

                  {serverFailed.length > 0 && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] px-3 py-2 max-h-48 overflow-y-auto">
                      <p className="text-xs font-semibold text-red-500 mb-1">Failed rows</p>
                      <ul className="space-y-0.5">
                        {serverFailed.map((r) => (
                          <li key={r.rowNumber} className="text-xs text-muted">
                            <span className="font-mono">Row {r.rowNumber}</span>
                            {r.nickname ? ` (${r.nickname})` : ""} — {r.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light">
              {step === "preview" && (
                <>
                  <button
                    type="button"
                    onClick={reset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-muted hover:text-foreground transition-colors"
                  >
                    Choose another file
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={valid.length === 0 || bulkImport.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
                  >
                    {bulkImport.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Import {valid.length > 0 ? valid.length : ""} address{valid.length !== 1 ? "es" : ""}
                  </button>
                </>
              )}
              {step === "done" && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20 transition-shadow"
                >
                  Done
                </button>
              )}
              {step === "upload" && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
