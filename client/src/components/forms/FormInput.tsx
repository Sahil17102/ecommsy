import { motion } from "framer-motion";
import { type UseFormRegisterReturn } from "react-hook-form";

interface FormInputProps {
  label: string;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  suffix?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  maxLength?: number;
  min?: number;
  registration?: UseFormRegisterReturn;
  error?: string;
  rightElement?: React.ReactNode;
  value?: string;
  pattern?: RegExp
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FormInput({
  label,
  placeholder,
  icon,
  type = "text",
  suffix,
  disabled,
  readOnly,
  required,
  maxLength,
  min,
  registration,
  error,
  rightElement,
  value,
  onChange,
  pattern
}: FormInputProps) {
  const isNumber = type === "number";
  return (
    <div className="min-w-0">
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div
        className={`group relative flex items-center h-12 rounded-xl border-2 transition-all duration-200 overflow-hidden ${error
          ? "border-red-400 bg-red-50/30"
          : disabled
            ? "border-border-light bg-background opacity-60 cursor-not-allowed"
            : "border-border-light bg-background hover:border-primary/20 focus-within:border-primary focus-within:bg-primary/[0.03] focus-within:shadow-md focus-within:shadow-primary/10"
          }`}
      >
        {icon && (
          <span className="flex items-center justify-center w-10 h-full text-muted group-focus-within:text-primary transition-colors shrink-0">
            {icon}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          min={isNumber ? (min ?? 0) : undefined}
          value={value}
          onChange={onChange}
          pattern={pattern ? String(pattern) : undefined}
          onWheel={isNumber ? (e) => (e.target as HTMLInputElement).blur() : undefined}
          {...registration}
          className={`min-w-0 flex-1 h-full text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary ${!icon ? "pl-3" : ""
            } ${suffix || rightElement ? "pr-1" : "pr-3"} ${disabled ? "cursor-not-allowed" : ""
            } ${isNumber ? "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" : ""}`}
        />
        {suffix && (
          <span className="px-3 text-xs font-medium text-muted shrink-0 whitespace-nowrap">
            {suffix}
          </span>
        )}
        {rightElement && <div className="pr-2 shrink-0">{rightElement}</div>}
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
