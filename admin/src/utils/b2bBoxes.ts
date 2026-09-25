/**
 * Helpers for B2B multi-box packages with per-type quantity.
 *
 * The form lets a user say "3 boxes of 11×11×11 cm @ 2 kg each" instead of
 * adding the same box three times. The backend rate API does not understand
 * `quantity` — it bills per-package — so before any rate fetch / order submit
 * we must expand each box `quantity` times into individual entries.
 *
 * Use these helpers everywhere instead of inlining the math, so qty handling
 * stays consistent (and safe against `NaN` from cleared form inputs).
 */

export interface BoxLike {
  quantity?: number | string | null;
  weight?: number | string | null;
  length?: number | string | null;
  breadth?: number | string | null;
  height?: number | string | null;
}

export interface ExpandedBox {
  weight: number;
  length: number;
  breadth: number;
  height: number;
}

/**
 * Coerce any user input (number, numeric string, NaN, undefined, null, "")
 * into a positive integer ≥ 1. NaN/0/falsy/negative all fall back to 1.
 */
export function normalizeQuantity(q: unknown): number {
  const n = Math.floor(Number(q) || 1);
  return n >= 1 ? n : 1;
}

/**
 * Expand a list of boxes-with-quantity into a flat list of individual boxes.
 * One row with `quantity: 3` becomes three identical entries in the output.
 */
export function expandPackagesByQuantity<T extends BoxLike>(boxes: T[]): ExpandedBox[] {
  return boxes.flatMap((b) => {
    const qty = normalizeQuantity(b.quantity);
    const expanded: ExpandedBox = {
      weight: Number(b.weight) || 0,
      length: Number(b.length) || 0,
      breadth: Number(b.breadth) || 0,
      height: Number(b.height) || 0,
    };
    return Array.from({ length: qty }, () => ({ ...expanded }));
  });
}

/** Total physical box count (sum of quantities across rows). */
export function totalBoxCount(boxes: BoxLike[]): number {
  return boxes.reduce((sum, b) => sum + normalizeQuantity(b.quantity), 0);
}

/** Σ (weight × qty) in kg. */
export function totalDeadWeightKg(boxes: BoxLike[]): number {
  return boxes.reduce(
    (sum, b) => sum + (Number(b.weight) || 0) * normalizeQuantity(b.quantity),
    0,
  );
}

/** Σ (L×B×H/divisor × qty) in kg. Default volumetric divisor is 5000. */
export function totalVolumetricWeightKg(boxes: BoxLike[], divisor = 5000): number {
  return boxes.reduce((sum, b) => {
    const vol =
      ((Number(b.length) || 0) * (Number(b.breadth) || 0) * (Number(b.height) || 0)) / divisor;
    return sum + vol * normalizeQuantity(b.quantity);
  }, 0);
}

/** Σ max(deadKg, volKg) × qty — matches backend B2B billable-weight logic. */
export function totalBillableWeightKg(boxes: BoxLike[], divisor = 5000): number {
  return boxes.reduce((sum, b) => {
    const dead = Number(b.weight) || 0;
    const vol =
      ((Number(b.length) || 0) * (Number(b.breadth) || 0) * (Number(b.height) || 0)) / divisor;
    return sum + Math.max(dead, vol) * normalizeQuantity(b.quantity);
  }, 0);
}
