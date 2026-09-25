const PINCODE_API_BASE_URL =
  import.meta.env.VITE_PINCODE_API_URL || "https://api.postalpincode.in";

export interface PincodeInfo {
  city: string;
  state: string;
}

export const pincodeApi = {
  lookup: async (pincode: string): Promise<PincodeInfo> => {
    const res = await fetch(`${PINCODE_API_BASE_URL}/pincode/${pincode}`);
    const data = await res.json();

    if (!data?.[0]?.PostOffice?.length) {
      throw new Error("Invalid pincode");
    }

    const info = data[0].PostOffice[0];
    return { city: info.District, state: info.State };
  },
};
