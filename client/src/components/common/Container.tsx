import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const maxWidthMap = {
  sm: "max-w-container-sm",
  md: "max-w-container-md",
  lg: "max-w-container-lg",
  xl: "max-w-container-xl",
  "2xl": "max-w-container-2xl",
} as const;

export function Container({ children, className = "", maxWidth = "xl" }: ContainerProps) {
  return (
    <div className={`w-full mx-auto px-container sm:px-container-sm ${maxWidthMap[maxWidth]} ${className}`}>
      {children}
    </div>
  );
}
