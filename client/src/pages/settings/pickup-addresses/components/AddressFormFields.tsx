import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Map,
  Globe,
  FileText,
  Loader2,
  Hash,
  Briefcase,
} from "lucide-react";
import { FormInput, FormSelect } from "@/components/forms";
import { usePincodeLookup } from "@/queries/usePincode";
import { ROLE_OPTIONS } from "../config";

interface AddressFormFieldsProps {
  /** Prefix for nested field names, e.g. "rtoAddress" → "rtoAddress.city" */
  prefix?: string;
  /** Whether pincode lookup should be active */
  enablePincodeLookup?: boolean;
}

export function AddressFormFields({
  prefix = "",
  enablePincodeLookup = true,
}: AddressFormFieldsProps) {
  const p = prefix ? `${prefix}.` : "";

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const pincode = watch(`${p}pincode`);
  const { data: pincodeInfo, isFetching: pincodeLoading } =
    usePincodeLookup(enablePincodeLookup ? pincode : "");

  useEffect(() => {
    if (pincodeInfo) {
      setValue(`${p}city`, pincodeInfo.city, { shouldValidate: true });
      setValue(`${p}state`, pincodeInfo.state, { shouldValidate: true });
    }
  }, [pincodeInfo, setValue, p]);

  const getError = (name: string) => {
    const fullPath = `${p}${name}`;
    const parts = fullPath.split(".");
    let err: any = errors;
    for (const part of parts) {
      err = err?.[part];
    }
    return err?.message as string | undefined;
  };

  return (
    <div className="space-y-4">
      {/* Contact Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          label="Contact Name"
          required
          placeholder="Full name"
          icon={<User className="w-4 h-4" />}
          registration={register(`${p}contactName`)}
          error={getError("contactName")}
        />
        <FormInput
          label="Phone"
          required
          placeholder="10-digit phone"
          icon={<Phone className="w-4 h-4" />}
          maxLength={10}
          registration={register(`${p}phone`)}
          error={getError("phone")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          label="Email"
          required
          placeholder="email@example.com"
          icon={<Mail className="w-4 h-4" />}
          type="email"
          registration={register(`${p}email`)}
          error={getError("email")}
        />
        <FormSelect
          label="Role"
          required
          icon={<Briefcase className="w-4 h-4" />}
          options={ROLE_OPTIONS}
          registration={register(`${p}role`)}
          error={getError("role")}
        />
      </div>

      {/* Address */}
      <FormInput
        label="Address Line 1"
        required
        placeholder="Street address, building, floor"
        icon={<MapPin className="w-4 h-4" />}
        registration={register(`${p}addressLine1`)}
        error={getError("addressLine1")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          label="Address Line 2"
          placeholder="Apartment, suite, unit (optional)"
          icon={<MapPin className="w-4 h-4" />}
          registration={register(`${p}addressLine2`)}
          error={getError("addressLine2")}
        />
        <FormInput
          label="Landmark"
          placeholder="Nearby landmark (optional)"
          icon={<Map className="w-4 h-4" />}
          registration={register(`${p}landmark`)}
          error={getError("landmark")}
        />
      </div>

      {/* Pincode, City, State */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormInput
          label="Pincode"
          required
          placeholder="6-digit pincode"
          icon={<Hash className="w-4 h-4" />}
          maxLength={6}
          registration={register(`${p}pincode`)}
          error={getError("pincode")}
          rightElement={
            pincodeLoading ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : null
          }
        />
        <FormInput
          label="City"
          required
          placeholder="City"
          icon={<Building2 className="w-4 h-4" />}
          disabled={!!pincodeInfo}
          registration={register(`${p}city`)}
          error={getError("city")}
        />
        <FormInput
          label="State"
          required
          placeholder="State"
          icon={<Map className="w-4 h-4" />}
          disabled={!!pincodeInfo}
          registration={register(`${p}state`)}
          error={getError("state")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          label="Country"
          required
          placeholder="Country"
          icon={<Globe className="w-4 h-4" />}
          registration={register(`${p}country`)}
          error={getError("country")}
          disabled
        />
        <FormInput
          label="GST Number"
          placeholder="GSTIN (optional)"
          icon={<FileText className="w-4 h-4" />}
          registration={register(`${p}gstNumber`)}
          error={getError("gstNumber")}
        />
      </div>
    </div>
  );
}
