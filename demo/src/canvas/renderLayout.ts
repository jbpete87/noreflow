import type { LayoutResult } from 'noreflow';

const PALETTE = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
];

export interface FlatEntry {
  result: LayoutResult;
  absX: number;
  absY: number;
  depth: number;
  label: string;
}

export interface RenderOptions {
  scale?: number;
  showLabels?: boolean;
  showDimensions?: boolean;
  padding?: number;
  highlightIndex?: number | null;
}

export interface RenderState {
  entries: FlatEntry[];
  autoScale: number;
  padding: number;
}

export function renderLayout(
  ctx: CanvasRenderingContext2D,
  layout: LayoutResult,
  canvasWidth: number,
  canvasHeight: number,
  options: RenderOptions = {},
): RenderState {
  const {
    scale = 1,
    showLabels = true,
    showDimensions = false,
    padding = 20,
    highlightIndex = null,
  } = options;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const entries = flattenLayout(layout);

  let maxX = 0;
  let maxY = 0;
  for (const entry of entries) {
    maxX = Math.max(maxX, entry.absX + entry.result.width);
    maxY = Math.max(maxY, entry.absY + entry.result.height);
  }

  const availW = canvasWidth - padding * 2;
  const availH = canvasHeight - padding * 2;
  const autoScale =
    maxX > 0 && maxY > 0
      ? Math.min(availW / maxX, availH / maxY, scale)
      : scale;

  ctx.save();
  ctx.translate(padding, padding);
  ctx.scale(autoScale, autoScale);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const { absX, absY, result, depth } = entry;
    const color = PALETTE[depth % PALETTE.length]!;
    const isHighlighted = i === highlightIndex;
    const w = result.width;
    const h = result.height;

    ctx.fillStyle = hexToRgba(color, isHighlighted ? 0.35 : 0.15);
    ctx.fillRect(absX, absY, w, h);

    ctx.strokeStyle = isHighlighted ? '#ffffff' : color;
    ctx.lineWidth = (isHighlighted ? 2.5 : 1.5) / autoScale;
    ctx.strokeRect(absX, absY, w, h);

    if (showLabels && w > 18 && h > 12) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(absX, absY, w, h);
      ctx.clip();

      const pad = 3 / autoScale;
      const maxFontPx = Math.min(w / 4, h / 3, 13);
      const fontSize = Math.max(8, maxFontPx) / autoScale;
      ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;

      if (showDimensions && h > 24) {
        const dimText = `${Math.round(w)}x${Math.round(h)}`;
        ctx.fillStyle = color;
        ctx.fillText(entry.label, absX + pad, absY + fontSize + pad);
        if (h > fontSize * 2.2 + pad * 2) {
          ctx.fillStyle = hexToRgba(color, 0.5);
          ctx.fillText(dimText, absX + pad, absY + fontSize * 2.1 + pad);
        }
      } else {
        ctx.fillStyle = color;
        const textY = absY + h / 2 + fontSize / 3;
        ctx.textAlign = 'center';
        ctx.fillText(entry.label, absX + w / 2, textY);
        ctx.textAlign = 'start';
      }

      ctx.restore();
    }
  }

  // Draw tooltip for highlighted entry
  if (highlightIndex !== null && highlightIndex < entries.length) {
    const entry = entries[highlightIndex]!;
    const { absX, absY, result } = entry;

    const lines = [
      `${entry.label}`,
      `x: ${Math.round(result.x)}  y: ${Math.round(result.y)}`,
      `w: ${Math.round(result.width)}  h: ${Math.round(result.height)}`,
    ];

    const tipFontSize = 11 / autoScale;
    ctx.font = `500 ${tipFontSize}px "JetBrains Mono", monospace`;

    const lineHeight = tipFontSize * 1.4;
    const tipPad = 6 / autoScale;
    let tipW = 0;
    for (const line of lines) {
      tipW = Math.max(tipW, ctx.measureText(line).width);
    }
    tipW += tipPad * 2;
    const tipH = lineHeight * lines.length + tipPad * 2;

    let tipX = absX + result.width + 6 / autoScale;
    let tipY = absY;
    // Keep tooltip on screen
    if ((tipX + tipW) * autoScale + padding > canvasWidth) {
      tipX = absX - tipW - 6 / autoScale;
    }
    if ((tipY + tipH) * autoScale + padding > canvasHeight) {
      tipY = absY + result.height - tipH;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    const r = 4 / autoScale;
    ctx.beginPath();
    ctx.roundRect(tipX, tipY, tipW, tipH, r);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    for (let j = 0; j < lines.length; j++) {
      const isTitle = j === 0;
      ctx.fillStyle = isTitle ? '#a5b4fc' : '#e2e8f0';
      ctx.fillText(lines[j]!, tipX + tipPad, tipY + tipPad + lineHeight * (j + 0.8));
    }
  }

  ctx.restore();

  return { entries, autoScale, padding };
}

/**
 * Find the deepest entry whose bounding box contains the given canvas-space point.
 * Returns the index into the entries array, or null.
 */
export function hitTest(
  state: RenderState,
  canvasX: number,
  canvasY: number,
): number | null {
  const { entries, autoScale, padding } = state;
  // Transform canvas coords back to layout space
  const lx = (canvasX - padding) / autoScale;
  const ly = (canvasY - padding) / autoScale;

  // Walk backwards to find deepest (last-drawn = topmost) hit
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i]!;
    if (
      lx >= e.absX &&
      lx <= e.absX + e.result.width &&
      ly >= e.absY &&
      ly <= e.absY + e.result.height
    ) {
      return i;
    }
  }
  return null;
}

export function flattenLayout(
  result: LayoutResult,
  parentX = 0,
  parentY = 0,
  depth = 0,
  index = 0,
): FlatEntry[] {
  const absX = parentX + result.x;
  const absY = parentY + result.y;
  const label = depth === 0 ? 'root' : `${index}`;
  const entries: FlatEntry[] = [{ result, absX, absY, depth, label }];
  for (let i = 0; i < result.children.length; i++) {
    entries.push(
      ...flattenLayout(result.children[i]!, absX, absY, depth + 1, i),
    );
  }
  return entries;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
