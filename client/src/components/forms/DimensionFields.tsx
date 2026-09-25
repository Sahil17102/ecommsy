import { useFormContext, type FieldValues, type Path } from "react-hook-form";
import { Ruler } from "lucide-react";
import { FormInput } from "./FormInput";

interface DimensionFieldNames {
  length: string;
  breadth: string;
  height: string;
}

const DEFAULT_FIELD_NAMES: DimensionFieldNames = {
  length: "length",
  breadth: "breadth",
  height: "height",
};

interface DimensionFieldsProps {
  /** Custom field names if your form schema uses different keys */
  fieldNames?: Partial<DimensionFieldNames>;
  /** Unit suffix displayed in each input (default: "cm") */
  unit?: string;
  /** Class name for the wrapper grid */
  className?: string;
}

export function DimensionFields<T extends FieldValues = FieldValues>({
  fieldNames: customNames,
  unit = "cm",
  className = "grid grid-cols-3 gap-4",
}: DimensionFieldsProps) {
  const names = { ...DEFAULT_FIELD_NAMES, ...customNames };

  const {
    register,
    formState: { errors },
  } = useFormContext<T>();

  const getError = (name: string) => {
    const parts = name.split(".");
    let err: any = errors;
    for (const p of parts) {
      err = err?.[p];
    }
    return err?.message as string | undefined;
  };

  const fields = [
    { name: names.length, label: "Length" },
    { name: names.breadth, label: "Breadth" },
    { name: names.height, label: "Height" },
  ];

  return (
    <div className={className}>
      {fields.map((f) => (
        <FormInput
          key={f.name}
          label={f.label}
          required
          placeholder="0"
          type="number"
          icon={<Ruler className="w-4 h-4" />}
          suffix={unit}
          registration={register(f.name as Path<T>, { valueAsNumber: true })}
          error={getError(f.name)}
        />
      ))}
    </div>
  );
}
