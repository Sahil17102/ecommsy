// ── Enums / Unions ──

export const ADDRESS_ROLES = [
  "warehouse_manager",
  "warehouse_assistant",
  "warehouse_helper",
] as const;

export const ADDRESS_TYPES = ["pickup", "rto"] as const;

export type AddressRole = (typeof ADDRESS_ROLES)[number];
export type AddressType = (typeof ADDRESS_TYPES)[number];

// ── RTO sub-address ──

export interface RtoAddress {
  contactName: string;
  phone: string;
  email: string;
  role: AddressRole;
  landmark?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNumber?: string;
  latitude?: number;
  longitude?: number;
}

// ── Main pickup address ──

export interface PickupAddress {
  id: string;
  nickname: string;
  contactName: string;
  phone: string;
  email: string;
  role: AddressRole;
  landmark?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNumber?: string;
  isPrimary: boolean;
  addressType: AddressType;
  isSameAsRto: boolean;
  rtoAddress?: RtoAddress;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Form values ──

export interface PickupAddressFormValues {
  nickname: string;
  contactName: string;
  phone: string;
  email: string;
  role: AddressRole;
  landmark: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNumber: string;
  isSameAsRto: boolean;
  latitude?: number;
  longitude?: number;
  rtoAddress: RtoAddressFormValues;
}

export interface RtoAddressFormValues {
  contactName: string;
  phone: string;
  email: string;
  role: AddressRole;
  landmark: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNumber: string;
  latitude?: number;
  longitude?: number;
}

// ── Bulk import ──

/** One flat row sent to the bulk-import endpoint. */
export interface BulkAddressImportRow {
  nickname: string;
  contactName: string;
  phone: string;
  email: string;
  role?: string;
  landmark?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  gstNumber?: string;
}

export interface BulkAddressRowResult {
  rowNumber: number;
  nickname: string;
  success: boolean;
  error?: string;
}

export interface BulkImportResponse {
  message: string;
  total: number;
  successCount: number;
  failedCount: number;
  results: BulkAddressRowResult[];
}

// ── API responses ──

export interface PickupAddressListResponse {
  addresses: PickupAddress[];
}

export interface PickupAddressSingleResponse {
  message: string;
  address: PickupAddress;
}

// ── Geocode ──

export interface GeocodeResult {
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  formatted: string;
  latitude: number;
  longitude: number;
}
