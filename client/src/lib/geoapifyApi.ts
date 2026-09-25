// ── External geocoding config (from env) ──

const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY ?? "";
const GEOAPIFY_AUTOCOMPLETE_URL =
  import.meta.env.VITE_GEOAPIFY_AUTOCOMPLETE_URL ??
  "https://api.geoapify.com/v1/geocode/autocomplete";
const GEOAPIFY_REVERSE_URL =
  import.meta.env.VITE_GEOAPIFY_REVERSE_URL ??
  "https://api.geoapify.com/v1/geocode/reverse";
const NOMINATIM_SEARCH_URL =
  import.meta.env.VITE_NOMINATIM_SEARCH_URL ??
  "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL =
  import.meta.env.VITE_NOMINATIM_REVERSE_URL ??
  "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_EMAIL =
  import.meta.env.VITE_NOMINATIM_EMAIL ?? "support@boxandbeyond.in";

// ── Types ──

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

export interface AutocompleteResult {
  formatted: string;
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

// ── Helpers ──

function parseNominatimAddress(data: any): GeocodeResult {
  const addr = data.address ?? {};

  // Build addressLine1 from the most specific fields Nominatim returns
  const addressLine1 = [
    addr.amenity || addr.building,
    addr.house_number,
    addr.road,
    addr.neighbourhood || addr.suburb || addr.hamlet,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    addressLine1,
    city:
      addr.city ||
      addr.town ||
      addr.village ||
      addr.county ||
      addr.state_district ||
      "",
    state: addr.state || "",
    country: addr.country || "India",
    pincode: addr.postcode || "",
    formatted: data.display_name || "",
    latitude: parseFloat(data.lat),
    longitude: parseFloat(data.lon),
  };
}

function parseGeoapifyResult(result: any): GeocodeResult {
  return {
    addressLine1: [result.address_line1, result.address_line2]
      .filter(Boolean)
      .join(", "),
    city: result.city || result.county || "",
    state: result.state || "",
    country: result.country || "India",
    pincode: result.postcode || "",
    formatted: result.formatted || "",
    latitude: result.lat,
    longitude: result.lon,
  };
}

// ── Public API ──

export const geocodeApi = {
  /**
   * Reverse geocode using Nominatim (primary, free, no key needed).
   * Falls back to Geoapify if Nominatim fails.
   */
  reverseGeocode: async (lat: number, lng: number): Promise<GeocodeResult> => {
    // Try Nominatim first (free, no API key)
    try {
      const url = new URL(NOMINATIM_REVERSE_URL);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("email", NOMINATIM_EMAIL);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Nominatim ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return parseNominatimAddress(data);
    } catch {
      // Fallback to Geoapify
    }

    // Geoapify fallback (requires API key)
    if (!GEOAPIFY_API_KEY) {
      throw new Error("Geocoding failed — no API key configured");
    }

    const url = new URL(GEOAPIFY_REVERSE_URL);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("apiKey", GEOAPIFY_API_KEY);
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Geoapify ${res.status}`);
    const data = await res.json();

    if (!data.results?.length) {
      throw new Error("No address found for the given coordinates");
    }

    return parseGeoapifyResult(data.results[0]);
  },

  /**
   * Search / autocomplete addresses using Nominatim (primary).
   * Falls back to Geoapify autocomplete.
   */
  searchAddress: async (query: string): Promise<AutocompleteResult[]> => {
    // Try Nominatim first
    try {
      const url = new URL(NOMINATIM_SEARCH_URL);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("countrycodes", "in");
      url.searchParams.set("limit", "5");
      url.searchParams.set("email", NOMINATIM_EMAIL);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Nominatim ${res.status}`);
      const data = await res.json();

      return data.map((item: any) => {
        const parsed = parseNominatimAddress(item);
        return { ...parsed };
      });
    } catch {
      console.error("Nominatim search failed, falling back to Geoapify");
    }

    // Geoapify fallback
    if (!GEOAPIFY_API_KEY) return [];

    const url = new URL(GEOAPIFY_AUTOCOMPLETE_URL);
    url.searchParams.set("text", query);
    url.searchParams.set("apiKey", GEOAPIFY_API_KEY);
    url.searchParams.set("filter", "countrycode:in");
    url.searchParams.set("limit", "5");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results ?? []).map((r: any) => parseGeoapifyResult(r));
  },
};
