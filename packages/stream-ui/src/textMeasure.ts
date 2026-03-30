import { prepareWithSegments, layout, layoutWithLines } from '@chenglou/pretext';
import type { PreparedTextWithSegments, LayoutLine } from '@chenglou/pretext';
import type { MeasureFunction } from 'noreflow';

export interface TextHandle {
  measure: MeasureFunction;
  text: string;
  prepared: PreparedTextWithSegments;
  font: string;
  lineHeight: number;
  getLines(maxWidth: number): LayoutLine[];
  getHeight(maxWidth: number): number;
}

export function createTextHandle(
  text: string,
  font: string,
  lineHeight: number,
): TextHandle {
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
