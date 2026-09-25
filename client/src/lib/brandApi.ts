function getLogoUrl(domain: string, size: number): string {
  const token = import.meta.env.VITE_LOGO_DEV_TOKEN ?? "";
  const baseUrl = import.meta.env.VITE_LOGO_DEV_BASE_URL ?? "https://img.logo.dev";
  return `${baseUrl}/${domain}?token=${token}&size=${size}&format=png`;
}

export const brandApi = {
  fetchLogo: async (domain: string, size: number): Promise<string> => {
    const url = getLogoUrl(domain, size);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Logo fetch failed: ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
