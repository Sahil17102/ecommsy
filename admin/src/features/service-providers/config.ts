import type { CredentialBlock, CredentialFieldDef } from "./types";

export function resolveLogoUrl(logoUrl?: string): string {
  if (!logoUrl) return "";
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://") || logoUrl.startsWith("/api/")) {
    return logoUrl;
  }
  return `/api${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
}

export const COMMON_FIELD_PRESETS: CredentialFieldDef[] = [
  { key: "username", label: "Username", type: "text", required: false },
  { key: "password", label: "Password", type: "password", required: false },
  { key: "clientId", label: "Client ID", type: "text", required: false },
  { key: "accessToken", label: "Access Token", type: "password", required: false },
  { key: "webhookSecret", label: "Webhook Secret", type: "password", required: false },
  { key: "defaultPincode", label: "Default Pincode", type: "text", required: false },
];

/** Slugify a human-entered field name into a camelCase credential key. */
export function toFieldKey(label: string): string {
  const parts = label
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  return parts
    .map((p, i) => {
      const lower = p.toLowerCase();
      return i === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}


/** Given a credential block, compute form values and any extra fields not in the schema */
export function resolveBlockData(block: CredentialBlock) {
  const values: Record<string, string> = {};
  const definedKeys = new Set(block.fields.map((f) => f.key));
  const extraFields: CredentialFieldDef[] = [];

  for (const f of block.fields) {
    values[f.key] = block.values[f.key] ?? "";
  }

  for (const [key, val] of Object.entries(block.values)) {
    if (!definedKeys.has(key)) {
      const preset = COMMON_FIELD_PRESETS.find((p) => p.key === key);
      extraFields.push(preset ?? { key, label: key, type: "text", required: false });
      values[key] = val;
    }
  }

  return { values, extraFields };
}
