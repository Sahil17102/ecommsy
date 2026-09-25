import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Select, InputNumber } from "antd";
import {
  useBillingPreferences,
  useUpdateBillingPreferences,
} from "@/queries/useBillingInvoice";

const billingPreferenceSchema = z
  .object({
    frequency: z.enum(["weekly", "monthly", "manual", "custom"]),
    autoGenerate: z.boolean(),
    customFrequencyDays: z.number().min(1).max(90).optional(),
  })
  .refine(
    (data) => data.frequency !== "custom" || (data.customFrequencyDays && data.customFrequencyDays > 0),
    { message: "Custom frequency days required", path: ["customFrequencyDays"] },
  );

type FormValues = z.infer<typeof billingPreferenceSchema>;

const frequencyOptions = [
  { label: "Weekly (every 7 days)", value: "weekly" },
  { label: "Monthly (every 30 days)", value: "monthly" },
  { label: "Manual (generate on demand)", value: "manual" },
  { label: "Custom interval", value: "custom" },
];

export default function BillingPreferencesPage() {
  const navigate = useNavigate();
  const { data: pref, isLoading } = useBillingPreferences();
  const updateMutation = useUpdateBillingPreferences();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(billingPreferenceSchema),
    defaultValues: {
      frequency: "weekly",
      autoGenerate: true,
      customFrequencyDays: 14,
    },
  });

  useEffect(() => {
    if (pref) {
      reset({
        frequency: pref.frequency,
        autoGenerate: pref.autoGenerate,
        customFrequencyDays: pref.customFrequencyDays ?? 14,
      });
    }
  }, [pref, reset]);

  const frequency = watch("frequency");
  const autoGenerate = watch("autoGenerate");

  function onSubmit(values: FormValues) {
    const payload: Record<string, unknown> = {
      frequency: values.frequency,
      autoGenerate: values.autoGenerate,
    };
    if (values.frequency === "custom") {
      payload.customFrequencyDays = values.customFrequencyDays;
    }

    updateMutation.mutate(payload as any, {
      onSuccess: () => toast.success("Billing preferences updated"),
      onError: () => toast.error("Failed to update preferences"),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/settings")}
          className="p-2 rounded-lg hover:bg-background-elevated transition-colors text-muted"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <CreditCard size={20} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Billing Preferences</h1>
        </div>
      </div>

      <p className="text-sm text-muted">
        Configure how often invoices are generated for your account. When auto-generate is enabled,
        invoices are created automatically at the end of each billing cycle.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="p-5 rounded-xl border border-border-light bg-background-elevated space-y-5">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Billing Frequency
            </label>
            <Controller
              name="frequency"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  className="w-full"
                  size="large"
                  options={frequencyOptions}
                />
              )}
            />
            <p className="text-xs text-muted mt-1">
              {frequency === "weekly" && "An invoice will be generated every 7 days."}
              {frequency === "monthly" && "An invoice will be generated every 30 days."}
              {frequency === "manual" && "Invoices will only be generated when you request them."}
              {frequency === "custom" && "Specify a custom number of days between invoices."}
            </p>
          </div>

          {/* Custom days */}
          {frequency === "custom" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Custom Interval (days)
              </label>
              <Controller
                name="customFrequencyDays"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    className="w-full"
                    size="large"
                    min={1}
                    max={90}
                    placeholder="e.g. 14"
                  />
                )}
              />
              {errors.customFrequencyDays && (
                <p className="text-xs text-red-500 mt-1">{errors.customFrequencyDays.message}</p>
              )}
            </div>
          )}

          {/* Auto-generate toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border-light">
            <div>
              <div className="text-sm font-medium text-foreground">Auto-generate Invoices</div>
              <div className="text-xs text-muted mt-0.5">
                {autoGenerate
                  ? "Invoices are created automatically at the end of each cycle"
                  : "You'll need to manually generate invoices from the Billing page"}
              </div>
            </div>
            <Controller
              name="autoGenerate"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                    field.value ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                      field.value ? "translate-x-[22px]" : "translate-x-[2px]"
                    } mt-[2px]`}
                  />
                </button>
              )}
            />
          </div>
        </div>

        {/* Save */}
        <button
          type="submit"
          disabled={!isDirty || updateMutation.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Changes
        </button>
      </form>
    </motion.div>
  );
}
