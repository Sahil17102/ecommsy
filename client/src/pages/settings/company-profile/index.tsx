import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useCompanyProfile, useUpdateProfile } from "./queries";
import { companyProfileSchema, getDefaultValues, type CompanyProfileFormValues } from "./schema";
import { usePincodeLookup } from "@/queries/usePincode";
import { regex } from "@/lib/constants";

export default function CompanyProfilePage() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useCompanyProfile();
  const updateMutation = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when profile loads
  useEffect(() => {
    if (profile) {
      reset(getDefaultValues(profile));
    }
  }, [profile, reset]);

  // Pincode auto-fill
  const pincodeValue = watch("pincode");
  const { data: pincodeInfo } = usePincodeLookup(pincodeValue);

  useEffect(() => {
    if (pincodeInfo) {
      setValue("city", pincodeInfo.city, { shouldDirty: true });
      setValue("state", pincodeInfo.state, { shouldDirty: true });
    }
  }, [pincodeInfo, setValue]);

  const onSubmit = async (values: CompanyProfileFormValues) => {
    try {
      await updateMutation.mutateAsync(values);
      toast.success("Company profile updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    }
  };

  const inputClass = (disabled?: boolean) =>
    `w-full h-11 px-4 text-sm font-medium text-foreground bg-background rounded-xl border-2 border-border-light outline-none transition-all placeholder:text-tertiary ${
      disabled
        ? "opacity-60 cursor-not-allowed bg-background-elevated"
        : "hover:border-primary/20 focus:border-primary focus:bg-primary/[0.03] focus:shadow-md focus:shadow-primary/10"
    }`;

  const labelClass = "block text-xs font-semibold text-foreground mb-1.5";
  const helperClass = "text-[11px] text-muted mt-1";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6 animate-fade-in-up">
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-primary hover:bg-primary/[0.06] transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground">
              Company Profile
            </h1>
            <p className="text-[11px] sm:text-xs text-muted">
              Manage your business information
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {profile && !isLoading && (
        <motion.form
          onSubmit={handleSubmit(onSubmit)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background-elevated rounded-2xl border border-border-light p-5 sm:p-6 space-y-5"
        >
          {/* Read-only fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Brand name</label>
              <input
                type="text"
                value={`${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()}
                disabled
                className={inputClass(true)}
              />
            </div>
            <div>
              <label className={labelClass}>Business name</label>
              <input
                type="text"
                value={profile.businessName ?? ""}
                disabled
                className={inputClass(true)}
              />
              <p className={helperClass}>Contact support to change</p>
            </div>
          </div>

          <div>
            <label className={labelClass}>Assigned plan</label>
            <input
              type="text"
              value={(profile.plan ?? "basic").toUpperCase()}
              disabled
              className={`${inputClass(true)} max-w-xs`}
            />
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Website</label>
              <input
                type="text"
                placeholder="https://yourbrand.com"
                {...register("website")}
                className={inputClass()}
              />
              {errors.website && (
                <p className="text-xs text-red-500 mt-1">{errors.website.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Contact number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="9876543210"
                maxLength={10}
                {...register("contactNumber")}
                className={inputClass()}
              />
              {errors.contactNumber && (
                <p className="text-xs text-red-500 mt-1">{errors.contactNumber.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Support email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="support@yourbrand.com"
              {...register("supportEmail")}
              className={inputClass()}
            />
            {errors.supportEmail && (
              <p className="text-xs text-red-500 mt-1">{errors.supportEmail.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Full business address"
              rows={3}
              {...register("address")}
              className={`${inputClass()} h-auto py-3 resize-none`}
            />
            {errors.address && (
              <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="110001"
                maxLength={6}
                {...register("pincode")}
                className={inputClass()}
              />
              {errors.pincode && (
                <p className="text-xs text-red-500 mt-1">{errors.pincode.message}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                placeholder="City"
                {...register("city")}
                disabled={regex.pincode.test(pincodeValue) && !!pincodeInfo}
                className={inputClass(regex.pincode.test(pincodeValue) && !!pincodeInfo)}
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                type="text"
                placeholder="State"
                {...register("state")}
                disabled={regex.pincode.test(pincodeValue) && !!pincodeInfo}
                className={inputClass(regex.pincode.test(pincodeValue) && !!pincodeInfo)}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-hover shadow-md shadow-primary/20 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </motion.form>
      )}
    </div>
  );
}
