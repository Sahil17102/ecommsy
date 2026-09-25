import { useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import {
  Receipt,
  Tag,
  Wallet,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { animationConfig } from "@/config/animations";
import { FormInput } from "@/components/forms";
import { calcSubtotal, formatCurrency } from "@/utils/orderHelpers";
import type { OrderFormValues } from "@/schemas/orderSchema";

interface ChargesSummarySectionProps {
  isSubmitting: boolean;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
}

function SummaryRow({
  label,
  value,
  bold,
  accent,
  negative,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${bold ? "font-semibold text-foreground" : "text-muted"}`}>
        {negative && "- "}
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          accent ? "text-accent" : bold ? "text-foreground" : "text-foreground"
        }`}
      >
        {negative && "- "}
        {value}
      </span>
    </div>
  );
}

export function ChargesSummarySection({
  isSubmitting,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  nextLabel = "Next Step",
}: ChargesSummarySectionProps) {
  const { register, watch } = useFormContext<OrderFormValues>();

  const products = watch("products") || [];
  const transactionFee = Number(watch("transactionFee")) || 0;
  const discount = Number(watch("discount")) || 0;
  const prepaidAmount = Number(watch("prepaidAmount")) || 0;
  const paymentType = watch("paymentType");

  const subtotal = calcSubtotal(products);
  const totalOrderValue = subtotal + transactionFee - discount;
  const collectableValue =
    paymentType === "cod"
      ? Math.max(totalOrderValue - prepaidAmount, 0)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: 4 * animationConfig.stagger.normal,
        ease: animationConfig.ease.out,
      }}
      className="space-y-5"
    >
      {/* Additional Charges Card */}
      <div className="bg-background-elevated rounded-2xl border border-border-light p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
            <Receipt className="w-4.5 h-4.5 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Additional Charges
          </h3>
        </div>

        <div className="space-y-4">
          <FormInput
            label="Transaction Fee"
            placeholder="0.00"
            type="number"
            icon={<Receipt className="w-4 h-4" />}
            suffix="INR"
            registration={register("transactionFee", { valueAsNumber: true })}
          />
          <FormInput
            label="Discount"
            placeholder="0.00"
            type="number"
            icon={<Tag className="w-4 h-4" />}
            suffix="INR"
            registration={register("discount", { valueAsNumber: true })}
          />
          {paymentType === "prepaid" && (
            <FormInput
              label="Prepaid Amount"
              placeholder="0.00"
              type="number"
              icon={<Wallet className="w-4 h-4" />}
              suffix="INR"
              registration={register("prepaidAmount", { valueAsNumber: true })}
            />
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-background-elevated rounded-2xl border border-border-light p-5 sm:p-6">
        <h3 className="text-sm font-bold text-foreground mb-4">
          Order Summary
        </h3>

        <div className="space-y-1">
          <SummaryRow
            label="Sub-total for Product(s)"
            value={formatCurrency(subtotal)}
          />
          {transactionFee > 0 && (
            <SummaryRow
              label="Transaction Fee"
              value={formatCurrency(transactionFee)}
            />
          )}
          {discount > 0 && (
            <SummaryRow
              label="Discount"
              value={formatCurrency(discount)}
              negative
            />
          )}
        </div>

        <div className="border-t border-border-light my-3" />

        <SummaryRow
          label="Total Order Value"
          value={formatCurrency(totalOrderValue)}
          bold
        />

        {paymentType === "cod" && (
          <>
            {prepaidAmount > 0 && (
              <SummaryRow
                label="Prepaid Amount"
                value={formatCurrency(prepaidAmount)}
                negative
              />
            )}
            <div className="mt-2 p-3 rounded-xl bg-accent/[0.06] border border-accent/20">
              <SummaryRow
                label="Total Collectable (COD)"
                value={formatCurrency(collectableValue)}
                bold
                accent
              />
            </div>
          </>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col gap-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-muted border border-border-light hover:border-primary/20 hover:text-primary hover:bg-primary/[0.04] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

      {currentStep < totalSteps ? (
        <motion.button
          type="button"
          onClick={onNext}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/25 transition-shadow"
        >
          {nextLabel}
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      ) : (
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/25 transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating Order...
            </>
          ) : (
            <>
              Create Order
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      )}
      </div>
    </motion.div>
  );
}
