import { type UseFormRegisterReturn } from "react-hook-form";
import { motion } from "framer-motion";

interface FormTextareaProps {
  label: string;
  placeholder?: string;
  icon?: React.ReactNode;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  registration?: UseFormRegisterReturn;
  error?: string;
}

export function FormTextarea({
  label,
  placeholder,
  icon,
  rows = 3,
  disabled,
  required,
  registration,
  error,
}: FormTextareaProps) {
  return (
    <div className="min-w-0">
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div
        className={`group relative flex rounded-xl border-2 transition-all duration-200 overflow-hidden ${
          error
            ? "border-red-400 bg-red-50/30"
            : disabled
              ? "border-border-light bg-background opacity-60 cursor-not-allowed"
              : "border-border-light bg-background hover:border-primary/20 focus-within:border-primary focus-within:bg-primary/[0.03] focus-within:shadow-md focus-within:shadow-primary/10"
        }`}
      >
        {icon && (
          <span className="flex items-center justify-center w-10 pt-3 text-muted group-focus-within:text-primary transition-colors shrink-0">
            {icon}
          </span>
        )}
        <textarea
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          {...registration}
          className={`min-w-0 flex-1 py-3 text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary resize-none ${
            !icon ? "pl-3" : ""
          } pr-3 ${disabled ? "cursor-not-allowed" : ""}`}
        />
      </div>
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
