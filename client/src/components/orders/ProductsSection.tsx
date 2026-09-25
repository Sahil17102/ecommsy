import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingBag,
  Plus,
  Trash2,
  ChevronDown,
  IndianRupee,
  Layers,
} from "lucide-react";
import { FormInput, FormTextarea } from "@/components/forms";
import { FormSectionCard } from "@/components/common";
import { formatCurrency } from "@/utils/orderHelpers";
import type { OrderFormValues } from "@/schemas/orderSchema";

function ProductRow({
  index,
  onRemove,
  canRemove,
}: {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [showOptional, setShowOptional] = useState(false);
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<OrderFormValues>();

  const unitPrice = watch(`products.${index}.unitPrice`) || 0;
  const quantity = watch(`products.${index}.quantity`) || 0;
  const rowTotal = Number(unitPrice) * Number(quantity);
  const productErrors = errors.products?.[index];

  return (
    <div className="relative p-4 rounded-xl border border-border-light bg-background/50">
      {/* Header row with product number and remove */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted">
          Product {index + 1}
        </span>
        <div className="flex items-center gap-3">
          {rowTotal > 0 && (
            <span className="text-xs font-bold text-foreground">
              {formatCurrency(rowTotal)}
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

      {/* Main fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2">
          <FormInput
            label="Product Name"
            required
            placeholder="Enter product name"
            icon={<ShoppingBag className="w-4 h-4" />}
            registration={register(`products.${index}.name`)}
            error={productErrors?.name?.message}
          />
        </div>
        <FormInput
          label="Unit Price"
          required
          placeholder="0.00"
          type="number"
          icon={<IndianRupee className="w-4 h-4" />}
          registration={register(`products.${index}.unitPrice`, { valueAsNumber: true })}
          error={productErrors?.unitPrice?.message}
        />
        <FormInput
          label="Quantity"
          required
          placeholder="1"
          type="number"
          icon={<Layers className="w-4 h-4" />}
          registration={register(`products.${index}.quantity`, { valueAsNumber: true })}
          error={productErrors?.quantity?.message}
        />
      </div>

      {/* Optional fields toggle */}
      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="flex items-center gap-1.5 mt-3 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
      >
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${showOptional ? "rotate-180" : ""}`}
        />
        {showOptional ? "Hide" : "More"} details
      </button>

      <AnimatePresence>
        {showOptional && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <FormTextarea
                label="Description"
                placeholder="Optional product description"
                rows={2}
                registration={register(`products.${index}.description`)}
              />
              <FormInput
                label="Tax Rate"
                placeholder="0"
                type="number"
                suffix="%"
                registration={register(`products.${index}.taxRate`, { valueAsNumber: true })}
              />
              <FormInput
                label="HSN Code"
                placeholder="HSN"
                registration={register(`products.${index}.hsn`)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ProductsSection() {
  const { control } = useFormContext<OrderFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "products",
  });

  return (
    <FormSectionCard
      icon={<ShoppingBag className="w-4.5 h-4.5 text-emerald-600" />}
      iconColor="bg-emerald-50"
      title="Products"
      subtitle="Add items included in this order"
      index={2}
    >
      <div className="space-y-3">
        {fields.map((field, index) => (
          <ProductRow
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
          append({ name: "", unitPrice: 0, quantity: 1, description: "", taxRate: undefined, hsn: "" })
        }
        className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl border-2 border-dashed border-primary/30 text-sm font-semibold text-primary hover:bg-primary/[0.04] hover:border-primary/50 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        Add Product
      </button>
    </FormSectionCard>
  );
}
