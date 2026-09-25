export type AddressRole = "warehouse_manager" | "warehouse_assistant" | "warehouse_helper";
export type AddressType = "pickup" | "rto";

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
}

export interface PickupAddress {
  id: string;
  userId: string;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PickupAddressesResponse {
  addresses: PickupAddress[];
}
