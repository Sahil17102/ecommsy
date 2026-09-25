// Inlined from the old models/Location.ts — Drizzle's locations.tags is jsonb<string[]>.
export const VALID_TAGS = [
  "north",
  "south",
  "east",
  "west",
  "metro",
  "special_zone",
] as const;

export type LocationTag = (typeof VALID_TAGS)[number];

type LocationInfo = {
  city: string;
  state: string;
  tags: LocationTag[];
};

export const determineB2CZone = (origin: LocationInfo, destination: LocationInfo): string => {
  const hasTag = (loc: LocationInfo, tag: LocationTag) =>
    loc.tags?.map((t) => t.toLowerCase()).includes(tag.toLowerCase());

  // 1. Special Zone (highest priority)
  if (hasTag(origin, "special_zone") || hasTag(destination, "special_zone")) {
    return "SPECIAL_ZONE";
  }

  // 2. Within City
  if (origin.city?.toLowerCase() === destination.city?.toLowerCase()) {
    return "WITHIN_CITY";
  }

  // 3. Within State
  if (origin.state?.toLowerCase() === destination.state?.toLowerCase()) {
    return "WITHIN_STATE";
  }

  // 4. Within Region
  const regions: LocationTag[] = ["north", "south", "east", "west"];
  for (const r of regions) {
    if (hasTag(origin, r) && hasTag(destination, r)) {
      return "WITHIN_REGION";
    }
  }

  // 5. Metro to Metro
  if (hasTag(origin, "metro") && hasTag(destination, "metro")) {
    return "METRO_TO_METRO";
  }

  // 6. ROI (fallback)
  return "ROI";
};
