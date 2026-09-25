import { useState, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Tag, Popover, Select, Alert, Button, Steps } from "antd";
import {
  Upload, Download, FileText, X, CheckCircle2, AlertTriangle,
  ArrowLeft, ArrowRight, Package, Loader2, MapPin,
} from "lucide-react";
import { usePickupAddresses } from "@/pages/settings/pickup-addresses/queries";
import { formatCurrency, formatKeyword } from "@/lib/utils";
import { toast } from "sonner";
import { ResponsiveTable } from "@/components/common";
import type { ResponsiveColumnsType } from "@/components/common";
import type { BulkCreateResponse } from "@/lib/ordersApi";
import type {
  BulkUploadConfig, ParsedRow, GenericCourierOption, RowError,
} from "./types";
import { readOrdersFromFile, buildTemplateWorkbook, downloadWorkbook } from "./xlsxIo";

// Narrower alias for readability
type Row<B, C extends GenericCourierOption> = ParsedRow<B, C>;

/**
 * Compact, scannable issue list. Each row becomes a short summary line with
 * the full message revealed in a Popover — so the cell stays one-line-per-issue
 * regardless of message length, no single-word-per-line wrapping.
 */
function IssuesCell({ errors }: { errors: RowError[] }) {
  const MAX_INLINE = 3;
  const preview = errors.slice(0, MAX_INLINE);
  const restCount = errors.length - preview.length;

  const fullList = (
    <div className="max-w-sm space-y-1.5">
      {errors.map((e, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <span className="shrink-0 px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 font-medium">
            {formatKeyword(e.field)}
          </span>
          <span className="text-foreground leading-snug">{e.message}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Popover content={fullList} title={`${errors.length} issue${errors.length > 1 ? "s" : ""}`} trigger="hover" placement="leftTop" mouseEnterDelay={0.15}>
      <div className="space-y-0.5 cursor-help">
        {preview.map((e, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs leading-tight">
            <AlertTriangle size={11} className="shrink-0 text-red-500" />
            <span className="truncate">
              <span className="font-medium text-red-600">{formatKeyword(e.field)}:</span>{" "}
              <span className="text-foreground">{e.message}</span>
            </span>
          </div>
        ))}
        {restCount > 0 && (
          <div className="text-[11px] text-red-500 pl-[18px]">+{restCount} more — hover to see all</div>
        )}
      </div>
    </Popover>
  );
}

interface Props<TBase, TCourier extends GenericCourierOption, TPayload> {
  config: BulkUploadConfig<TBase, TCourier, TPayload>;
}

export function BulkUploadWizard<TBase, TCourier extends GenericCourierOption, TPayload>({
  config,
}: Props<TBase, TCourier, TPayload>) {
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [rows, setRows] = useState<Row<TBase, TCourier>[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<BulkCreateResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: pickupAddresses = [] } = usePickupAddresses();

  // ── Step 0 → 1: parse file ──
  const ingest = useCallback((raws: Array<Record<string, string>>, label: string) => {
    setFileName(label);
    setSubmitResult(null);
    const parsed: Row<TBase, TCourier>[] = [];
    const seenIds = new Map<string, number>();
    raws.forEach((raw, idx) => {
      const rowNumber = idx + 1;
      const v = config.validateRow(raw, pickupAddresses);
      const errors: RowError[] = [...v.errors];
      const normId = (raw.orderId ?? "").trim().toLowerCase();
      if (normId) {
        if (seenIds.has(normId)) errors.push({ field: "orderId", message: `Duplicate of row ${seenIds.get(normId)}` });
        else seenIds.set(normId, rowNumber);
      }
      parsed.push({
        rowNumber, raw, errors, status: "pending",
        pickup: v.pickup, itemsSummary: v.itemsSummary, base: v.base, extras: v.extras,
      });
    });
    setRows(parsed);
    setStep(1);
  }, [config, pickupAddresses]);

  const handleFile = useCallback(async (file: File) => {
    try {
      const { header, rows: data } = await readOrdersFromFile(file);
      const missing = config.requiredColumns.filter((c) => !header.includes(c));
      if (missing.length) {
        toast.error(`Missing columns: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`, {
          description: "Download the template to see required columns.",
        });
        return;
      }
      if (data.length === 0) { toast.error("No data rows found in Orders sheet"); return; }
      ingest(data, file.name);
    } catch (err) {
      toast.error("Could not read file", { description: (err as Error).message });
    }
  }, [config.requiredColumns, ingest]);

  const handleDownloadTemplate = useCallback(() => {
    const wb = buildTemplateWorkbook(config.templateColumns, pickupAddresses);
    downloadWorkbook(wb, config.templateFileName);
  }, [config.templateColumns, config.templateFileName, pickupAddresses]);

  // ── Step 1 → 2: fetch couriers per row ──
  // Run requests in parallel with a small concurrency cap so a large batch
  // doesn't spam the server but also doesn't serialize 500 HTTP calls.
  async function validateAndFetch() {
    setValidating(true);
    setRows((prev) => prev.map((r) => (r.errors.length ? r : { ...r, status: "validating" })));

    const CONCURRENCY = 8;
    const out: Row<TBase, TCourier>[] = new Array(rows.length);

    async function processRow(i: number): Promise<void> {
      const r = rows[i];
      if (r.errors.length || !r.base || !r.pickup) { out[i] = r; return; }
      try {
        const list = await config.fetchCouriers(r.base, r.pickup);
        if (!list.length) {
          out[i] = { ...r, status: "unserviceable", note: "No courier serviceable for this route", availableCouriers: [] };
          return;
        }
        const preferred = config.matchCourierByPreference(list, r.raw);
        const pick = preferred ?? list.slice().sort((a, b) => a.totalCharge - b.totalCharge)[0];
        const note = preferred ? undefined : (r.raw.courier_name ? `"${r.raw.courier_name}" not serviceable — using cheapest "${pick.name}"` : undefined);
        out[i] = { ...r, status: "ready", note, availableCouriers: list, selectedCourier: pick };
      } catch (err) {
        out[i] = { ...r, status: "rate_error", note: (err as Error).message };
      }
    }

    let next = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
      while (true) {
        const idx = next++;
        if (idx >= rows.length) return;
        await processRow(idx);
      }
    });
    await Promise.all(workers);

    setRows(out);
    setValidating(false);
    const okCount = out.filter((r) => r.status === "ready").length;
    if (okCount === 0) toast.error("No rows are ready", { description: "Fix issues or try different couriers." });
    else toast.success(`${okCount} row${okCount !== 1 ? "s" : ""} ready`);
    setStep(2);
  }

  // ── Step 2: submit ──
  async function submit() {
    const payloads: TPayload[] = [];
    // Maps position in `payloads` → client rowNumber, so the server's per-row
    // response (rowNumber = payload index + 1) can be mapped back to the table.
    const payloadRowMap: number[] = [];
    for (const r of rows) {
      if (r.errors.length || !r.base || !r.pickup || !r.selectedCourier) continue;
      // Include previously-failed rows so users can retry after upstream fixes.
      if (r.status !== "ready" && r.status !== "submit_failed") continue;
      payloads.push(config.toPayload(r));
      payloadRowMap.push(r.rowNumber);
    }
    if (payloads.length === 0) { toast.error("No rows to submit"); return; }
    setSubmitting(true);
    // Clear previous server errors on ready rows before the attempt.
    setRows((prev) => prev.map((r) => r.serverErrors ? { ...r, serverErrors: undefined, status: "ready" as const } : r));
    try {
      const result = await config.submit(payloads);

      const failureByRow = new Map<number, RowError[]>();
      result.results.forEach((rr, idx) => {
        if (!rr.success) {
          const clientRowNum = payloadRowMap[idx] ?? rr.rowNumber;
          failureByRow.set(clientRowNum, [{ field: "order", message: rr.error ?? "Order creation failed" }]);
        }
      });

      if (result.failedCount === 0) {
        setSubmitResult(result);
      } else {
        setRows((prev) => prev.map((r) => {
          const errs = failureByRow.get(r.rowNumber);
          return errs ? { ...r, serverErrors: errs, status: "submit_failed" as const } : r;
        }));
        toast.warning(
          `${result.successCount} of ${result.total} created — ${result.failedCount} failed`,
          { description: "See the Issues column for each failing row." },
        );
      }
    } catch (err) {
      // Map express-validator path like `orders[2].buyerName` back to the client row.
      const validationErrors = (err as { validationErrors?: Array<{ path?: string; msg?: string }> }).validationErrors;
      const byPayloadIdx = new Map<number, RowError[]>();
      if (Array.isArray(validationErrors)) {
        for (const v of validationErrors) {
          const match = typeof v.path === "string" && v.path.match(/^orders\[(\d+)\](?:\.(.+))?$/);
          if (!match) continue;
          const idx = Number(match[1]);
          const field = match[2] ?? "order";
          const entry: RowError = { field, message: v.msg ?? "Invalid" };
          if (!byPayloadIdx.has(idx)) byPayloadIdx.set(idx, []);
          byPayloadIdx.get(idx)!.push(entry);
        }
      }

      if (byPayloadIdx.size > 0) {
        setRows((prev) => prev.map((r) => {
          const payloadIdx = payloadRowMap.indexOf(r.rowNumber);
          if (payloadIdx < 0) return r;
          const errs = byPayloadIdx.get(payloadIdx);
          if (!errs?.length) return r;
          return { ...r, serverErrors: errs, status: "submit_failed" as const };
        }));
        toast.error("Validation failed — fix the highlighted rows");
      } else {
        const message = (err as Error)?.message ?? "Bulk create failed";
        setRows((prev) => prev.map((r) => {
          if (!payloadRowMap.includes(r.rowNumber)) return r;
          return { ...r, serverErrors: [{ field: "order", message }], status: "submit_failed" as const };
        }));
        toast.error("Could not submit batch", { description: message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function updateCourier(rowNumber: number, courierId: string) {
    setRows((prev) => prev.map((r) => {
      if (r.rowNumber !== rowNumber || !r.availableCouriers) return r;
      const picked = r.availableCouriers.find((c) => c.courierId === courierId);
      if (!picked) return r;
      return { ...r, selectedCourier: picked, status: "ready", note: undefined };
    }));
  }

  // ── Derived ──
  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const validCount = rows.length - errorCount;
  const readyCount = rows.filter((r) => (r.status === "ready" || r.status === "submit_failed") && r.selectedCourier).length;
  const submitFailedCount = rows.filter((r) => r.status === "submit_failed").length;
  const totalShipping = useMemo(
    () => rows.reduce((s, r) => s + (r.selectedCourier?.totalCharge ?? 0), 0),
    [rows],
  );

  // ── Columns (shared between steps 1 & 2) ──
  const extraColumnKeys = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach((r) => { if (r.extras) Object.keys(r.extras).forEach((k) => keys.add(k)); });
    return Array.from(keys);
  }, [rows]);

  const columns: ResponsiveColumnsType<Row<TBase, TCourier>> = [
    { title: "#", dataIndex: "rowNumber", key: "row", width: 50 },
    {
      title: "Status", key: "status", width: 140,
      render: (_: unknown, r: Row<TBase, TCourier>) => {
        if (r.errors.length) return <Tag color="red" icon={<AlertTriangle size={12} className="inline mr-1" />}>{r.errors.length} issue{r.errors.length > 1 ? "s" : ""}</Tag>;
        if (r.status === "submit_failed") return <Tag color="red" icon={<AlertTriangle size={12} className="inline mr-1" />}>Failed</Tag>;
        if (r.status === "validating") return <Tag color="processing" icon={<Loader2 size={12} className="inline mr-1 animate-spin" />}>Checking…</Tag>;
        if (r.status === "ready") return <Tag color="green">Ready</Tag>;
        if (r.status === "needs_courier") return <Tag color="gold">Review courier</Tag>;
        if (r.status === "unserviceable") return <Tag color="red">Unserviceable</Tag>;
        if (r.status === "rate_error") return <Tag color="purple">Rate error</Tag>;
        return <Tag>Pending</Tag>;
      },
    },
    { title: "Order ID", dataIndex: ["raw", "orderId"], key: "orderId", width: 150 },
    {
      title: "Buyer", key: "buyer", width: 180,
      render: (_: unknown, r: Row<TBase, TCourier>) => (
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{r.raw.buyerName || "—"}</div>
          <div className="text-xs text-muted">{r.raw.buyerPhone}</div>
        </div>
      ),
    },
    {
      title: "Route", key: "route", width: 220,
      render: (_: unknown, r: Row<TBase, TCourier>) => (
        <div className="text-xs">
          <div className="text-muted truncate">
            <MapPin size={11} className="inline -mt-0.5 mr-1" />
            {r.pickup
              ? `${r.pickup.nickname} (${r.pickup.pincode})`
              : <span className="text-red-500">{r.raw.warehouse_name || "—"}</span>}
          </div>
          <div className="text-foreground truncate">→ {r.raw.city}, {r.raw.state} · {r.raw.pincode}</div>
        </div>
      ),
    },
    {
      title: "Items", key: "items", width: 200,
      render: (_: unknown, r: Row<TBase, TCourier>) => (
        <div className="text-xs text-foreground truncate">{r.itemsSummary || <span className="text-muted">—</span>}</div>
      ),
    },
    ...extraColumnKeys.map((key) => ({
      title: key,
      key: `extra_${key}`,
      width: 110,
      render: (_: unknown, r: Row<TBase, TCourier>) => (
        <span className="text-xs text-foreground">{r.extras?.[key] ?? ""}</span>
      ),
    })),
    {
      title: "Payment", dataIndex: ["raw", "paymentType"], key: "payment", width: 90,
      render: (v: string) => <Tag bordered={false} color={v?.toLowerCase() === "cod" ? "orange" : "green"}>{v?.toUpperCase()}</Tag>,
    },
    {
      title: "Courier", key: "courier", width: 240,
      render: (_: unknown, r: Row<TBase, TCourier>) => {
        if (!r.availableCouriers?.length) {
          return r.raw.courier_name
            ? <span className="text-xs text-muted truncate">Wanted: {r.raw.courier_name}</span>
            : <span className="text-xs text-muted">—</span>;
        }
        return (
          <div className="space-y-1">
            <Select
              size="small"
              value={r.selectedCourier?.courierId}
              onChange={(v) => updateCourier(r.rowNumber, v)}
              className="w-full"
              options={r.availableCouriers.map((c) => ({
                value: c.courierId,
                label: `${c.name} — ${formatCurrency(c.totalCharge)}`,
              }))}
            />
            {r.note && (
              <div className="flex items-start gap-1 text-[11px] text-violet-600 leading-snug">
                <AlertTriangle size={10} className="shrink-0 mt-[3px]" />
                <span>{r.note}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Shipping", key: "shipping", width: 100, align: "right" as const,
      render: (_: unknown, r: Row<TBase, TCourier>) =>
        r.selectedCourier
          ? <span className="text-xs font-medium tabular-nums text-primary">{formatCurrency(r.selectedCourier.totalCharge)}</span>
          : <span className="text-xs text-muted">—</span>,
    },
    {
      title: "Issues", key: "issues", width: 320,
      render: (_: unknown, r: Row<TBase, TCourier>) => {
        if (r.errors.length) return <IssuesCell errors={r.errors} />;
        if (r.serverErrors?.length) return <IssuesCell errors={r.serverErrors} />;
        if (r.status === "unserviceable") {
          return (
            <div className="flex items-start gap-1.5 text-xs text-red-600 leading-snug">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span>No courier serviceable for this route</span>
            </div>
          );
        }
        return <span className="text-xs text-muted">—</span>;
      },
    },
  ];

  // ── Result screen ──
  if (submitResult) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <button onClick={() => navigate(config.backTo)} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground">
          <ArrowLeft size={14} /> Back to orders
        </button>
        <div className="bg-background-elevated rounded-2xl border border-border-light p-8 text-center">
          <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${submitResult.failedCount === 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-violet-500/10 text-violet-500"}`}>
            {submitResult.failedCount === 0 ? <CheckCircle2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </div>
          <h2 className="text-lg font-bold text-foreground">{submitResult.successCount} of {submitResult.total} orders created</h2>
          {submitResult.failedCount > 0 && <p className="text-sm text-muted mt-1">{submitResult.failedCount} failed — see details below.</p>}
          <div className="flex gap-2 justify-center mt-5">
            <Button onClick={() => { setSubmitResult(null); setRows([]); setFileName(null); setStep(0); }}>Upload another batch</Button>
            <Button type="primary" onClick={() => navigate(config.backTo)}>View orders</Button>
          </div>
        </div>
        <ResponsiveTable
          size="small" rowKey="rowNumber" pagination={false}
          dataSource={submitResult.results}
          columns={[
            { title: "#", dataIndex: "rowNumber", width: 50 },
            { title: "Order ID", dataIndex: "orderId", width: 160 },
            {
              title: "Result", key: "result",
              render: (_: unknown, r: BulkCreateResponse["results"][number]) => r.success
                ? <Tag color="green">Created · AWB {r.order?.awb ?? "—"}</Tag>
                : <Tag color="red">Failed</Tag>,
            },
            { title: "Message", dataIndex: "error", render: (e?: string) => e ?? <span className="text-xs text-muted">OK</span> },
          ]}
        />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={config.backTo} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground no-underline">
            <ArrowLeft size={14} /> Back to {config.flow} orders
          </Link>
          <h1 className="text-lg font-bold text-foreground mt-1">{config.title}</h1>
          <p className="text-xs text-muted mt-0.5">{config.subtitle}</p>
        </div>
        <Button icon={<Download size={14} />} onClick={handleDownloadTemplate}>
          Download template (.xlsx)
        </Button>
      </div>

      <Steps
        size="small"
        current={step}
        items={[
          { title: "Upload file", description: `${config.flow} template (.xlsx)` },
          { title: "Validate rows", description: "Pickups, order IDs, couriers" },
          { title: "Review & submit", description: "Edit couriers, send batch" },
        ]}
      />

      {step === 0 && (
        <div
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="bg-background-elevated rounded-2xl border-2 border-dashed border-border-light hover:border-primary/40 transition-colors p-10 text-center cursor-pointer"
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto mb-3 flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">Drop your Excel file here</h2>
          <p className="text-sm text-muted mt-1">
            Accepts .xlsx, .xls, or .csv — up to 500 rows.
          </p>
          <p className="text-xs text-muted mt-3">
            Sheet 1 <span className="text-foreground font-medium">Orders</span> holds your orders.{" "}
            Sheet 2 <span className="text-foreground font-medium">Pickup Locations</span> lists the{" "}
            <code className="px-1 py-0.5 rounded bg-surface-muted text-foreground">warehouse_name</code> values you can use.
          </p>
        </div>
      )}

      {step > 0 && (
        <>
          <div className="bg-background-elevated rounded-2xl border border-border-light p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <FileText size={14} />
              <span className="font-medium text-foreground">{fileName}</span>
              <span>·</span>
              <span>{rows.length} rows</span>
              <Tag color="green" bordered={false}>{validCount} valid</Tag>
              {errorCount > 0 && <Tag color="red" bordered={false}>{errorCount} with issues</Tag>}
              {step === 2 && <Tag color="blue" bordered={false}>{readyCount} ready</Tag>}
              {submitFailedCount > 0 && <Tag color="red" bordered={false}>{submitFailedCount} failed</Tag>}
              <button
                onClick={() => { setRows([]); setFileName(null); setStep(0); }}
                className="ml-auto text-xs text-muted hover:text-foreground flex items-center gap-1"
              >
                <X size={13} /> Start over
              </button>
            </div>

            {errorCount > 0 && (
              <Alert type="warning" showIcon
                message={`${errorCount} row${errorCount > 1 ? "s" : ""} have issues and will be skipped.`}
                description="Fix the problems listed in the Issues column — affected rows won't be submitted."
              />
            )}

            <div className="flex flex-wrap gap-2">
              {step === 1 && (
                <Button
                  type="primary"
                  onClick={validateAndFetch}
                  loading={validating}
                  disabled={validCount === 0}
                  icon={<ArrowRight size={14} />}
                >
                  Validate &amp; fetch couriers
                </Button>
              )}
              {step === 2 && (
                <>
                  <Button onClick={() => setStep(1)} icon={<ArrowLeft size={14} />}>Back</Button>
                  <Button
                    type="primary"
                    icon={<Package size={14} />}
                    onClick={submit}
                    disabled={readyCount === 0}
                    loading={submitting}
                  >
                    Create {readyCount} orders · {formatCurrency(totalShipping)}
                  </Button>
                </>
              )}
            </div>
          </div>

          <ResponsiveTable<Row<TBase, TCourier>>
            size="small"
            rowKey="rowNumber"
            dataSource={rows}
            columns={columns}
            pagination={{ pageSize: 25, showSizeChanger: false }}
            rowClassName={(r) => (r.errors.length || r.status === "submit_failed" ? "bg-red-500/[0.06]" : r.status === "unserviceable" ? "bg-violet-500/[0.06]" : "")}
            scroll={{ x: 1300 + extraColumnKeys.length * 110 }}
          />
        </>
      )}
    </motion.div>
  );
}
