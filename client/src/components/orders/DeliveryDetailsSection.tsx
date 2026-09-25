import { useFormContext } from "react-hook-form";
import {
  UserRound,
  Phone,
  Mail,
  MapPin,
  Landmark,
  FileText,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FormInput, FormTextarea, AddressFields } from "@/components/forms";
import { FormSectionCard } from "@/components/common";
import type { OrderFormValues } from "@/schemas/orderSchema";

export function DeliveryDetailsSection() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<OrderFormValues>();

  const orderType = watch("orderType");
  const isB2B = orderType === "B2B";

  return (
    <FormSectionCard
      icon={<MapPin className="w-4.5 h-4.5 text-accent" />}
      iconColor="bg-accent/10"
      title="Delivery Details"
      subtitle="Buyer and shipping information"
      index={1}
    >
      <div className="space-y-4">
        {/* B2B: Company Name & GSTIN */}
        <AnimatePresence>
          {isB2B && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <FormInput
                  label="Company Name"
                  required
                  placeholder="Enter company name"
                  icon={<Landmark className="w-4 h-4" />}
                  registration={register("companyName")}
                  error={errors.companyName?.message}
                />
                <FormInput
                  label="GSTIN"
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  icon={<FileText className="w-4 h-4" />}
                  maxLength={15}
                  registration={register("gstin")}
                  error={errors.gstin?.message}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Row 1: Name & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label={isB2B ? "Contact Person" : "Buyer Name"}
            required
            placeholder={isB2B ? "Contact person's name" : "Enter buyer's full name"}
            icon={<UserRound className="w-4 h-4" />}
            registration={register("buyerName")}
            error={errors.buyerName?.message}
          />
          <FormInput
            label="Phone Number"
            required
            placeholder="10-digit phone number"
            icon={<Phone className="w-4 h-4" />}
            maxLength={10}
            registration={register("buyerPhone")}
            error={errors.buyerPhone?.message}
          />
        </div>

        {/* Row 2: Email */}
        <FormInput
          label="Email"
          placeholder="buyer@email.com"
          type="email"
          icon={<Mail className="w-4 h-4" />}
          registration={register("buyerEmail")}
          error={errors.buyerEmail?.message}
        />

        {/* Row 3: Pincode, City, State */}
        <AddressFields />

        {/* Row 4: Address */}
        <FormTextarea
          label="Address"
          required
          placeholder="Enter complete delivery address"
          icon={<MapPin className="w-4 h-4" />}
          rows={2}
          registration={register("address")}
          error={errors.address?.message}
        />
      </div>
    </FormSectionCard>
  );
}
