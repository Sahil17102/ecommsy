import { Mail, Phone } from "lucide-react";

type Channel = "email" | "phone";

interface IdentifierInputProps {
  value: string;
  onChange: (value: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  channel?: Channel;
}

export function IdentifierInput({ value, onChange, focused, onFocus, onBlur, channel = "email" }: IdentifierInputProps) {
  const isPhone = channel === "phone";

  return (
    <div
      className={`relative flex items-center h-12 rounded-xl border transition-all duration-200 ${
        focused
          ? "border-primary/40 bg-primary/[0.02] ring-[3px] ring-primary-bg"
          : "border-border-light bg-surface-muted/50 hover:border-border"
      }`}
    >
      <span className={`flex items-center justify-center w-10 h-full transition-colors ${focused ? "text-primary" : "text-tertiary"}`}>
        {isPhone ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
      </span>
      <input
        type={isPhone ? "tel" : "email"}
        inputMode={isPhone ? "numeric" : "email"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={isPhone ? "10-digit mobile number" : "you@company.com"}
        autoFocus
        className="flex-1 h-full pr-3 text-sm font-medium text-foreground bg-transparent border-none outline-none placeholder:text-tertiary"
      />
    </div>
  );
}
