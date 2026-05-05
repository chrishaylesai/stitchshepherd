export type DimensionUnit = "stitches" | "inches";

export function inchesToStitches(inches: number, fabricCount: number) {
  if (!Number.isFinite(inches) || !Number.isFinite(fabricCount)) return 1;

  return clampWholeNumber(Math.round(inches * fabricCount), 1);
}

export function stitchesToInches(stitches: number, fabricCount: number) {
  if (!Number.isFinite(stitches) || !Number.isFinite(fabricCount) || fabricCount <= 0) return 0;

  return stitches / fabricCount;
}

export function formatInches(inches: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(inches) ? 0 : 1
  }).format(inches);
}

export function clampWholeNumber(value: number, min: number, max = Number.POSITIVE_INFINITY) {
  if (!Number.isFinite(value)) return min;

  return Math.min(max, Math.max(min, Math.round(value)));
}
