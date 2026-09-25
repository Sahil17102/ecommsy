import { useFormContext } from "react-hook-form";
import { Package, Weight, Info } from "lucide-react";
import { FormInput, DimensionFields } from "@/components/forms";
import { FormSectionCard } from "@/components/common";
import {
  calcVolumetricWeight,
  calcChargeableWeight,
} from "@/utils/orderHelpers";
import type { OrderFormValues } from "@/schemas/orderSchema";

function WeightCard({
  label,
  value,
  subtitle,
  highlighted,
}: {
  label: string;
  value: string;
  subtitle: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center ${
        highlighted
          ? "bg-accent/[0.06] border border-accent/20"
          : "bg-background border border-border-light"
      }`}
    >
      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={`text-lg font-bold ${highlighted ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted mt-0.5">{subtitle}</p>
    </div>
  );
}

export function PackageDetailsSection() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<OrderFormValues>();

  const weightG = Number(watch("weight")) || 0;
  const length = Number(watch("length")) || 0;
  const breadth = Number(watch("breadth")) || 0;
  const height = Number(watch("height")) || 0;

  const actualKg = weightG / 1000;
  const volumetricKg = calcVolumetricWeight(length, breadth, height);
  const chargeableKg = calcChargeableWeight(actualKg, volumetricKg);

  const chargeableSource =
    chargeableKg === 0.5 && actualKg < 0.5 && volumetricKg < 0.5
      ? "MINIMUM"
      : chargeableKg === volumetricKg
        ? "VOLUMETRIC"
        : "ACTUAL";

  return (
    <FormSectionCard
      icon={<Package className="w-4.5 h-4.5 text-blue-600" />}
      iconColor="bg-blue-50"
      title="Package Details"
      subtitle="Weight and dimensions"
      index={3}
    >
      <div className="space-y-5">
        {/* Input fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FormInput
            label="Weight"
            required
            placeholder="0"
            type="number"
            icon={<Weight className="w-4 h-4" />}
            suffix="g"
            registration={register("weight", { valueAsNumber: true })}
            error={errors.weight?.message}
          />
          <DimensionFields className="col-span-2 sm:col-span-3 grid grid-cols-3 gap-4" />
        </div>

        {/* Weight calculation display */}
        <div className="rounded-xl bg-primary/[0.03] border border-primary/10 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Info className="w-3.5 h-3.5 text-muted" />
            <p className="text-[11px] text-muted">
              Minimum chargeable weight is <strong>0.50 Kg</strong>. Chargeable
              weight = max(actual, volumetric, minimum).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <WeightCard
              label="Actual Weight"
              value={`${actualKg.toFixed(2)} kg`}
              subtitle={`${weightG} grams`}
            />
            <WeightCard
              label="Volumetric"
              value={`${volumetricKg.toFixed(2)} kg`}
              subtitle="L x B x H / 5000"
            />
            <WeightCard
              label="Chargeable"
              value={`${chargeableKg.toFixed(2)} kg`}
              subtitle={chargeableSource}
              highlighted
            />
          </div>
        </div>
      </div>
    </FormSectionCard>
  );
}
