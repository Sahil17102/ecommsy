import { api } from "./api";

export interface DelhiveryRate {
  total_amount: number;
  gross_amount: number;
  charged_weight: number;
  zone: string;
  charge_COD: number;
  charge_FS: number;
  charge_DL: number;
  charge_RTO: number;
  tax_amount: number;
}

interface DelhiveryRateParams {
  originPin: string;
  destinationPin: string;
  chargeableGrams: number;
  mode: string;
}

export interface CourierRate {
  forward: number;
  rto: number;
  codCharges: number;
  otherCharges: number;
  freightCharge: number;
  totalCharge: number;
}

export interface AvailableCourier {
  courierId: string;
  name: string;
  serviceProvider: string;
  serviceProviderDisplayName: string;
  logo: string | null;
  mode: "air" | "surface";
  zone: { code: string; name: string };
  chargeableWeight: number;
  minWeight: number;
  rate: CourierRate;
  tag?: "economy" | "fastest";
  /** Present only for B2B couriers — carries the line-by-line freight breakdown. */
  _b2bRate?: B2bCourierRate;
}

export interface AvailableCouriersParams {
  origin: string;
  destination: string;
  weight: number;
  length?: number;
  breadth?: number;
  height?: number;
  paymentType: "prepaid" | "cod";
  orderAmount?: number;
  orderType?: "B2B" | "B2C";
}

// ── B2B Rate Types ──

export interface B2bRateOverhead {
  code: string;
  name: string;
  type: string;
  amount: number;
}

export interface B2bCourierRate {
  baseFreight: number;
  overheads: B2bRateOverhead[];
  rtoRate: number;
  total: number;
  billableWeight: number;
  packages: Array<{
    deadWeight: number;
    volumetricWeight: number;
    billableWeight: number;
  }>;
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
  rate: B2bCourierRate;
  tag?: "economy" | "fastest";
}

export interface B2bAvailableCouriersParams {
  origin: string;
  destination: string;
  packages: Array<{
    weight: number;
    length: number;
    breadth: number;
    height: number;
  }>;
  paymentType: "prepaid" | "cod";
  orderAmount: number;
  declaredValue?: number;
  isInsurance?: boolean;
  isTimeSpecificDelivery?: boolean;
  isHolidayPickup?: boolean;
}

export interface SlabRateItem {
  forward: number;
  rto: number;
  codCharges: number;
  codPercent: number;
}

export interface ZoneRateItem {
  zone: { id: string; name: string; code: string };
  slabRates: SlabRateItem[];
}

export interface WeightSlabItem {
  minWeight: number;
  maxWeight: number | null;
}

export interface RateCardPricing {
  id: string;
  courier: { id: string; name: string; serviceProvider: string; logo?: string | null };
  plan: string;
  mode: "air" | "surface";
  otherCharges: number;
  weightSlabs: WeightSlabItem[];
  zoneRates: ZoneRateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RateCardResponse {
  plan: string;
  pricing: RateCardPricing[];
}

export const ratesApi = {
  getDelhiveryRate: async (params: DelhiveryRateParams): Promise<DelhiveryRate> => {
    const { data } = await api.get<DelhiveryRate>("/rates/delhivery", {
      params: {
        o_pin: params.originPin,
        d_pin: params.destinationPin,
        cgm: params.chargeableGrams,
        md: params.mode,
      },
    });
    return data;
  },

  getAvailableCouriers: async (
    params: AvailableCouriersParams,
  ): Promise<AvailableCourier[]> => {
    const { data } = await api.post<{ success: boolean; data: AvailableCourier[] }>(
      "/rates/available",
      params,
    );
    return data.data;
  },

  getRateCard: async (): Promise<RateCardResponse> => {
    const { data } = await api.get<RateCardResponse>("/rates/rate-card");
    return data;
  },

  getB2bAvailableCouriers: async (
    params: B2bAvailableCouriersParams,
  ): Promise<B2bAvailableCourier[]> => {
    const { data } = await api.post<{ success: boolean; data: B2bAvailableCourier[] }>(
      "/rates/b2b/available",
      params,
    );
    return data.data;
  },
};
