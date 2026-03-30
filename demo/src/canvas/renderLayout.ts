import type { LayoutResult } from 'noreflow';

const FILLS = [
  { bg: '#b5afa7' }, // border-subtle (root outline)
  { bg: '#8d857b' }, // warm stone
  { bg: '#a39e96' }, // lighter stone
  { bg: '#7a756f' }, // text-muted
  { bg: '#968f86' }, // mid tone
  { bg: '#6b665f' }, // dark stone
  { bg: '#b0a89f' }, // light taupe
  { bg: '#857f77' }, // cool stone
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

  // Draw filled shapes with subtle borders — no in-box labels
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const { absX, absY, result, depth } = entry;
    const theme = FILLS[depth % FILLS.length]!;
    const isHighlighted = i === highlightIndex;
    const w = result.width;
    const h = result.height;

    const radius = Math.min(4 / autoScale, w / 4, h / 4);

    ctx.beginPath();
    ctx.roundRect(absX, absY, w, h, radius);

    if (isHighlighted) {
      ctx.fillStyle = hexToRgba(theme.bg, 0.9);
    } else if (depth === 0) {
      ctx.fillStyle = 'rgba(229,224,218,0.15)';
    } else {
      ctx.fillStyle = hexToRgba(theme.bg, 0.55);
    }
    ctx.fill();

    ctx.strokeStyle = isHighlighted
      ? 'rgba(26,26,26,0.8)'
      : depth === 0
        ? 'rgba(181,175,167,0.4)'
        : hexToRgba(theme.bg, 0.25);
    ctx.lineWidth = (isHighlighted ? 2 : 1) / autoScale;
    ctx.stroke();
  }

  if (highlightIndex !== null && highlightIndex < entries.length) {
    const entry = entries[highlightIndex]!;
    const { absX, absY, result, depth } = entry;

    const dimStr = `${Math.round(result.width)} x ${Math.round(result.height)}`;
    const posStr = `pos: (${Math.round(result.x)}, ${Math.round(result.y)})`;
    const depthStr = `depth: ${depth}`;

    const lines = [entry.label, dimStr, posStr, depthStr];

    const tipFontSize = 11 / autoScale;
    ctx.font = `500 ${tipFontSize}px "JetBrains Mono", monospace`;

    const lineHeight = tipFontSize * 1.4;
    const tipPad = 8 / autoScale;
    let tipW = 0;
    for (const line of lines) {
      tipW = Math.max(tipW, ctx.measureText(line).width);
    }
    tipW += tipPad * 2;
    const tipH = lineHeight * lines.length + tipPad * 2;

    const gap = 8 / autoScale;
    const minX = -padding / autoScale;
    const minY = -padding / autoScale;
    const maxX = (canvasWidth - padding) / autoScale - tipW;
    const maxY = (canvasHeight - padding) / autoScale - tipH;

    let tipX = absX + result.width + gap;
    if (tipX > maxX) tipX = absX - tipW - gap;
    tipX = Math.max(minX, Math.min(tipX, maxX));

    let tipY = absY;
    if (tipY + tipH > (canvasHeight - padding) / autoScale) {
      tipY = absY + result.height - tipH;
    }
    tipY = Math.max(minY, Math.min(tipY, maxY));

    const r = 6 / autoScale;
    ctx.fillStyle = 'rgba(26,26,26,0.94)';
    ctx.beginPath();
    ctx.roundRect(tipX, tipY, tipW, tipH, r);
    ctx.fill();

    for (let j = 0; j < lines.length; j++) {
      ctx.fillStyle = j === 0 ? '#6ee7b7' : j === 1 ? '#ffffff' : '#a1a1aa';
      ctx.fillText(lines[j]!, tipX + tipPad, tipY + tipPad + lineHeight * (j + 0.8));
    }
  }

  ctx.restore();

  return { entries, autoScale, padding };
}

export function hitTest(
  state: RenderState,
  canvasX: number,
  canvasY: number,
): number | null {
  const { entries, autoScale, padding } = state;
  const lx = (canvasX - padding) / autoScale;
  const ly = (canvasY - padding) / autoScale;

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
  parentLabel = '',
): FlatEntry[] {
  const absX = parentX + result.x;
  const absY = parentY + result.y;
  let label: string;
  if (depth === 0) {
    label = 'root';
  } else if (depth === 1) {
    label = `child[${index}]`;
  } else {
    label = `${parentLabel} > [${index}]`;
  }
  const entries: FlatEntry[] = [{ result, absX, absY, depth, label }];
  for (let i = 0; i < result.children.length; i++) {
    entries.push(
      ...flattenLayout(result.children[i]!, absX, absY, depth + 1, i, label),
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
