import { api } from "@/lib/api";
import type { KycResponse, KycSubmitPayload } from "./types";

export const kycApi = {
  /** Fetch the current user's KYC record (auto-creates if none exists) */
  get: async (): Promise<KycResponse> => {
    const { data } = await api.get("/kyc");
    return data;
  },

  /** Submit / update KYC details and set status to pending */
  submit: async (payload: KycSubmitPayload): Promise<KycResponse> => {
    const { data } = await api.post("/kyc", payload);
    return data;
  },

  /** Upload a single document to the KYC record */
  uploadDocument: async (
    documentKey: string,
    file: File,
  ): Promise<KycResponse> => {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("documentKey", documentKey);
    const { data } = await api.post("/kyc/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
