import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DatePicker, Select } from "antd";
import dayjs from "dayjs";
import {
  FileSpreadsheet,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Filter,
  Columns3,
  Loader2,
  FileWarning,
  CheckCircle2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import { useReportPreview, useDownloadReport } from "./queries";
import { useUsers } from "@/features/users/queries";
import { STATUS_CONFIG } from "@/features/orders/config";
import type { ReportFilters } from "./types";
import {
  FIELD_CATEGORIES,
  ALL_FIELD_KEYS,
  REPORT_PRESETS,
  DATE_PRESETS,
  MAX_REPORT_RANGE_DAYS,
  PAYMENT_OPTIONS,
  ORDER_TYPE_OPTIONS,
  getDateRange,
  daysBetween,
} from "./config";

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({
  value,
  label,
}));

export default function ReportsPage() {
  // Field selection
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(FIELD_CATEGORIES.map((c) => c.id)),
  );

  // Filters — date range is REQUIRED. Default to last 30 days.
  const [dateDays, setDateDays] = useState<number>(30);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [orderType, setOrderType] = useState("");
  const [merchantId, setMerchantId] = useState<string | undefined>(undefined);

  // Merchants for the user-picker (admin POV: optional scope-by-merchant filter)
  const { data: usersData } = useUsers({ limit: 500 });
  const merchantOptions = useMemo(
    () =>
      (usersData?.users ?? []).map((u) => ({
        label: u.businessName || u.name || u.email || u.phone || u.id,
        value: u.id,
      })),
    [usersData],
  );

  const allFieldKeys = ALL_FIELD_KEYS;

  // Build filters for preview/download
  const reportFilters = useMemo<ReportFilters>(() => {
    let from = "";
    let to = "";
    if (isCustomDate) {
      from = customFrom;
      to = customTo;
    } else {
      const range = getDateRange(dateDays);
      from = range.from;
      to = range.to;
    }
    const f: ReportFilters = { from, to };
    if (selectedStatuses.length) f.status = selectedStatuses;
    if (selectedPayments.length) f.paymentType = selectedPayments;
    if (orderType) f.orderType = orderType;
    if (merchantId) f.userId = merchantId;
    return f;
  }, [
    isCustomDate,
    customFrom,
    customTo,
    dateDays,
    selectedStatuses,
    selectedPayments,
    orderType,
    merchantId,
  ]);

  const dateRangeError = useMemo<string | null>(() => {
    if (!reportFilters.from || !reportFilters.to) {
      return "Please select a date range";
    }
    const days = daysBetween(reportFilters.from, reportFilters.to);
    if (days === null) return "Invalid date range — `to` must be on or after `from`";
    if (days > MAX_REPORT_RANGE_DAYS) {
      return `Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} days (about 6 months)`;
    }
    return null;
  }, [reportFilters.from, reportFilters.to]);

  const { data: previewCount, isFetching: isPreviewLoading } = useReportPreview(
    reportFilters,
    { enabled: dateRangeError === null },
  );
  const downloadReport = useDownloadReport();

  // ── Field toggle handlers ──

  const toggleField = useCallback((key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setActivePreset(null);
  }, []);

  const toggleCategory = useCallback((categoryKeys: string[]) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      const allSelected = categoryKeys.every((k) => next.has(k));
      if (allSelected) {
        categoryKeys.forEach((k) => next.delete(k));
      } else {
        categoryKeys.forEach((k) => next.add(k));
      }
      return next;
    });
    setActivePreset(null);
  }, []);

  const toggleCategoryExpand = useCallback((id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const applyPreset = useCallback(
    (preset: (typeof REPORT_PRESETS)[number]) => {
      if (preset.id === "all_fields") {
        setSelectedFields(new Set(allFieldKeys));
      } else {
        setSelectedFields(new Set(preset.keys));
      }
      setActivePreset(preset.id);
      const keysSet = new Set(preset.id === "all_fields" ? allFieldKeys : preset.keys);
      const toExpand = FIELD_CATEGORIES
        .filter((cat) => cat.fields.some((f) => keysSet.has(f.key)))
        .map((cat) => cat.id);
      setExpandedCategories(new Set(toExpand));
    },
    [allFieldKeys],
  );

  const clearAll = useCallback(() => {
    setSelectedFields(new Set());
    setActivePreset(null);
    setSelectedStatuses([]);
    setSelectedPayments([]);
    setOrderType("");
    setMerchantId(undefined);
    setDateDays(30);
    setIsCustomDate(false);
    setCustomFrom("");
    setCustomTo("");
  }, []);

  const toggleArrayItem = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
      setter((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
      );
    },
    [],
  );

  const handleDownload = useCallback(async () => {
    if (selectedFields.size === 0) {
      toast.error("Please select at least one field");
      return;
    }
    if (dateRangeError) {
      toast.error(dateRangeError);
      return;
    }
    try {
      await downloadReport.mutateAsync({
        fields: Array.from(selectedFields),
        filters: reportFilters,
      });
      toast.success("Report downloaded successfully");
    } catch {
      toast.error("Failed to generate report. Please try again.");
    }
  }, [selectedFields, reportFilters, downloadReport, dateRangeError]);

  const selectedCount = selectedFields.size;
  const canDownload =
    selectedCount > 0 && dateRangeError === null && (previewCount ?? 0) > 0;

  const merchantLabel = merchantId
    ? merchantOptions.find((m) => m.value === merchantId)?.label
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <PageHeader
        icon={FileSpreadsheet}
        title="Reports"
        subtitle={
          merchantLabel
            ? `Building report scoped to ${merchantLabel}`
            : "Build cross-merchant reports by selecting fields and filters, then download as CSV"
        }
        titleExtra={
          selectedCount > 0 ? (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground hover:bg-background-elevated transition-colors"
            >
              <RotateCcw size={13} />
              Reset all
            </button>
          ) : undefined
        }
      />

      {/* ── Quick Presets ── */}
      <section className="bg-background-elevated rounded-2xl border border-border-light p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Quick Presets</h2>
          <span className="text-[11px] text-muted">— start with a template</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {REPORT_PRESETS.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`group relative text-left p-3 rounded-xl border transition-all duration-200 ${
                  isActive
                    ? "border-primary/40 bg-primary/[0.06] shadow-sm"
                    : "border-border-light hover:border-primary/20 hover:bg-primary/[0.02]"
                }`}
              >
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 size={14} className="text-primary" />
                  </div>
                )}
                <p
                  className={`text-xs font-semibold mb-0.5 ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}
                >
                  {preset.label}
                </p>
                <p className="text-[10px] text-muted leading-snug line-clamp-2">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ── Left: Field Selector ── */}
        <div className="xl:col-span-2 space-y-3">
          <section className="bg-background-elevated rounded-2xl border border-border-light p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Columns3 size={15} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Select Fields</h2>
                {selectedCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-[10px] font-bold text-white">
                    {selectedCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedCount === allFieldKeys.length) {
                      setSelectedFields(new Set());
                      setActivePreset(null);
                    } else {
                      setSelectedFields(new Set(allFieldKeys));
                      setActivePreset("all_fields");
                    }
                  }}
                  className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {selectedCount === allFieldKeys.length ? "Deselect all" : "Select all"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {FIELD_CATEGORIES.map((cat) => {
                const isExpanded = expandedCategories.has(cat.id);
                const catKeys = cat.fields.map((f) => f.key);
                const selectedInCat = catKeys.filter((k) => selectedFields.has(k)).length;
                const allInCatSelected = catKeys.length > 0 && selectedInCat === catKeys.length;

                return (
                  <div
                    key={cat.id}
                    className="border border-border-light rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleCategoryExpand(cat.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-background hover:bg-background-elevated/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(catKeys);
                          }}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                            allInCatSelected
                              ? "bg-primary border-primary"
                              : selectedInCat > 0
                                ? "border-primary/60 bg-primary/10"
                                : "border-border hover:border-primary/40"
                          }`}
                        >
                          {allInCatSelected && (
                            <Check size={10} className="text-white" strokeWidth={3} />
                          )}
                          {!allInCatSelected && selectedInCat > 0 && (
                            <div className="w-1.5 h-1.5 rounded-sm bg-primary" />
                          )}
                        </button>
                        <div className="text-left">
                          <span className="text-xs font-semibold text-foreground">
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-muted ml-2 hidden sm:inline">
                            {cat.description}
                          </span>
                        </div>
                        {selectedInCat > 0 && (
                          <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                            {selectedInCat}/{catKeys.length}
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-muted shrink-0" />
                      ) : (
                        <ChevronDown size={14} className="text-muted shrink-0" />
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pt-1 flex flex-wrap gap-1.5">
                            {cat.fields.map((field) => {
                              const isSelected = selectedFields.has(field.key);
                              return (
                                <button
                                  key={field.key}
                                  onClick={() => toggleField(field.key)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                                    isSelected
                                      ? "bg-primary/10 text-primary border border-primary/30 shadow-sm"
                                      : "bg-background text-muted border border-border-light hover:border-primary/20 hover:text-foreground"
                                  }`}
                                >
                                  {isSelected && <Check size={10} strokeWidth={3} />}
                                  {field.label}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Right: Filters + Download ── */}
        <div className="space-y-3">
          <section className="bg-background-elevated rounded-2xl border border-border-light p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Filters</h2>
            </div>

            {/* Merchant scope — admin-only */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-muted mb-1.5 block flex items-center gap-1">
                <Users size={11} />
                Merchant
                <span className="text-muted/70 ml-1">— leave empty for all</span>
              </label>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="All merchants"
                value={merchantId}
                onChange={(val) => setMerchantId(val || undefined)}
                className="w-full"
                size="small"
                options={merchantOptions}
              />
            </div>

            {/* Date presets */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-muted mb-1.5 block">
                Date Range
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.days}
                    onClick={() => {
                      setDateDays(p.days);
                      setIsCustomDate(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      !isCustomDate && dateDays === p.days
                        ? "bg-primary text-white shadow-sm"
                        : "bg-background text-muted border border-border-light hover:border-primary/20 hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => setIsCustomDate(true)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    isCustomDate
                      ? "bg-primary text-white shadow-sm"
                      : "bg-background text-muted border border-border-light hover:border-primary/20 hover:text-foreground"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {isCustomDate && (
              <div className="flex items-center gap-2 mb-3">
                <DatePicker
                  value={customFrom ? dayjs(customFrom) : null}
                  onChange={(d) => setCustomFrom(d ? d.format("YYYY-MM-DD") : "")}
                  placeholder="From"
                  format="DD MMM YYYY"
                  allowClear
                  size="small"
                  className="flex-1"
                />
                <span className="text-xs text-muted">to</span>
                <DatePicker
                  value={customTo ? dayjs(customTo) : null}
                  onChange={(d) => setCustomTo(d ? d.format("YYYY-MM-DD") : "")}
                  placeholder="To"
                  format="DD MMM YYYY"
                  allowClear
                  size="small"
                  className="flex-1"
                />
              </div>
            )}

            {/* Order type */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-muted mb-1.5 block">
                Order Type
              </label>
              <div className="flex gap-1.5">
                {ORDER_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setOrderType(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex-1 ${
                      orderType === opt.value
                        ? "bg-primary text-white shadow-sm"
                        : "bg-background text-muted border border-border-light hover:border-primary/20 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status multi-select */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-muted mb-1.5 block">
                Order Status
                {selectedStatuses.length > 0 && (
                  <span className="text-primary ml-1">({selectedStatuses.length})</span>
                )}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = selectedStatuses.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleArrayItem(setSelectedStatuses, opt.value)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "bg-background text-muted border border-border-light hover:border-primary/20"
                      }`}
                    >
                      {isActive && <Check size={9} strokeWidth={3} />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment type multi-select */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-muted mb-1.5 block">
                Payment Type
                {selectedPayments.length > 0 && (
                  <span className="text-primary ml-1">({selectedPayments.length})</span>
                )}
              </label>
              <div className="flex gap-1.5">
                {PAYMENT_OPTIONS.map((opt) => {
                  const isActive = selectedPayments.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleArrayItem(setSelectedPayments, opt.value)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex-1 ${
                        isActive
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "bg-background text-muted border border-border-light hover:border-primary/20 hover:text-foreground"
                      }`}
                    >
                      {isActive && <Check size={10} strokeWidth={3} />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── Download Card ── */}
          <section className="bg-background-elevated rounded-2xl border border-border-light p-4 sm:p-5 sticky top-4">
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Generate Report</h2>
            </div>

            <div className="bg-background rounded-xl border border-border-light p-3 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Scope</span>
                <span className="text-xs font-semibold text-foreground truncate max-w-[60%] text-right">
                  {merchantLabel ?? "All merchants"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Selected fields</span>
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    selectedCount > 0 ? "text-primary" : "text-muted"
                  }`}
                >
                  {selectedCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Matching orders</span>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {isPreviewLoading ? (
                    <Loader2 size={12} className="animate-spin text-muted" />
                  ) : (
                    (previewCount ?? 0).toLocaleString("en-IN")
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Format</span>
                <span className="text-xs font-semibold text-foreground">CSV</span>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={!canDownload || downloadReport.isPending}
              className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all duration-200 ${
                canDownload && !downloadReport.isPending
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                  : "bg-border-light text-muted cursor-not-allowed"
              }`}
            >
              {downloadReport.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download CSV
                </>
              )}
            </button>

            {selectedCount === 0 && (
              <p className="text-[10px] text-muted text-center mt-2 flex items-center justify-center gap-1">
                <FileWarning size={11} />
                Select at least one field to generate a report
              </p>
            )}
            {dateRangeError && (
              <p className="text-[10px] text-error text-center mt-2 flex items-center justify-center gap-1">
                <FileWarning size={11} />
                {dateRangeError}
              </p>
            )}
            {!dateRangeError && selectedCount > 0 && previewCount === 0 && !isPreviewLoading && (
              <p className="text-[10px] text-error text-center mt-2 flex items-center justify-center gap-1">
                <FileWarning size={11} />
                No orders match the selected filters
              </p>
            )}
            {downloadReport.isSuccess && (
              <p className="text-[10px] text-success text-center mt-2 flex items-center justify-center gap-1">
                <CheckCircle2 size={11} />
                Report downloaded successfully
              </p>
            )}
          </section>
        </div>
      </div>
    </motion.div>
  );
}
