import { api } from "@/lib/api";
import type { AdminKycResponse } from "./types";

/** Fetch a KYC document as a blob URL (goes through axios with auth token) */
export async function fetchDocumentBlob(
  userId: string,
  key: string,
  filename: string,
): Promise<string> {
  const { data } = await api.get(`/document/${userId}/${key}/${filename}`, {
    responseType: "blob",
  });
  return URL.createObjectURL(data);
}

export const adminKycApi = {
  getByUserId: async (userId: string): Promise<AdminKycResponse> => {
    const { data } = await api.get(`/users/${userId}/kyc`);
    return data as AdminKycResponse;
  },

  approve: async (id: string): Promise<AdminKycResponse> => {
    const { data } = await api.post(`/kyc/${id}/approve`);
    return data as AdminKycResponse;
  },

  reject: async (id: string, rejectionReason: string): Promise<AdminKycResponse> => {
    const { data } = await api.post(`/kyc/${id}/reject`, { rejectionReason });
    return data as AdminKycResponse;
  },

  approveDocument: async (id: string, key: string): Promise<AdminKycResponse> => {
    const { data } = await api.post(`/kyc/${id}/document/${key}/approve`);
    return data as AdminKycResponse;
  },

  rejectDocument: async (
    id: string,
    key: string,
    rejectionReason: string,
  ): Promise<AdminKycResponse> => {
    const { data } = await api.post(`/kyc/${id}/document/${key}/reject`, {
      rejectionReason,
    });
    return data as AdminKycResponse;
  },

  /** Build a URL to serve a KYC document via the admin proxy */
  getDocumentUrl: (userId: string, key: string, filename: string): string =>
    `/api/admin/document/${userId}/${key}/${filename}`,
};
