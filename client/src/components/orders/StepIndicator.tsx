import { Check } from "lucide-react";

export interface Step {
  label: string;
  shortLabel: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <div className="w-full">
      {/* ── Desktop & Tablet (sm+) — inline pill stepper ── */}
      <nav aria-label="Progress" className="hidden sm:block">
        <ol className="flex items-center">
          {steps.map((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            const isClickable =
              onStepClick && (isCompleted || isActive);
            const isLast = index === steps.length - 1;

            return (
              <li
                key={step.label}
                className={`flex items-center ${isLast ? "" : "flex-1"}`}
              >
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick?.(stepNum)}
                  className={`
                    flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full
                    text-[13px] font-semibold transition-all duration-300 whitespace-nowrap
                    ${
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : isCompleted
                          ? "bg-primary/[0.08] text-primary hover:bg-primary/[0.12] cursor-pointer"
                          : "text-tertiary cursor-default"
                    }
                  `}
                  aria-current={isActive ? "step" : undefined}
                >
                  {/* Badge */}
                  {isCompleted ? (
                    <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </span>
                  ) : (
                    <span
                      className={`
                        w-7 h-7 rounded-full flex items-center justify-center shrink-0
                        text-[11px] font-bold transition-colors
                        ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "border-2 border-border text-tertiary"
                        }
                      `}
                    >
                      {stepNum}
                    </span>
                  )}
                  {step.label}
                </button>

                {/* Connector */}
                {!isLast && (
                  <div className="flex-1 mx-3 min-w-4" aria-hidden="true">
                    <div className="h-[1.5px] w-full rounded-full bg-border-light overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-primary/40 transition-all duration-500 ease-out ${
                          isCompleted ? "w-full" : "w-0"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ── Mobile — expandable active pill ── */}
      <nav aria-label="Progress" className="sm:hidden">
        <ol className="flex items-center gap-1.5">
          {steps.map((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            const isClickable =
              onStepClick && (isCompleted || isActive);

            return (
              <li
                key={step.label}
                className={isActive ? "flex-1 min-w-0" : ""}
              >
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick?.(stepNum)}
                  className={`
                    flex items-center transition-all duration-300
                    ${
                      isActive
                        ? "gap-2 pl-1.5 pr-3.5 py-1.5 bg-primary text-white rounded-full shadow-md shadow-primary/20 w-full"
                        : isCompleted
                          ? "w-8 h-8 rounded-full bg-primary text-white justify-center cursor-pointer"
                          : "w-8 h-8 rounded-full border-2 border-border-light justify-center cursor-default"
                    }
                  `}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  ) : isActive ? (
                    <>
                      <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-[11px] font-bold">
                        {stepNum}
                      </span>
                      <span className="text-xs font-semibold truncate">
                        {step.shortLabel}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] font-bold text-tertiary">
                      {stepNum}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
