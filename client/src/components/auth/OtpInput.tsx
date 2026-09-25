import { useState, useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { regex } from "@/lib/constants";

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export function OtpInput({ length = 4, onComplete, disabled = false }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) => refs.current[i]?.focus();

  const handleChange = (i: number, raw: string) => {
    if (!regex.digitsOnly.test(raw)) return;

    const digit = raw.slice(-1);
    const next = [...values];
    next[i] = digit;
    setValues(next);

    if (digit && i < length - 1) focus(i + 1);

    const code = next.join("");
    if (code.length === length && next.every(Boolean)) onComplete(code);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !values[i] && i > 0) focus(i - 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const next = [...values];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setValues(next);
    focus(Math.min(pasted.length, length - 1));

    if (pasted.length === length) onComplete(pasted);
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold rounded-xl border-2
            transition-all duration-200 outline-none
            border-border-light bg-background
            focus:border-primary focus:bg-primary/[0.03] focus:shadow-md focus:shadow-primary/10
            disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
}
