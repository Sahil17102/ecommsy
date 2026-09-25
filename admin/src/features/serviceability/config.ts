import type { LocationTag } from "./types";

export interface TagConfig {
  label: string;
  color: string;
}

export const TAG_CONFIG: Record<LocationTag, TagConfig> = {
  north: { label: "North", color: "blue" },
  south: { label: "South", color: "green" },
  east: { label: "East", color: "purple" },
  west: { label: "West", color: "purple" },
  metro: { label: "Metro", color: "magenta" },
  special_zone: { label: "Special Zone", color: "red" },
};

export const TAG_OPTIONS = Object.entries(TAG_CONFIG).map(
  ([value, config]) => ({
    label: config.label,
    value: value as LocationTag,
  }),
);

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const STATE_OPTIONS = INDIAN_STATES.map((s) => ({
  label: s,
  value: s,
}));
