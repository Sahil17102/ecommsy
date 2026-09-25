import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { KYC_STEPS } from "../config";

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="bg-background-elevated rounded-2xl border border-border-light p-4 sm:p-5 mb-5">
      <div className="flex items-center">
        {KYC_STEPS.map((title, i) => {
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          const isLast = i === KYC_STEPS.length - 1;

          return (
            <div key={title} className="flex items-center flex-1 last:flex-initial">
              {/* Step circle + label group */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                <motion.div
                  className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? "bg-success text-white"
                      : isActive
                        ? "bg-primary text-white shadow-md shadow-primary/25"
                        : "bg-surface-muted border-2 border-border-light text-muted"
                  }`}
                  animate={
                    isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }
                  }
                  transition={{ duration: 0.4 }}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                </motion.div>

                <span
                  className={`text-xs sm:text-sm font-semibold hidden sm:block transition-colors ${
                    isActive
                      ? "text-foreground"
                      : isCompleted
                        ? "text-success"
                        : "text-muted"
                  }`}
                >
                  {title}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-3 sm:mx-4">
                  <div className="h-0.5 rounded-full bg-border-light relative overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-success rounded-full"
                      initial={{ width: "0%" }}
                      animate={{
                        width: isCompleted ? "100%" : "0%",
                      }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile step label */}
      <p className="sm:hidden text-xs font-semibold text-primary mt-3 text-center">
        {KYC_STEPS[currentStep]}
      </p>
    </div>
  );
}
