import { useFormContext, useFieldArray } from "react-hook-form";
import { Package, Plus, Trash2, Info } from "lucide-react";
import { FormSectionCard } from "@/components/common";
import { FormInput } from "@/components/forms";
import {
  totalBoxCount,
  totalDeadWeightKg,
  totalVolumetricWeightKg,
} from "@/utils/b2bBoxes";
import type { OrderFormValues } from "@/schemas/orderSchema";

function PackageWeightSummary({
  packages,
}: {
  packages: Array<{ quantity?: number; weight: number; length: number; breadth: number; height: number }>;
}) {
  const totalBoxes = totalBoxCount(packages);
  const totalDeadWeight = totalDeadWeightKg(packages);
  const totalVolumetricWeight = totalVolumetricWeightKg(packages);
  const totalBillable = Math.max(totalDeadWeight, totalVolumetricWeight);

  return (
    <div className="rounded-xl bg-primary/[0.03] border border-primary/10 p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Info className="w-3.5 h-3.5 text-muted" />
        <p className="text-[11px] text-muted">
          B2B billable weight = max(total dead weight, total volumetric weight). Volumetric = L x B x H / 5000 per box.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 text-center bg-background border border-border-light">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Dead Weight</p>
          <p className="text-lg font-bold text-foreground">{totalDeadWeight.toFixed(2)} kg</p>
          <p className="text-[10px] text-muted mt-0.5">{totalBoxes} box(es)</p>
        </div>
        <div className="rounded-xl p-3 text-center bg-background border border-border-light">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Volumetric</p>
          <p className="text-lg font-bold text-foreground">{totalVolumetricWeight.toFixed(2)} kg</p>
          <p className="text-[10px] text-muted mt-0.5">L x B x H / 5000</p>
        </div>
        <div className="rounded-xl p-3 text-center bg-accent/[0.06] border border-accent/20">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Billable</p>
          <p className="text-lg font-bold text-accent">{totalBillable.toFixed(2)} kg</p>
          <p className="text-[10px] text-muted mt-0.5">
            {totalBillable === totalVolumetricWeight ? "VOLUMETRIC" : "DEAD WEIGHT"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function B2bPackagesSection() {
  const {
    register,
    watch,
    control,
    formState: { errors },
  } = useFormContext<OrderFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "packages",
  });

  const packages = watch("packages") ?? [];

  return (
    <FormSectionCard
      icon={<Package className="w-4.5 h-4.5 text-blue-600" />}
      iconColor="bg-blue-50"
      title="Packages / Boxes"
      subtitle="Add dimensions and weight for each box in the shipment"
      index={3}
    >
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-xl border border-border-light bg-background p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                Box {index + 1}
              </h4>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-1.5 rounded-lg text-error hover:bg-error-bg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <FormInput
                label="Qty"
                placeholder="1"
                type="number"
                registration={register(`packages.${index}.quantity`, { valueAsNumber: true })}
                error={(errors.packages as any)?.[index]?.quantity?.message}
              />
              <FormInput
                label="Weight"
                required
                placeholder="0"
                type="number"
                suffix="kg"
                registration={register(`packages.${index}.weight`, { valueAsNumber: true })}
                error={(errors.packages as any)?.[index]?.weight?.message}
              />
              <FormInput
                label="Length"
                required
                placeholder="0"
                type="number"
                suffix="cm"
                registration={register(`packages.${index}.length`, { valueAsNumber: true })}
                error={(errors.packages as any)?.[index]?.length?.message}
              />
              <FormInput
                label="Breadth"
                required
                placeholder="0"
                type="number"
                suffix="cm"
                registration={register(`packages.${index}.breadth`, { valueAsNumber: true })}
                error={(errors.packages as any)?.[index]?.breadth?.message}
              />
              <FormInput
                label="Height"
                required
                placeholder="0"
                type="number"
                suffix="cm"
                registration={register(`packages.${index}.height`, { valueAsNumber: true })}
                error={(errors.packages as any)?.[index]?.height?.message}
              />
              <div className="hidden">
                <input type="hidden" {...register(`packages.${index}.boxId`)} />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            append({ boxId: `BOX-${fields.length + 1}`, quantity: 1, weight: 0, length: 0, breadth: 0, height: 0 })
          }
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-border-light hover:border-primary/30 text-sm font-medium text-muted hover:text-primary transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Box
        </button>

        {packages.length > 0 && (
          <PackageWeightSummary
            packages={packages.map((p) => ({
              quantity: Number(p.quantity) || 1,
              weight: Number(p.weight) || 0,
              length: Number(p.length) || 0,
              breadth: Number(p.breadth) || 0,
              height: Number(p.height) || 0,
            }))}
          />
        )}
      </div>
    </FormSectionCard>
  );
}
