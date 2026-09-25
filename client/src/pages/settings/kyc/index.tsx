import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, ShieldCheck, HelpCircle } from "lucide-react";
import { useKyc } from "./queries";
import { StepIndicator } from "./components/StepIndicator";
import { BusinessStructureStep } from "./components/BusinessStructureStep";
import { SelfieStep } from "./components/SelfieStep";
import { DocumentUploadStep } from "./components/DocumentUploadStep";
import { KycStatusBanner } from "./components/KycStatusBanner";
import { getRequiredDocuments } from "./config";
import { DocumentUploadCard } from "./components/DocumentUploadCard";
import { ThemedTour } from "@/components/common/ThemedTour";
import {
  getKycTourSteps,
  hasSeenKycTour,
  markKycTourSeen,
  resetKycTour,
} from "./tour";
import type { BusinessStructureFormValues } from "./schema";
import type { BusinessStructure, CompanyType, DocumentKey } from "./types";

export default function KycPage() {
  const navigate = useNavigate();
  const { data: kyc, isLoading } = useKyc();

  const [currentStep, setCurrentStep] = useState(0);
  const [businessStructure, setBusinessStructure] =
    useState<BusinessStructure | null>(null);
  const [companyType, setCompanyType] = useState<CompanyType | undefined>();
  const [showTour, setShowTour] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  // Auto-show tour for first-time users once KYC data is loaded
  const hasAutoShownTour = useRef(false);
  useEffect(() => {
    if (kyc && kyc.status === "not_submitted" && !hasSeenKycTour() && !hasAutoShownTour.current) {
      hasAutoShownTour.current = true;
      setShowTour(true);
    }
  }, [kyc]);

  const handleTourClose = useCallback(() => {
    setShowTour(false);
    markKycTourSeen();
    setCurrentStep(0);
  }, []);

  const handleTourReplay = useCallback(() => {
    resetKycTour();
    setCurrentStep(0);
    setShowTour(true);
  }, []);

  // Tour needs to navigate form steps — pass setCurrentStep
  const tourSteps = useMemo(
    () => getKycTourSteps(setCurrentStep),
    [],
  );

  // Sync from server data on load
  const effectiveStructure = businessStructure || kyc?.businessStructure;
  const effectiveCompanyType = companyType || kyc?.companyType;

  const handleBusinessStructureNext = useCallback(
    (data: BusinessStructureFormValues) => {
      setBusinessStructure(data.businessStructure);
      setCompanyType(data.companyType);
      setCurrentStep(1);
    },
    [],
  );

  const handleSelfieNext = useCallback(() => setCurrentStep(2), []);
  const handleSubmitted = useCallback(() => {
    // Stay on page, the banner will update
  }, []);

  // Determine if we should show the form or the status view
  const isCompleted =
    kyc?.status === "approved" ||
    kyc?.status === "pending";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-0">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 animate-fade-in-up">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-primary/[0.06] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div data-tour="kyc-title">
              <h1 className="text-base sm:text-lg font-bold text-foreground">
                KYC Verification
              </h1>
              <p className="text-[11px] sm:text-xs text-muted">
                Verify your identity to unlock all features
              </p>
            </div>
          </div>
        </div>

        {kyc?.status === "not_submitted" && (
          <button
            type="button"
            onClick={handleTourReplay}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-primary/[0.06] transition-all"
            title="Show KYC guide"
            data-tour="kyc-help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {kyc && !isLoading && (
        <>
          {/* Status banner */}
          <KycStatusBanner status={kyc.status} className="mb-5" />

          {/* Completed / Pending view — show document statuses */}
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background-elevated rounded-2xl border border-border-light p-5 sm:p-6"
            >
              <h3 className="text-sm font-bold text-foreground mb-3">
                Document Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {effectiveStructure &&
                  getRequiredDocuments(
                    effectiveStructure,
                    effectiveCompanyType,
                  ).map((key: DocumentKey) => (
                    <DocumentUploadCard
                      key={key}
                      documentKey={key}
                      field={kyc[key]}
                    />
                  ))}
              </div>

              {(kyc.gstin || kyc.cin) && (
                <div className="mt-4 pt-4 border-t border-border-light space-y-1">
                  {kyc.gstin && (
                    <p className="text-sm text-muted">
                      <span className="font-semibold text-foreground">
                        GSTIN:
                      </span>{" "}
                      {kyc.gstin}
                    </p>
                  )}
                  {kyc.cin && (
                    <p className="text-sm text-muted">
                      <span className="font-semibold text-foreground">
                        CIN:
                      </span>{" "}
                      {kyc.cin}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Rejected — show document statuses + re-submit */}
          {kyc.status === "rejected" && !resubmitting && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background-elevated rounded-2xl border border-border-light p-5 sm:p-6"
            >
              <h3 className="text-sm font-bold text-foreground mb-3">
                Document Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {effectiveStructure &&
                  getRequiredDocuments(
                    effectiveStructure,
                    effectiveCompanyType,
                  ).map((key: DocumentKey) => (
                    <DocumentUploadCard
                      key={key}
                      documentKey={key}
                      field={kyc[key]}
                    />
                  ))}
              </div>

              <div className="mt-5 pt-5 border-t border-border-light">
                <p className="text-xs text-muted mb-3">
                  Please re-upload the rejected documents, then re-submit.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setResubmitting(true);
                    setCurrentStep(0);
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-hover shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                >
                  Re-submit KYC
                </button>
              </div>
            </motion.div>
          )}

          {/* Form — show when not_submitted or re-submitting after rejection */}
          {(kyc.status === "not_submitted" || resubmitting) && (
            <>
              <div data-tour="kyc-steps">
                <StepIndicator currentStep={currentStep} />
              </div>

              <div data-tour="kyc-form">
                {/* Step components rendered directly — no AnimatePresence to avoid blank screen bugs */}
                {currentStep === 0 && (
                  <BusinessStructureStep
                    key="step-0"
                    kyc={kyc}
                    onNext={handleBusinessStructureNext}
                  />
                )}

                {currentStep === 1 && (
                  <SelfieStep
                    key="step-1"
                    kyc={kyc}
                    onNext={handleSelfieNext}
                    onBack={() => setCurrentStep(0)}
                  />
                )}

                {currentStep === 2 && (
                  <DocumentUploadStep
                    key="step-2"
                    kyc={kyc}
                    businessStructure={effectiveStructure || "individual"}
                    companyType={effectiveCompanyType}
                    onBack={() => setCurrentStep(1)}
                    onSubmitted={handleSubmitted}
                  />
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* KYC Tour */}
      <ThemedTour
        open={showTour}
        onClose={handleTourClose}
        steps={tourSteps}
      />
    </div>
  );
}
