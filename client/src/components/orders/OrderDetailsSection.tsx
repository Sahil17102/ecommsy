import { useFormContext, Controller } from "react-hook-form";
import {
  Hash,
  CreditCard,
  Banknote,
  RefreshCw,
} from "lucide-react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import { FormInput, FormToggle } from "@/components/forms";
import { FormSectionCard } from "@/components/common";
import { generateOrderId } from "@/utils/orderHelpers";
import type { OrderFormValues } from "@/schemas/orderSchema";

export function OrderDetailsSection() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
    control,
  } = useFormContext<OrderFormValues>();

  const orderId = watch("orderId");

  const handleRefreshId = () => {
    setValue("orderId", generateOrderId());
  };

  return (
    <FormSectionCard
      icon={<Hash className="w-4.5 h-4.5 text-primary" />}
      iconColor="bg-primary/10"
      title="Order Details"
      index={0}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormInput
          label="Order ID"
          icon={<Hash className="w-4 h-4" />}
          value={orderId}
          registration={register("orderId")}
          error={errors.orderId?.message}
          rightElement={
            <button
              type="button"
              onClick={handleRefreshId}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/[0.06] transition-colors"
              title="Generate new Order ID"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          }
        />

        <div className="min-w-0">
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Order Date
          </label>
          <Controller
            name="orderDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value ? dayjs(field.value) : null}
                format="DD MMM YYYY"
                className="w-full h-12"
                disabled
              />
            )}
          />
          {errors.orderDate?.message && (
            <p className="text-xs text-red-500 font-medium mt-1.5">
              {errors.orderDate.message}
            </p>
          )}
        </div>

        <Controller
          name="paymentType"
          control={control}
          render={({ field }) => (
            <FormToggle
              label="Payment Type"
              options={[
                {
                  value: "prepaid",
                  label: "Prepaid",
                  icon: <CreditCard className="w-3.5 h-3.5" />,
                },
                {
                  value: "cod",
                  label: "COD",
                  icon: <Banknote className="w-3.5 h-3.5" />,
                },
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </FormSectionCard>
  );
}
