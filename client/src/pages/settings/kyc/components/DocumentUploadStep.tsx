import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  Loader2,
  Send,
  ChevronLeft,
  FileStack,
} from "lucide-react";
import { toast } from "sonner";
import { FormInput } from "@/components/forms/FormInput";
import {
  documentDetailsSchema,
  type DocumentDetailsFormValues,
} from "../schema";
import { getRequiredDocuments, needsGstin, needsCin } from "../config";
import { useSubmitKyc } from "../queries";
import { DocumentUploadCard } from "./DocumentUploadCard";
import type { KycRecord, BusinessStructure, CompanyType } from "../types";

interface DocumentUploadStepProps {
  kyc: KycRecord;
  businessStructure: BusinessStructure;
  companyType?: CompanyType;
  onBack: () => void;
  onSubmitted: () => void;
}

export function DocumentUploadStep({
  kyc,
  businessStructure,
  companyType,
  onBack,
  onSubmitted,
}: DocumentUploadStepProps) {
  const submitMutation = useSubmitKyc();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DocumentDetailsFormValues>({
    resolver: zodResolver(documentDetailsSchema),
    defaultValues: {
      gstin: kyc.gstin || "",
      cin: kyc.cin || "",
    },
  });

  const requiredDocs = getRequiredDocuments(businessStructure, companyType);
  const showGstin = needsGstin(businessStructure);
  const showCin = needsCin(businessStructure, companyType);

  const allDocsUploaded = requiredDocs.every(
    (key) =>
      kyc[key]?.url && kyc[key]?.status !== "not_uploaded",
  );

  const onSubmit = async (data: DocumentDetailsFormValues) => {
    try {
      await submitMutation.mutateAsync({
        businessStructure,
        companyType: businessStructure === "company" ? companyType : undefined,
        gstin: data.gstin || undefined,
        cin: data.cin || undefined,
      });
      toast.success("KYC submitted for verification!");
      onSubmitted();
    } catch (err: any) {
      const message =
        err?.response?.data?.error || err?.message || "Submission failed";
      toast.error(message);
    }
  };

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
              <FileStack className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Upload Documents
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Upload required documents — all files must be clear and legible
              </p>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-5 sm:p-6">
          {/* Document cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requiredDocs
              .filter((key) => key !== "selfie")
              .map((key) => (
                <DocumentUploadCard
                  key={key}
                  documentKey={key}
                  field={kyc[key]}
                />
              ))}
          </div>

          {/* GSTIN / CIN inputs */}
          {(showGstin || showCin) && (
            <div className="mt-5 pt-5 border-t border-border-light">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {showGstin && (
                  <FormInput
                    label="GSTIN"
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    registration={register("gstin")}
                    error={errors.gstin?.message}
                    maxLength={15}
                  />
                )}
                {showCin && (
                  <FormInput
                    label="CIN"
                    placeholder="e.g. U12345MH2020PTC123456"
                    registration={register("cin")}
                    error={errors.cin?.message}
                    maxLength={21}
                  />
                )}
              </div>
            </div>
          )}

          {!allDocsUploaded && (
            <p className="text-xs text-muted mt-4">
              Please upload all required documents before submitting.
            </p>
          )}
        </div>

        {/* Card footer */}
        <div className="px-5 py-4 sm:px-6 sm:py-4 border-t border-border-light bg-surface-muted/50">
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-foreground border-2 border-border-light hover:border-primary/20 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={!allDocsUploaded || submitMutation.isPending}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent to-accent-hover shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit for Verification
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
