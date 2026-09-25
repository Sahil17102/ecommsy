import { useState, useRef, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Star,
  Phone,
  User,
  Plus,
  Calendar,
  Clock,
  Loader2,
  ExternalLink,
  ChevronDown,
  Check,
} from "lucide-react";
import { DatePicker, TimePicker } from "antd";
import dayjs from "dayjs";
import { FormSectionCard } from "@/components/common/FormSectionCard";
import { usePickupAddresses } from "@/pages/settings/pickup-addresses/queries";
import type { PickupAddress } from "@/pages/settings/pickup-addresses/types";

function formatAddress(address: PickupAddress): string {
  return [
    address.addressLine1,
    address.addressLine2,
    `${address.city}, ${address.state} - ${address.pincode}`,
  ]
    .filter(Boolean)
    .join(", ");
}

export function PickupLocationSection() {
  const { data: addresses = [], isLoading } = usePickupAddresses();
  const {
    watch,
    setValue,
    control,
    formState: { errors },
  } = useFormContext();

  const selectedAddressId = watch("pickupAddressId");
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside to close dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isDropdownOpen]);

  // Auto-prefill primary address
  useEffect(() => {
    if (!addresses.length || selectedAddressId) return;
    const primary = addresses.find((a) => a.isPrimary);
    if (primary) {
      setValue("pickupAddressId", primary.id, { shouldValidate: true });
    }
  }, [addresses, selectedAddressId, setValue]);

  return (
    <div className="space-y-4">
      {/* Select Pickup Address */}
      <FormSectionCard
        icon={<MapPin className="w-4.5 h-4.5 text-primary" />}
        iconColor="bg-primary/10"
        title="Select Pickup Address"
        subtitle="Choose where the courier should pick up the shipment"
        index={0}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : addresses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center py-8"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              No pickup addresses found
            </p>
            <p className="text-xs text-muted mb-4">
              Add a pickup address in settings to continue
            </p>
            <a
              href="/settings/pickup-addresses"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-hover transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Pickup Address
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        ) : (
          <div>
            {/* Custom Address Dropdown */}
            <div className="relative" ref={dropdownRef}>
              {/* Trigger */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`group relative flex items-center w-full h-12 rounded-xl border-2 transition-all duration-200 ${
                  errors.pickupAddressId
                    ? "border-red-400 bg-red-50/30"
                    : isDropdownOpen
                      ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/10"
                      : "border-border-light bg-background hover:border-primary/20"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-10 h-full shrink-0 transition-colors ${
                    isDropdownOpen ? "text-primary" : "text-muted"
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                </span>
                <span
                  className={`flex-1 text-left text-sm font-medium truncate pr-2 ${
                    selectedAddress ? "text-foreground" : "text-muted"
                  }`}
                >
                  {selectedAddress
                    ? `${selectedAddress.nickname} — ${selectedAddress.city}, ${selectedAddress.state}`
                    : "Select pickup address"}
                </span>
                {selectedAddress?.isPrimary && (
                  <span className="shrink-0 hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-semibold mr-1">
                    <Star className="w-2.5 h-2.5 fill-accent" />
                    Primary
                  </span>
                )}
                <motion.span
                  animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 mr-3 text-muted"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.span>
              </button>

              {/* Dropdown Panel */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 4, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
                    className="absolute z-50 left-0 right-0 mt-0.5 bg-background-elevated border border-border-light rounded-xl shadow-lg shadow-black/8 overflow-hidden"
                  >
                    <div className="max-h-72 overflow-y-auto py-1">
                      {addresses.map((address) => {
                        const isSelected = address.id === selectedAddressId;
                        return (
                          <button
                            key={address.id}
                            type="button"
                            onClick={() => {
                              setValue("pickupAddressId", address.id, {
                                shouldValidate: true,
                              });
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 transition-colors ${
                              isSelected
                                ? "bg-primary/[0.05]"
                                : "hover:bg-primary/[0.04]"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span
                                className={`flex items-center justify-center w-4 h-4 mt-0.5 shrink-0 ${
                                  isSelected
                                    ? "text-primary"
                                    : "text-transparent"
                                }`}
                              >
                                <Check
                                  className="w-3.5 h-3.5"
                                  strokeWidth={2.5}
                                />
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-sm truncate ${
                                      isSelected
                                        ? "font-semibold text-primary"
                                        : "font-medium text-foreground"
                                    }`}
                                  >
                                    {address.nickname}
                                  </span>
                                  {address.isPrimary && (
                                    <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-semibold">
                                      <Star className="w-2.5 h-2.5 fill-accent" />
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted leading-relaxed line-clamp-1 mt-0.5">
                                  {formatAddress(address)}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-tertiary" />
                                    {address.contactName}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-tertiary" />
                                    {address.phone}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Add New Address */}
                    <div className="border-t border-border-light">
                      <a
                        href="/settings/pickup-addresses"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-muted hover:text-primary hover:bg-primary/[0.04] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Address
                        <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Selected Address Detail Card */}
            <AnimatePresence mode="wait">
              {selectedAddress && (
                <motion.div
                  key={selectedAddress.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 p-3 sm:p-4 rounded-xl border border-border-light bg-background"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-foreground">
                      {selectedAddress.nickname}
                    </span>
                    {selectedAddress.isPrimary && (
                      <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-semibold">
                        <Star className="w-2.5 h-2.5 fill-accent" />
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted leading-relaxed mb-2">
                    {formatAddress(selectedAddress)}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-tertiary" />
                      {selectedAddress.contactName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-tertiary" />
                      {selectedAddress.phone}
                    </span>
                    {selectedAddress.email && (
                      <span className="flex items-center gap-1">
                        {selectedAddress.email}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Validation Error */}
            {errors.pickupAddressId && (
              <p className="text-xs text-red-500 mt-1.5">
                {errors.pickupAddressId.message as string}
              </p>
            )}
          </div>
        )}
      </FormSectionCard>

      {/* Pickup Preferences */}
      <FormSectionCard
        icon={<Calendar className="w-4.5 h-4.5 text-accent" />}
        iconColor="bg-accent/10"
        title="Pickup Preferences"
        subtitle="When should the courier pick up this shipment?"
        index={1}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Preferred Pickup Date */}
          <div className="min-w-0">
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Preferred Pickup Date
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <Controller
              name="preferredPickupDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) =>
                    field.onChange(date ? date.format("YYYY-MM-DD") : "")
                  }
                  disabledDate={(current) =>
                    current && current.isBefore(dayjs(), "day")
                  }
                  placeholder="Select pickup date"
                  suffixIcon={<Calendar className="w-4 h-4 text-muted" />}
                  className="!w-full !h-12 !rounded-xl !border-2 !border-border-light hover:!border-primary/20 !bg-background !text-sm !font-medium"
                  popupClassName="pickup-datepicker-popup"
                />
              )}
            />
            {errors.preferredPickupDate && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500 font-medium mt-1.5"
              >
                {errors.preferredPickupDate.message as string}
              </motion.p>
            )}
          </div>

          {/* Preferred Pickup Time */}
          <div className="min-w-0">
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Preferred Pickup Time
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <Controller
              name="preferredPickupTime"
              control={control}
              render={({ field }) => (
                <TimePicker
                  value={field.value ? dayjs(field.value, "HH:mm") : null}
                  onChange={(time) =>
                    field.onChange(time ? time.format("HH:mm") : "")
                  }
                  format="hh:mm A"
                  use12Hours
                  minuteStep={15}
                  placeholder="Select pickup time"
                  suffixIcon={<Clock className="w-4 h-4 text-muted" />}
                  className="!w-full !h-12 !rounded-xl !border-2 !border-border-light hover:!border-primary/20 !bg-background !text-sm !font-medium"
                  popupClassName="pickup-timepicker-popup"
                  needConfirm={false}
                />
              )}
            />
            {errors.preferredPickupTime && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500 font-medium mt-1.5"
              >
                {errors.preferredPickupTime.message as string}
              </motion.p>
            )}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-3">
          Pickup slots are subject to courier partner availability.
        </p>
      </FormSectionCard>
    </div>
  );
}
