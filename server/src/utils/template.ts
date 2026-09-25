/**
 * Tiny {{var}} interpolator. Missing keys render as empty strings.
 * Supports dotted paths: {{user.name}}.
 */
export function renderTemplate(
  template: string,
  data: Record<string, unknown> = {},
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split(".");
    let value: unknown = data;
    for (const p of parts) {
      if (value && typeof value === "object" && p in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[p];
      } else {
        return "";
      }
    }
    return value === null || value === undefined ? "" : String(value);
  });
}
