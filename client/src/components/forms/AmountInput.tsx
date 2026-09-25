import { type UseFormRegisterReturn } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { IndianRupee } from "lucide-react";
import { amountToWords } from "@/lib/utils";

interface AmountInputProps {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  registration?: UseFormRegisterReturn;
  error?: string;
  /** Current numeric value — needed to display words */
  value?: number;
}

export function AmountInput({
  label,
  placeholder = "0.00",
  disabled,
  readOnly,
  required,
  registration,
  error,
  value,
}: AmountInputProps) {
  const words = value && value > 0 ? amountToWords(value) : "";

  return (
    <div className="min-w-0">
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div
        className={`group relative flex items-center h-12 rounded-xl border-2 transition-all duration-200 overflow-hidden ${
          error
            ? "border-red-400 bg-red-50/30"
            : disabled
              ? "border-border-light bg-background opacity-60 cursor-not-allowed"
              : "border-border-light bg-background hover:border-primary/20 focus-within:border-primary focus-within:bg-primary/[0.03] focus-within:shadow-md focus-within:shadow-primary/10"
        }`}
      >
        <span className="flex items-center justify-center w-10 h-full text-muted group-focus-within:text-primary transition-colors shrink-0">
          <IndianRupee className="w-4 h-4" />
        </span>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          {...registration}
          className={`min-w-0 flex-1 h-full text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary pr-3 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            disabled ? "cursor-not-allowed" : ""
          }`}
        />
      </div>

      {/* Amount in words */}
      <AnimatePresence>
        {words && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-muted mt-1.5 leading-snug italic"
          >
            {words}
          </motion.p>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500 font-medium mt-1.5"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
