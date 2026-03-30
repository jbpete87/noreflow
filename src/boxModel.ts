import type {
  DimensionValue,
  EdgeSizes,
  InsetValue,
  MarginValue,
  ResolvedStyle,
  SizeValue,
} from './types.js';

/**
 * Parse a percentage string like "50%" into the numeric value (50).
 * Returns null for non-percentage values.
 */
function parsePercent(value: string): number | null {
  if (value.endsWith('%')) {
    const n = Number(value.slice(0, -1));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Resolve a SizeValue (px, %, or "auto") against a reference size.
 * Returns null for "auto" (caller must handle auto sizing).
 */
export function resolveSize(
  value: SizeValue,
  referenceSize: number,
): number | null {
  if (value === 'auto') return null;
  if (typeof value === 'number') return value;
  const pct = parsePercent(value);
  if (pct !== null) {
    if (!isFinite(referenceSize)) return 0;
    return (pct / 100) * referenceSize;
  }
  return null;
}

/**
 * Resolve a DimensionValue (px or %) against a reference size.
 * Used for min/max constraints where "auto" is not valid.
 */
export function resolveDimension(
  value: DimensionValue,
  referenceSize: number,
): number {
  if (typeof value === 'number') return value;
  const pct = parsePercent(value);
  if (pct !== null) {
    if (!isFinite(referenceSize)) return 0;
    return (pct / 100) * referenceSize;
  }
  return 0;
}

/**
 * Resolve a margin value. Returns null for "auto" margins
 * (which have special meaning in flex layout for alignment).
 */
export function resolveMargin(
  value: MarginValue,
  referenceSize: number,
): number | null {
  if (value === 'auto') return null;
  if (typeof value === 'number') return value;
  const pct = parsePercent(value);
  if (pct !== null) return (pct / 100) * referenceSize;
  return 0;
}

/**
 * Resolve an inset value (top/right/bottom/left) against a reference size.
 * Returns null for "auto" (meaning the inset is not set).
 */
export function resolveInset(
  value: InsetValue,
  referenceSize: number,
): number | null {
  if (value === 'auto') return null;
  if (typeof value === 'number') return value;
  const pct = parsePercent(value);
  if (pct !== null) return (pct / 100) * referenceSize;
  return null;
}

/**
 * Resolve all four padding edges to pixel values.
 */
export function resolvePadding(
  style: ResolvedStyle,
): EdgeSizes {
  return {
    top: style.paddingTop,
    right: style.paddingRight,
    bottom: style.paddingBottom,
    left: style.paddingLeft,
  };
}

/**
 * Resolve all four border edges to pixel values.
 */
export function resolveBorder(
  style: ResolvedStyle,
): EdgeSizes {
  return {
    top: style.borderTop,
    right: style.borderRight,
    bottom: style.borderBottom,
    left: style.borderLeft,
  };
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * For border-box sizing, convert a specified size to the content size
 * by subtracting padding and border.
 */
export function borderBoxToContentBox(
  specifiedSize: number,
  padding: EdgeSizes,
  border: EdgeSizes,
  isMainHorizontal: boolean,
): number {
  if (isMainHorizontal) {
    return Math.max(0, specifiedSize - padding.left - padding.right - border.left - border.right);
  }
  return Math.max(0, specifiedSize - padding.top - padding.bottom - border.top - border.bottom);
}

/**
 * Compute the total horizontal inset (padding + border on left and right).
 */
export function horizontalInset(padding: EdgeSizes, border: EdgeSizes): number {
  return padding.left + padding.right + border.left + border.right;
}

/**
 * Compute the total vertical inset (padding + border on top and bottom).
 */
export function verticalInset(padding: EdgeSizes, border: EdgeSizes): number {
  return padding.top + padding.bottom + border.top + border.bottom;
}
