import type { AddressRole, RtoAddressFormValues } from "./types";

// ── Role Options ──

export const ROLE_OPTIONS: { value: AddressRole; label: string }[] = [
  { value: "warehouse_manager", label: "Warehouse Manager" },
  { value: "warehouse_assistant", label: "Warehouse Assistant" },
  { value: "warehouse_helper", label: "Warehouse Helper" },
];

// ── Query Keys ──

export const PICKUP_ADDRESS_QUERY_KEY = ["pickupAddresses"] as const;

// ── Form Defaults ──

export const DEFAULT_RTO_VALUES: RtoAddressFormValues = {
  contactName: "",
  phone: "",
  email: "",
  role: "warehouse_manager",
  landmark: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  gstNumber: "",
};

export const DEFAULT_FORM_VALUES = {
  nickname: "",
  contactName: "",
  phone: "",
  email: "",
  role: "warehouse_manager" as AddressRole,
  landmark: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  gstNumber: "",
  isSameAsRto: true,
  rtoAddress: { ...DEFAULT_RTO_VALUES },
};

// ── Pickup Time Slots ──

export const PICKUP_TIME_SLOTS: { value: string; label: string }[] = [
  { value: "09:00-12:00", label: "9:00 AM – 12:00 PM" },
  { value: "12:00-15:00", label: "12:00 PM – 3:00 PM" },
  { value: "15:00-18:00", label: "3:00 PM – 6:00 PM" },
  { value: "18:00-21:00", label: "6:00 PM – 9:00 PM" },
];
