import { Input } from "antd";
import { regex } from "@/lib/constants";

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export function OtpInput({ length = 4, onComplete, disabled = false }: OtpInputProps) {
  return (
    <div className="flex justify-center">
      <Input.OTP
        length={length}
        disabled={disabled}
        size="large"
        onChange={(value) => {
          if (value.length === length && regex.digitsOnly.test(value)) {
            onComplete(value);
          }
        }}
      />
    </div>
  );
}
