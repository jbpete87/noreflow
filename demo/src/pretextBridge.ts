/**
 * Bridge between Pretext (pure TS text measurement) and Noreflow (pure TS layout).
 *
 * Pretext's prepare() caches glyph widths (one-time cost).
 * Pretext's layout() computes line breaks and height as pure arithmetic.
 * Noreflow's MeasureFunction calls layout() during its computation — zero DOM, zero reflow.
 */

import { prepareWithSegments, layout, layoutWithLines } from '@chenglou/pretext';
import type { PreparedTextWithSegments, LayoutLine } from '@chenglou/pretext';
import type { MeasureFunction } from 'noreflow';

export interface TextMeasureHandle {
  measure: MeasureFunction;
  text: string;
  prepared: PreparedTextWithSegments;
  font: string;
  lineHeight: number;
  getLines(maxWidth: number): LayoutLine[];
  getHeight(maxWidth: number): number;
}

/**
 * Create a Noreflow-compatible MeasureFunction backed by Pretext.
 *
 * Usage:
 *   const handle = textMeasure("Hello world", "400 14px Inter", 20);
 *   const node: FlexNode = { measure: handle.measure };
 *   // During layout, Noreflow calls handle.measure(availableWidth, availableHeight)
 *   // → Pretext computes line breaks + height as pure math
 */
export function textMeasure(
  text: string,
  font: string,
  lineHeight: number,
): TextMeasureHandle {
  const prepared = prepareWithSegments(text, font);

  return {
    text,
    font,
    lineHeight,
    prepared,

    measure: (availableWidth: number, _availableHeight: number) => {
      if (!isFinite(availableWidth) || availableWidth <= 0) {
        return { width: 0, height: lineHeight };
      }
      const result = layout(prepared, availableWidth, lineHeight);
      return { width: availableWidth, height: result.height };
    },

    getLines(maxWidth: number): LayoutLine[] {
      if (maxWidth <= 0) return [];
      return layoutWithLines(prepared, maxWidth, lineHeight).lines;
    },

    getHeight(maxWidth: number): number {
      if (maxWidth <= 0) return lineHeight;
      return layout(prepared, maxWidth, lineHeight).height;
    },
  };
}
