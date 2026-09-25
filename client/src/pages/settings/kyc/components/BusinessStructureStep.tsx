import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Briefcase,
  User,
  Users,
  Landmark,
  ChevronRight,
  Building,
  UserCheck,
  Scale,
  Heart,
} from "lucide-react";
import {
  businessStructureSchema,
  type BusinessStructureFormValues,
  getBusinessStructureDefaults,
} from "../schema";
import type { KycRecord, BusinessStructure, CompanyType } from "../types";

interface BusinessStructureStepProps {
  kyc: KycRecord;
  onNext: (data: BusinessStructureFormValues) => void;
}

const COMPANY_TYPE_CARDS: {
  value: CompanyType;
  label: string;
  icon: typeof User;
}[] = [
  { value: "private_limited", label: "Private Limited", icon: Building },
  { value: "public_limited", label: "Public Limited", icon: Landmark },
  { value: "one_person_company", label: "One Person Company (OPC)", icon: UserCheck },
  { value: "llp", label: "LLP", icon: Scale },
  { value: "section_8_company", label: "Section 8 Company", icon: Heart },
];

const STRUCTURE_CARDS: {
  value: BusinessStructure;
  label: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    value: "individual",
    label: "Individual",
    description: "Freelancer or self-employed without a registered business",
    icon: User,
  },
  {
    value: "sole_proprietor",
    label: "Sole Proprietor",
    description: "Single-owner business with a trade name or GST",
    icon: Briefcase,
  },
  {
    value: "partnership_firm",
    label: "Partnership Firm",
    description: "Two or more partners operating under a deed",
    icon: Users,
  },
  {
    value: "company",
    label: "Company",
    description: "Pvt Ltd, LLP, OPC, Public Ltd, or Section 8",
    icon: Building2,
  },
];

export function BusinessStructureStep({
  kyc,
  onNext,
}: BusinessStructureStepProps) {
  const {
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessStructureFormValues>({
    resolver: zodResolver(businessStructureSchema),
    defaultValues: kyc.businessStructure
      ? {
          businessStructure: kyc.businessStructure,
          companyType: kyc.companyType,
        }
      : getBusinessStructureDefaults(),
  });

  const businessStructure = watch("businessStructure");
  const [companyTypeAnimating, setCompanyTypeAnimating] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Card wrapper */}
      <div className="bg-background-elevated rounded-2xl border border-border-light">
        {/* Card header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Business Structure
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Select the type of business entity you operate as
              </p>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-5 sm:p-6">
          {/* Structure selection cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STRUCTURE_CARDS.map(({ value, label, description, icon: Icon }) => {
              const isSelected = businessStructure === value;
              return (
                <motion.button
                  key={value}
                  type="button"
                  onClick={() => {
                    setValue("businessStructure", value, {
                      shouldValidate: true,
                    });
                    if (value !== "company") {
                      setValue("companyType", undefined);
                    }
                  }}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/[0.04] shadow-sm shadow-primary/10"
                      : "border-border-light hover:border-primary/30 hover:bg-primary/[0.02]"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary/15 text-primary"
                          : "bg-surface-muted text-muted"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-bold transition-colors ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {label}
                      </p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <motion.div
                      layoutId="structure-selected"
                      className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    >
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {errors.businessStructure && (
            <p className="text-xs text-error mt-2">
              {errors.businessStructure.message}
            </p>
          )}

          {/* Company type selector */}
          <AnimatePresence>
            {businessStructure === "company" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                onAnimationStart={() => setCompanyTypeAnimating(true)}
                onAnimationComplete={() => setCompanyTypeAnimating(false)}
                style={{ overflow: companyTypeAnimating ? "hidden" : "visible" }}
              >
                <div className="mt-5 pt-5 border-t border-border-light">
                  <label className="block text-xs font-semibold text-foreground mb-3">
                    Company Type <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {COMPANY_TYPE_CARDS.map(({ value, label, icon: Icon }) => {
                      const isSelected = watch("companyType") === value;
                      return (
                        <motion.button
                          key={value}
                          type="button"
                          onClick={() =>
                            setValue("companyType", value, { shouldValidate: true })
                          }
                          className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/[0.04] shadow-sm shadow-primary/10"
                              : "border-border-light hover:border-primary/30 hover:bg-primary/[0.02]"
                          }`}
                          whileTap={{ scale: 0.97 }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-primary/15 text-primary"
                                  : "bg-surface-muted text-muted"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <p
                              className={`text-xs font-bold transition-colors leading-tight ${
                                isSelected ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {label}
                            </p>
                          </div>
                          {isSelected && (
                            <motion.div
                              layoutId="company-type-selected"
                              className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                              initial={false}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  {errors.companyType && (
                    <p className="text-xs text-error mt-2">{errors.companyType.message}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card footer */}
        <div className="px-5 py-4 sm:px-6 sm:py-4 border-t border-border-light bg-surface-muted/50">
          <button
            type="button"
            onClick={handleSubmit(onNext)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-hover shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
