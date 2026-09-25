import { useEffect } from "react";
import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import { MapPin, Building2, Map, Loader2 } from "lucide-react";
import { FormInput } from "./FormInput";
import { usePincodeLookup } from "@/queries/usePincode";

interface AddressFieldNames {
  pincode: string;
  city: string;
  state: string;
}

const DEFAULT_FIELD_NAMES: AddressFieldNames = {
  pincode: "pincode",
  city: "city",
  state: "state",
};

interface AddressFieldsProps {
  /** Custom field names if your form schema uses different keys */
  fieldNames?: Partial<AddressFieldNames>;
  /** Class name for the wrapper grid */
  className?: string;
}

export function AddressFields<T extends FieldValues = FieldValues>({
  fieldNames: customNames,
  className = "grid grid-cols-1 sm:grid-cols-3 gap-4",
}: AddressFieldsProps) {
  const names = { ...DEFAULT_FIELD_NAMES, ...customNames };

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<T>();

  const pincode = watch(names.pincode as Path<T>);
  const { data: pincodeInfo, isFetching: pincodeLoading } =
    usePincodeLookup(pincode);

  useEffect(() => {
    if (pincodeInfo) {
      setValue(names.city as Path<T>, pincodeInfo.city as any, {
        shouldValidate: true,
      });
      setValue(names.state as Path<T>, pincodeInfo.state as any, {
        shouldValidate: true,
      });
    }
  }, [pincodeInfo, setValue, names.city, names.state]);

  const getError = (name: string) => {
    const parts = name.split(".");
    let err: any = errors;
    for (const p of parts) {
      err = err?.[p];
    }
    return err?.message as string | undefined;
  };

  return (
    <div className={className}>
      <FormInput
        label="Pincode"
        required
        placeholder="6-digit pincode"
        icon={<MapPin className="w-4 h-4" />}
        maxLength={6}
        registration={register(names.pincode as Path<T>)}
        error={getError(names.pincode)}
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
        registration={register(names.city as Path<T>)}
        error={getError(names.city)}
      />
      <FormInput
        label="State"
        required
        placeholder="State"
        icon={<Map className="w-4 h-4" />}
        disabled={!!pincodeInfo}
        registration={register(names.state as Path<T>)}
        error={getError(names.state)}
      />
    </div>
  );
}
