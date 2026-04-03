import type { LayoutResult } from 'noreflow';
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';
import type { HostNode } from './hostNode.js';

export interface PaintContext {
  ctx: CanvasRenderingContext2D;
  scrollOffsets: Map<HostNode, number>;
  scrollContentLayouts: Map<HostNode, import('noreflow').LayoutResult>;
  focusedNode: HostNode | null;
  cursorPos: number;
  cursorVisible: boolean;
}

export function paint(
  pctx: PaintContext,
  hostNode: HostNode,
  layoutNode: LayoutResult,
  offsetX: number,
  offsetY: number,
): void {
  const { ctx, scrollOffsets } = pctx;
  const x = offsetX + layoutNode.x;
  const y = offsetY + layoutNode.y;
  const { width, height } = layoutNode;

  if (width <= 0 || height <= 0) return;

  const vs = hostNode.visualStyle;
  const alpha = vs.opacity;
  const prevAlpha = ctx.globalAlpha;
  if (alpha !== undefined && alpha < 1) {
    ctx.globalAlpha = prevAlpha * alpha;
  }

  if (vs.backgroundColor) {
    ctx.fillStyle = vs.backgroundColor;
    if (vs.borderRadius && vs.borderRadius > 0) {
      roundedRect(ctx, x, y, width, height, vs.borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, width, height);
    }
  }

  if (vs.borderColor && hostNode.style.borderTop) {
    const bw = (hostNode.style.borderTop as number) || 1;
    ctx.strokeStyle = vs.borderColor;
    ctx.lineWidth = bw;
    if (vs.borderRadius && vs.borderRadius > 0) {
      roundedRect(ctx, x, y, width, height, vs.borderRadius);
      ctx.stroke();
    } else {
      ctx.strokeRect(x + bw / 2, y + bw / 2, width - bw, height - bw);
    }
  }

  if (hostNode.type === 'text' && hostNode.textMeta) {
    const { prepared, font, lineHeight, color, textAlign } = hostNode.textMeta;
    if (width > 0) {
      const { lines } = layoutWithLines(prepared, width, lineHeight);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
      ctx.textAlign = textAlign;
      const textX = textAlign === 'center' ? x + width / 2 : textAlign === 'right' ? x + width : x;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        ctx.fillText(line.text, textX, y + i * lineHeight);
      }
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  if (hostNode.type === 'textinput' && width > 0) {
    const value = (hostNode.props['value'] as string | undefined) ?? '';
    const placeholder = (hostNode.props['placeholder'] as string | undefined) ?? '';
    const font = (hostNode.props['font'] as string | undefined) ?? '400 14px Inter, system-ui, sans-serif';
    const lineHeight = (hostNode.props['lineHeight'] as number | undefined) ?? 20;
    const color = (hostNode.props['color'] as string | undefined) ?? '#000000';
    const placeholderColor = (hostNode.props['placeholderColor'] as string | undefined) ?? '#9ca3af';
    const isFocused = pctx.focusedNode === hostNode;

    // Clip to the textinput bounds so overflow scrolls instead of bleeding out
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    ctx.font = font;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    if (value) {
      const prepared = prepareWithSegments(value, font);
      const { lines } = layoutWithLines(prepared, width, lineHeight);
      const totalTextHeight = lines.length * lineHeight;

      // Auto-scroll: if text overflows, shift up so last line is visible
      const scrollOffset = totalTextHeight > height ? totalTextHeight - height : 0;

      ctx.fillStyle = color;
      for (let i = 0; i < lines.length; i++) {
        const lineY = y + i * lineHeight - scrollOffset;
        if (lineY + lineHeight < y) continue;
        if (lineY > y + height) break;
        ctx.fillText(lines[i]!.text, x, lineY);
      }

      if (isFocused && pctx.cursorVisible) {
        const cursorChar = Math.min(pctx.cursorPos, value.length);
        // Find which line the cursor is on
        let charCount = 0;
        let cursorLine = lines.length - 1;
        let cursorLineStart = 0;
        for (let i = 0; i < lines.length; i++) {
          const lineLen = lines[i]!.text.length;
          if (charCount + lineLen >= cursorChar) {
            cursorLine = i;
            cursorLineStart = charCount;
            break;
          }
          charCount += lineLen;
        }
        const textOnLine = value.slice(cursorLineStart, cursorChar);
        const cursorX = x + ctx.measureText(textOnLine).width;
        const cursorY = y + cursorLine * lineHeight - scrollOffset;
        ctx.fillStyle = color;
        ctx.fillRect(cursorX, cursorY + 1, 1.5, lineHeight - 2);
      }
    } else {
      if (placeholder) {
        const prepared = prepareWithSegments(placeholder, font);
        const { lines } = layoutWithLines(prepared, width, lineHeight);
        ctx.fillStyle = placeholderColor;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i]!.text, x, y + i * lineHeight);
        }
      }
      if (isFocused && pctx.cursorVisible) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y + 1, 1.5, lineHeight - 2);
      }
    }

    ctx.restore();
  }

  // Clip children to rounded rect if borderRadius is set (non-scroll containers)
  const needsClip = hostNode.type !== 'scroll' && vs.borderRadius && vs.borderRadius > 0;
  if (needsClip) {
    ctx.save();
    roundedRect(ctx, x, y, width, height, vs.borderRadius!);
    ctx.clip();
  }

  const isScroll = hostNode.type === 'scroll';
  const scrollY = scrollOffsets.get(hostNode) ?? 0;

  if (isScroll) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    const contentLayout = pctx.scrollContentLayouts.get(hostNode);
    if (contentLayout) {
      for (let i = 0; i < hostNode.children.length; i++) {
        const childHost = hostNode.children[i]!;
        if (childHost.type === '_rawtext') continue;
        const childLayout = contentLayout.children[i];
        if (childLayout) {
          paint(pctx, childHost, childLayout, x, y - scrollY);
        }
      }
    }

    ctx.restore();
  } else {
    for (let i = 0; i < hostNode.children.length; i++) {
      const childHost = hostNode.children[i]!;
      if (childHost.type === '_rawtext') continue;
      const childLayout = layoutNode.children[i];
      if (childLayout) {
        paint(pctx, childHost, childLayout, x, y);
      }
    }
  }

  if (needsClip) {
    ctx.restore();
  }

  if (alpha !== undefined && alpha < 1) {
    ctx.globalAlpha = prevAlpha;
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}
