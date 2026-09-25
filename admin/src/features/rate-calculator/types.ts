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
