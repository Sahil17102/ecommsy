// ── B2B Zone ──

export interface B2bZone {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── B2B Pincode ──

export interface B2bPincodeFlags {
  isOda: boolean;
  isRemote: boolean;
  isMall: boolean;
  isSez: boolean;
  isCsd: boolean;
  isAirport: boolean;
  isHighSecurity: boolean;
}

export interface B2bPincode {
  id: string;
  pincode: string;
  city: string;
  state: string;
  zone: { id: string; code: string; name: string };
  courier: { id: string; name: string; serviceProvider: string };
  serviceProvider: string;
  flags: B2bPincodeFlags;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateB2bPincodePayload {
  pincode: string;
  city: string;
  state: string;
  zone: string;
  courier: string;
  serviceProvider: string;
  flags?: Partial<B2bPincodeFlags>;
}

// ── B2B Zone Rate ──

export interface B2bZoneRate {
  id: string;
  plan: string;
  originZone: { id: string; code: string; name: string };
  destinationZone: { id: string; code: string; name: string };
  courier: { id: string; name: string; serviceProvider: string };
  serviceProvider: string;
  ratePerKg: number;
  rtoRatePerKg: number;
  volumetricDivisor: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertB2bZoneRatePayload {
  plan: string;
  courier: string;
  originZone: string;
  destinationZone: string;
  serviceProvider: string;
  ratePerKg: number;
  rtoRatePerKg?: number;
  volumetricDivisor?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

// ── B2B Additional Charges ──

export interface HandlingTier {
  minWeight: number;
  maxWeight: number;
  charge: number;
}

export interface B2bAdditionalCharge {
  id: string;
  plan: string;
  courier: { id: string; name: string; serviceProvider: string };
  serviceProvider: string;
  awbCharges: number;
  minimumChargeableWeight: number;
  minimumChargeableAmount: number;
  codChargesFlat: number;
  codPercent: number;
  codMinimum: number;
  fuelSurchargePercent: number;
  greenTax: number;
  odaChargesFlat: number;
  odaChargesPerKg: number;
  csdCharges: number;
  mallDeliveryCharges: number;
  handlingCharges: HandlingTier[];
  rovPercent: number;
  rovMinimum: number;
  demurrageFreeHours: number;
  demurragePerHour: number;
  demurrageMaxDays: number;
  timeSpecificDeliveryCharge: number;
  holidayPickupCharge: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertB2bAdditionalChargePayload {
  plan: string;
  courier: string;
  serviceProvider: string;
  awbCharges?: number;
  minimumChargeableWeight?: number;
  minimumChargeableAmount?: number;
  codChargesFlat?: number;
  codPercent?: number;
  codMinimum?: number;
  fuelSurchargePercent?: number;
  greenTax?: number;
  odaChargesFlat?: number;
  odaChargesPerKg?: number;
  csdCharges?: number;
  mallDeliveryCharges?: number;
  handlingCharges?: HandlingTier[];
  rovPercent?: number;
  rovMinimum?: number;
  demurrageFreeHours?: number;
  demurragePerHour?: number;
  demurrageMaxDays?: number;
  timeSpecificDeliveryCharge?: number;
  holidayPickupCharge?: number;
}

// ── Rate Calculator ──

export interface B2bRatePackage {
  weight: number;
  length: number;
  breadth: number;
  height: number;
}

export interface B2bRateOverhead {
  code: string;
  name: string;
  type: string;
  amount: number;
}

export interface B2bAvailableCourier {
  courierId: string;
  name: string;
  serviceProvider: string;
  serviceProviderDisplayName: string;
  logo: string | null;
  zone: {
    originCode: string;
    originName: string;
    destinationCode: string;
    destinationName: string;
  };
  billableWeight: number;
  packages: Array<{
    deadWeight: number;
    volumetricWeight: number;
    billableWeight: number;
  }>;
  rate: {
    baseFreight: number;
    overheads: B2bRateOverhead[];
    rtoRate: number;
    total: number;
    billableWeight: number;
  };
  tag?: "economy" | "fastest";
}

export interface CalculateB2bRatePayload {
  origin: string;
  destination: string;
  packages: B2bRatePackage[];
  paymentType: "prepaid" | "cod";
  orderAmount: number;
  plan?: string;
  declaredValue?: number;
  isInsurance?: boolean;
  isTimeSpecificDelivery?: boolean;
  isHolidayPickup?: boolean;
}

// ── Pagination ──

export interface B2bPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
