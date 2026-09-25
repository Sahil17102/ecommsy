import { useState, useRef, useEffect, useCallback } from "react";
import { type UseFormRegisterReturn } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

interface FormSelectProps {
  label: string;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  /** react-hook-form register() return — kept for backward compat */
  registration?: UseFormRegisterReturn;
  /** Controlled value */
  value?: string;
  /** Controlled onChange */
  onChange?: (value: string) => void;
  error?: string;
}

export function FormSelect({
  label,
  options,
  icon,
  disabled,
  required,
  placeholder = "Select an option",
  registration,
  value: controlledValue,
  onChange: controlledOnChange,
  error,
}: FormSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(
    options[0]?.value ?? "",
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement | null>(null);

  const currentValue = controlledValue ?? internalValue;
  const selectedOption = options.find((o) => o.value === currentValue);

  // Sync hidden input for react-hook-form
  useEffect(() => {
    if (hiddenRef.current) hiddenRef.current.value = currentValue;
  }, [currentValue]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Combine refs for react-hook-form
  const setHiddenInputRef = useCallback(
    (el: HTMLInputElement | null) => {
      hiddenRef.current = el;
      const regRef = registration?.ref;
      if (typeof regRef === "function") regRef(el);
      else if (regRef) (regRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    },
    [registration],
  );

  const handleSelect = (val: string) => {
    setInternalValue(val);
    setIsOpen(false);

    // Trigger react-hook-form onChange
    if (registration?.onChange) {
      registration.onChange({
        target: { name: registration.name, value: val },
        type: "change",
      });
    }

    if (controlledOnChange) controlledOnChange(val);
  };

  const toggle = () => {
    if (!disabled) setIsOpen((prev) => !prev);
  };

  return (
    <div className="min-w-0 relative" ref={containerRef}>
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Hidden input for react-hook-form registration */}
      {registration && (
        <input
          type="hidden"
          ref={setHiddenInputRef}
          name={registration.name}
          onBlur={registration.onBlur}
        />
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={toggle}
        className={`group relative flex items-center w-full h-12 rounded-xl border-2 transition-all duration-200 ${
          error
            ? "border-red-400 bg-red-50/30"
            : disabled
              ? "border-border-light bg-background opacity-60 cursor-not-allowed"
              : isOpen
                ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/10"
                : "border-border-light bg-background hover:border-primary/20"
        }`}
      >
        {icon && (
          <span
            className={`flex items-center justify-center w-10 h-full shrink-0 transition-colors ${
              isOpen ? "text-primary" : "text-muted"
            }`}
          >
            {icon}
          </span>
        )}
        <span
          className={`flex-1 text-left text-sm font-medium truncate ${
            !icon ? "pl-3" : ""
          } pr-8 ${selectedOption ? "text-foreground" : "text-muted"}`}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute right-3 text-muted"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
            className="absolute z-50 left-0 right-0 mt-0.5 bg-background-elevated border border-border-light rounded-xl shadow-lg shadow-black/8 overflow-hidden py-1"
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === currentValue;
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.12, delay: i * 0.025 }}
                  onClick={() => handleSelect(opt.value)}
                  className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors ${
                    isSelected
                      ? "text-primary font-semibold bg-primary/[0.05]"
                      : "text-foreground font-medium hover:bg-primary/[0.04]"
                  }`}
                >
                  {/* Selection indicator */}
                  <span
                    className={`flex items-center justify-center w-4 h-4 shrink-0 ${
                      isSelected ? "text-primary" : "text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                  {opt.label}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
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
