import axios from "axios";
import { AppError } from "../utils/AppError.js";

export enum ShipmentMode {
  Surface = "S",
  Express = "E",
}

export interface DelhiveryRateParams {
  originPin: string;
  destinationPin: string;
  /** Charged weight in grams */
  weightGrams: number;
  mode: ShipmentMode;
}

export interface DelhiveryRateResponse {
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

export async function fetchRate(params: DelhiveryRateParams): Promise<DelhiveryRateResponse> {
  const token = process.env.DELHIVERY_TOKEN;
  const baseUrl = process.env.DELHIVERY_RATE_URL;

  if (!token || !baseUrl) {
    throw new DelhiveryApiError(500, "Delhivery API is not configured");
  }

  const { data } = await axios.get(`${baseUrl}.json`, {
    params: {
      md: params.mode,
      ss: "Delivered",
      cgm: params.weightGrams,
      o_pin: params.originPin,
      d_pin: params.destinationPin,
    },
    headers: { Authorization: `Token ${token}` },
  });

  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw) {
    throw new DelhiveryApiError(404, "No rate data returned");
  }

  const taxData = raw.tax_data ?? {};
  const taxAmount =
    (taxData.CGST ?? 0) + (taxData.SGST ?? 0) + (taxData.IGST ?? 0);

  return {
    total_amount: raw.total_amount,
    gross_amount: raw.gross_amount,
    charged_weight: raw.charged_weight,
    zone: raw.zone,
    charge_COD: raw.charge_COD,
    charge_FS: raw.charge_FS,
    charge_DL: raw.charge_DL,
    charge_RTO: raw.charge_RTO,
    tax_amount: taxAmount,
  };
}

export class DelhiveryApiError extends AppError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = "DelhiveryApiError";
  }
}
