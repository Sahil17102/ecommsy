import { useState, useEffect, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Loader2,
  Tag,
  Package,
} from "lucide-react";
import { FormInput } from "@/components/forms";
import type { GeocodeResult } from "@/lib/geoapifyApi";
import { animationConfig } from "@/config/animations";
import { pickupAddressSchema } from "../schema";
import { DEFAULT_FORM_VALUES } from "../config";
import type {
  PickupAddress,
  PickupAddressFormValues,
  RtoAddress,
} from "../types";
import { LocationDetector } from "./LocationDetector";
import { AddressFormFields } from "./AddressFormFields";
import { RtoAddressSection } from "./RtoAddressSection";

interface AddressFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PickupAddressFormValues) => Promise<void>;
  editingAddress?: PickupAddress | null;
  isSubmitting?: boolean;
}

export function AddressFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  editingAddress,
  isSubmitting = false,
}: AddressFormDrawerProps) {
  const [showForm, setShowForm] = useState(false);
  const isEditing = !!editingAddress;

  const methods = useForm<PickupAddressFormValues>({
    resolver: zodResolver(pickupAddressSchema) as any,
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "onBlur",
  });

  const { handleSubmit, reset, watch, setValue } = methods;
  const isSameAsRto = watch("isSameAsRto");

  // Reset form when drawer opens/closes or editing address changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingAddress) {
      const toFormFields = (addr: PickupAddress | RtoAddress) => ({
        contactName: addr.contactName,
        phone: addr.phone,
        email: addr.email,
        role: addr.role,
        landmark: addr.landmark ?? "",
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2 ?? "",
        city: addr.city,
        state: addr.state,
        country: addr.country,
        pincode: addr.pincode,
        gstNumber: addr.gstNumber ?? "",
        latitude: addr.latitude,
        longitude: addr.longitude,
      });

      reset({
        nickname: editingAddress.nickname,
        isSameAsRto: editingAddress.isSameAsRto,
        ...toFormFields(editingAddress),
        rtoAddress: editingAddress.rtoAddress
          ? toFormFields(editingAddress.rtoAddress)
          : DEFAULT_FORM_VALUES.rtoAddress,
      });
      setShowForm(true);
    } else {
      reset(DEFAULT_FORM_VALUES);
      setShowForm(false);
    }
  }, [isOpen, editingAddress, reset]);

  const handleLocationDetected = useCallback(
    (result: GeocodeResult) => {
      setValue("addressLine1", result.addressLine1, { shouldValidate: true });
      setValue("city", result.city, { shouldValidate: true });
      setValue("state", result.state, { shouldValidate: true });
      setValue("country", "India", { shouldValidate: true });
      setValue("pincode", result.pincode, { shouldValidate: true });
      setValue("latitude", result.latitude);
      setValue("longitude", result.longitude);
      setShowForm(true);
    },
    [setValue],
  );

  const handleManualEntry = useCallback(() => {
    setShowForm(true);
  }, []);

  const onFormSubmit = handleSubmit(async (data: PickupAddressFormValues) => {
    // When RTO is same as pickup, send an explicit null rather than omitting the
    // key — an update only writes the keys it receives, so omitting it would
    // leave a previously-saved RTO address behind on the record.
    const { rtoAddress, ...rest } = data;
    const payload = rest.isSameAsRto
      ? { ...rest, rtoAddress: null }
      : { ...rest, rtoAddress };
    await onSubmit(payload as unknown as PickupAddressFormValues);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              duration: 0.35,
              ease: animationConfig.ease.out,
            }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-background z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    {isEditing ? "Edit Address" : "Add New Address"}
                  </h2>
                  <p className="text-[11px] text-muted">
                    {isEditing
                      ? "Update your pickup address details"
                      : "Set up a new pickup address"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-primary/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <FormProvider {...methods}>
                <form id="address-form" onSubmit={onFormSubmit}>
                  {/* Location Detection — only for new addresses */}
                  {!isEditing && !showForm && (
                    <div className="bg-background-elevated rounded-2xl border border-border-light p-6 mb-5">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground">
                            Detect Your Location
                          </h3>
                          <p className="text-[11px] text-muted">
                            Quickly prefill your address details
                          </p>
                        </div>
                      </div>
                      <LocationDetector
                        onLocationDetected={handleLocationDetected}
                        onManualEntry={handleManualEntry}
                      />
                    </div>
                  )}

                  {/* Address Form */}
                  <AnimatePresence>
                    {(showForm || isEditing) && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-5"
                      >
                        {/* Nickname */}
                        <div className="bg-background-elevated rounded-2xl border border-border-light p-5">
                          <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Tag className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground">
                                Address Nickname
                              </h3>
                              <p className="text-[11px] text-muted">
                                A short name to identify this address (e.g. "Main Warehouse")
                              </p>
                            </div>
                          </div>
                          <FormInput
                            label="Nickname"
                            required
                            placeholder="e.g. Main Warehouse, Mumbai Office"
                            icon={<Tag className="w-4 h-4" />}
                            registration={methods.register("nickname")}
                            error={methods.formState.errors.nickname?.message}
                          />
                        </div>

                        {/* Contact & Address Details */}
                        <div className="bg-background-elevated rounded-2xl border border-border-light p-5">
                          <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground">
                                Address Details
                              </h3>
                              <p className="text-[11px] text-muted">
                                Contact person and full address for this location
                              </p>
                            </div>
                          </div>
                          <AddressFormFields />
                        </div>

                        {/* RTO Configuration */}
                        <div className="bg-background-elevated rounded-2xl border border-border-light p-5">
                          <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                              <Package className="w-4 h-4 text-accent" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground">
                                Return (RTO) Address
                              </h3>
                              <p className="text-[11px] text-muted">
                                Where should returned shipments be delivered?
                              </p>
                            </div>
                          </div>

                          {/* Same as RTO checkbox */}
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={isSameAsRto}
                                onChange={(e) =>
                                  setValue("isSameAsRto", e.target.checked)
                                }
                                className="sr-only peer"
                              />
                              <div className="w-5 h-5 rounded-md border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                                <AnimatePresence>
                                  {isSameAsRto && (
                                    <motion.svg
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      exit={{ scale: 0 }}
                                      transition={{ duration: 0.15 }}
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
                                    </motion.svg>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                RTO address is same as pickup
                              </span>
                              <p className="text-[11px] text-muted">
                                Uncheck if returns should go to a different address
                              </p>
                            </div>
                          </label>

                          {/* RTO Address Form (conditional) */}
                          <RtoAddressSection isVisible={!isSameAsRto} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </FormProvider>
            </div>

            {/* Footer */}
            {(showForm || isEditing) && (
              <div className="px-6 py-4 border-t border-border-light shrink-0 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-muted border border-border-light hover:border-primary/20 hover:text-primary hover:bg-primary/[0.04] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="address-form"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {isEditing ? "Update Address" : "Save Address"}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
