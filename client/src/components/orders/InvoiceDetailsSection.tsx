import { useRef } from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import {
  FileText,
  IndianRupee,
  Hash,
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  Upload,
  X,
  Info,
} from "lucide-react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { FormInput } from "@/components/forms";
import { FormSectionCard } from "@/components/common";
import {
  generateInvoiceNumber,
  getTodayDate,
  formatCurrency,
} from "@/utils/orderHelpers";
import type { OrderFormValues } from "@/schemas/orderSchema";

function InvoiceRow({
  index,
  onRemove,
  canRemove,
}: {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<OrderFormValues>();

  const invoiceErrors = errors.invoices?.[index];
  const invoiceValue = Number(watch(`invoices.${index}.invoiceValue`)) || 0;
  const ebnNumber = watch(`invoices.${index}.ebnNumber`) || "";
  const invoiceFile = watch(`invoices.${index}.invoiceFile`);

  const handleRefreshNumber = () => {
    setValue(`invoices.${index}.invoiceNumber`, generateInvoiceNumber());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setValue(`invoices.${index}.invoiceFile`, file);
  };

  const handleRemoveFile = () => {
    setValue(`invoices.${index}.invoiceFile`, null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileName =
    invoiceFile instanceof File ? invoiceFile.name : null;

  // Show EBN hint when value > 50k
  const showEbnHint = invoiceValue > 50000;

  return (
    <div className="relative p-4 rounded-xl border border-border-light bg-background/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted">
          Invoice {index + 1}
        </span>
        <div className="flex items-center gap-3">
          {invoiceValue > 0 && (
            <span className="text-xs font-bold text-foreground">
              {formatCurrency(invoiceValue)}
            </span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 rounded-md text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 1: Invoice Number, Date, Value */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormInput
          label="Invoice Number"
          required
          placeholder="INV-0000000000"
          icon={<Hash className="w-4 h-4" />}
          registration={register(`invoices.${index}.invoiceNumber`)}
          error={invoiceErrors?.invoiceNumber?.message}
          rightElement={
            <button
              type="button"
              onClick={handleRefreshNumber}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/[0.06] transition-colors"
              title="Generate new invoice number"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          }
        />
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Invoice Date<span className="text-red-500 ml-0.5">*</span>
          </label>
          <Controller
            name={`invoices.${index}.invoiceDate`}
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value ? dayjs(field.value) : null}
                onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : "")}
                format="DD MMM YYYY"
                className="w-full h-12"
                status={invoiceErrors?.invoiceDate ? "error" : undefined}
                allowClear
              />
            )}
          />
          {invoiceErrors?.invoiceDate?.message && (
            <p className="text-xs text-red-500 font-medium mt-1.5">
              {invoiceErrors.invoiceDate.message}
            </p>
          )}
        </div>
        <FormInput
          label="Invoice Value"
          required
          placeholder="0.00"
          type="number"
          icon={<IndianRupee className="w-4 h-4" />}
          suffix="INR"
          registration={register(`invoices.${index}.invoiceValue`, {
            valueAsNumber: true,
          })}
          error={invoiceErrors?.invoiceValue?.message}
        />
      </div>

      {/* EBN hint */}
      {showEbnHint && (
        <div className="flex items-start gap-1.5 mt-3 p-2.5 rounded-lg bg-violet-50 border border-violet-200/60">
          <Info className="w-3.5 h-3.5 text-violet-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-violet-700 leading-relaxed">
            EBN Number is required when invoice value exceeds{" "}
            <strong>₹50,000</strong> or total chargeable weight exceeds{" "}
            <strong>100 kg</strong>.
          </p>
        </div>
      )}

      {/* Row 2: EBN Number & Expiry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <FormInput
          label="EBN Number"
          placeholder="Optional"
          icon={<Shield className="w-4 h-4" />}
          registration={register(`invoices.${index}.ebnNumber`)}
          error={invoiceErrors?.ebnNumber?.message}
        />
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            EBN Expiry
          </label>
          <Controller
            name={`invoices.${index}.ebnExpiry`}
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value ? dayjs(field.value) : null}
                onChange={(d) => field.onChange(d ? d.format("YYYY-MM-DD") : "")}
                format="DD MMM YYYY"
                className="w-full h-12"
                disabled={!ebnNumber}
                status={invoiceErrors?.ebnExpiry ? "error" : undefined}
                allowClear
              />
            )}
          />
          {invoiceErrors?.ebnExpiry?.message && (
            <p className="text-xs text-red-500 font-medium mt-1.5">
              {invoiceErrors.ebnExpiry.message}
            </p>
          )}
        </div>
      </div>

      {/* Row 3: File upload */}
      <div className="mt-3">
        <label className="block text-xs font-semibold text-foreground mb-1.5">
          Invoice File
          <span className="text-muted font-normal ml-1">(Optional)</span>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          className="hidden"
        />
        {fileName ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border-light bg-background">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground truncate flex-1">
              {fileName}
            </span>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1 rounded-md text-muted hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 w-full p-2.5 rounded-xl border-2 border-dashed border-border-light text-xs font-medium text-muted hover:border-primary/30 hover:text-primary hover:bg-primary/[0.02] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload PDF, PNG or JPG
          </button>
        )}
      </div>
    </div>
  );
}

export function InvoiceDetailsSection() {
  const { control, watch } = useFormContext<OrderFormValues>();
  const orderType = watch("orderType");
  const isB2B = orderType === "B2B";

  const { fields, append, remove } = useFieldArray({
    control,
    name: "invoices",
  });

  if (!isB2B) return null;

  return (
    <FormSectionCard
      icon={<FileText className="w-4.5 h-4.5 text-violet-600" />}
      iconColor="bg-violet-50"
      title="Invoice Details"
      subtitle="B2B invoice and e-way bill information"
      index={4}
    >
      {/* General EBN guidance — visible by default so users know the rule */}
      <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-violet-50/60 border border-violet-200/60">
        <Info className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-800 leading-relaxed">
          <strong>EBN (E-Way Bill Number)</strong> is required when invoice value
          exceeds <strong>₹50,000</strong> or total chargeable weight exceeds{" "}
          <strong>100&nbsp;kg</strong>. If provided, an <strong>EBN Expiry</strong>{" "}
          date must also be entered.
        </p>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <InvoiceRow
            key={field.id}
            index={index}
            onRemove={() => remove(index)}
            canRemove={fields.length > 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          append({
            invoiceNumber: generateInvoiceNumber(),
            invoiceDate: getTodayDate(),
            invoiceValue: 0,
            ebnNumber: "",
            ebnExpiry: "",
            invoiceFile: null,
          })
        }
        className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl border-2 border-dashed border-violet-300/50 text-sm font-semibold text-violet-600 hover:bg-violet-50/50 hover:border-violet-400/50 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        Add Invoice
      </button>
    </FormSectionCard>
  );
}
