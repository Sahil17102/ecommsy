import { motion } from "framer-motion";

interface ToggleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface FormToggleProps {
  label?: string;
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
}

export function FormToggle({ label, options, value, onChange }: FormToggleProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-foreground mb-1.5">
          {label}
        </label>
      )}
      <div className="relative inline-flex items-center bg-background border border-border-light rounded-xl p-1 gap-0.5">
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`relative z-10 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted hover:text-foreground"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={label ?? "toggle"}
                  className="absolute inset-0 bg-primary/[0.08] border border-primary/20 rounded-lg"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {option.icon}
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
