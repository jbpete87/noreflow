import type {
  FlexNode,
  GridLine,
  LayoutResult,
  ResolvedStyle,
  TrackSize,
  JustifyItems,
} from './types.js';
import { resolveStyle } from './defaults.js';
import {
  clamp,
  resolveInset,
  resolveBorder,
  resolveDimension,
  resolvePadding,
  resolveSize,
  horizontalInset,
  verticalInset,
} from './boxModel.js';

// ---------------------------------------------------------------------------
// Track parsing
// ---------------------------------------------------------------------------

interface ResolvedTrack {
  type: 'px' | 'percent' | 'fr' | 'auto';
  value: number;
}

function parseTrackSize(size: TrackSize): ResolvedTrack {
  if (size === 'auto') return { type: 'auto', value: 0 };
  if (typeof size === 'number') return { type: 'px', value: size };

  const str = size as string;
  if (str.endsWith('fr')) {
    const n = Number(str.slice(0, -2));
    return { type: 'fr', value: Number.isFinite(n) ? n : 0 };
  }
  if (str.endsWith('%')) {
    const n = Number(str.slice(0, -1));
    return { type: 'percent', value: Number.isFinite(n) ? n : 0 };
  }
  return { type: 'auto', value: 0 };
}

// ---------------------------------------------------------------------------
// Grid item placement
// ---------------------------------------------------------------------------

interface GridItem {
  node: FlexNode;
  style: ResolvedStyle;
  originalIndex: number;

  // Resolved placement (0-based track indices)
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}

function resolveGridLine(value: GridLine): number | null {
  if (value === 'auto') return null;
  return value;
}

/**
 * Place items onto the grid. Items with explicit placement go first,
 * then auto-placed items fill remaining cells.
 */
function placeItems(
  items: GridItem[],
  explicitCols: number,
  explicitRows: number,
  autoFlow: ResolvedStyle['gridAutoFlow'],
): { totalCols: number; totalRows: number } {
  let maxCol = explicitCols;
  let maxRow = explicitRows;

  // Pass 1: resolve explicit placements
  for (const item of items) {
    const cs = resolveGridLine(item.style.gridColumnStart);
    const ce = resolveGridLine(item.style.gridColumnEnd);
    const rs = resolveGridLine(item.style.gridRowStart);
    const re = resolveGridLine(item.style.gridRowEnd);

    // Convert 1-based line numbers to 0-based track indices
    if (cs !== null) item.colStart = cs - 1;
    if (ce !== null) item.colEnd = ce - 1;
    if (rs !== null) item.rowStart = rs - 1;
    if (re !== null) item.rowEnd = re - 1;

    // If start is set but end is not, span 1
    if (cs !== null && ce === null) item.colEnd = item.colStart + 1;
    if (rs !== null && re === null) item.rowEnd = item.rowStart + 1;

    // If end is set but start is not, place one track before end
    if (cs === null && ce !== null) item.colStart = item.colEnd - 1;
    if (rs === null && re !== null) item.rowStart = item.rowEnd - 1;

    if (item.colEnd > maxCol) maxCol = item.colEnd;
    if (item.rowEnd > maxRow) maxRow = item.rowEnd;
  }

  // Pass 2: auto-place items that have no explicit position
  const isOccupied = (grid: Set<string>, row: number, col: number) =>
    grid.has(`${row},${col}`);

  const markOccupied = (grid: Set<string>, item: GridItem) => {
    for (let r = item.rowStart; r < item.rowEnd; r++) {
      for (let c = item.colStart; c < item.colEnd; c++) {
        grid.add(`${r},${c}`);
      }
    }
  };

  const occupiedCells = new Set<string>();

  // Mark explicitly placed items
  for (const item of items) {
    if (item.colStart >= 0 && item.rowStart >= 0) {
      markOccupied(occupiedCells, item);
    }
  }

  // Auto-place remaining items
  let autoRow = 0;
  let autoCol = 0;

  for (const item of items) {
    const needsColPlacement = item.colStart < 0;
    const needsRowPlacement = item.rowStart < 0;

    if (!needsColPlacement && !needsRowPlacement) continue;

    const spanCols = needsColPlacement ? 1 : item.colEnd - item.colStart;
    const spanRows = needsRowPlacement ? 1 : item.rowEnd - item.rowStart;

    if (autoFlow === 'row') {
      // Row-major auto-placement
      let placed = false;
      for (let r = needsRowPlacement ? autoRow : item.rowStart; !placed; r++) {
        const startCol = (r === autoRow && needsColPlacement) ? autoCol : 0;
        for (let c = needsColPlacement ? startCol : item.colStart; c <= maxCol - spanCols; c++) {
          let fits = true;
          for (let dr = 0; dr < spanRows && fits; dr++) {
            for (let dc = 0; dc < spanCols && fits; dc++) {
              if (isOccupied(occupiedCells, r + dr, c + dc)) fits = false;
            }
          }
          if (fits) {
            if (needsColPlacement) {
              item.colStart = c;
              item.colEnd = c + spanCols;
            }
            if (needsRowPlacement) {
              item.rowStart = r;
              item.rowEnd = r + spanRows;
            }
            markOccupied(occupiedCells, item);
            autoRow = r;
            autoCol = item.colEnd;
            if (autoCol >= maxCol) {
              autoRow++;
              autoCol = 0;
            }
            placed = true;
            break;
          }
        }
        if (!placed) {
          if (r >= maxRow) maxRow = r + 1;
          autoCol = 0;
        }
      }
    } else {
      // Column-major auto-placement
      let placed = false;
      for (let c = needsColPlacement ? autoCol : item.colStart; !placed; c++) {
        const startRow = (c === autoCol && needsRowPlacement) ? autoRow : 0;
        for (let r = needsRowPlacement ? startRow : item.rowStart; r <= maxRow - spanRows; r++) {
          let fits = true;
          for (let dr = 0; dr < spanRows && fits; dr++) {
            for (let dc = 0; dc < spanCols && fits; dc++) {
              if (isOccupied(occupiedCells, r + dr, c + dc)) fits = false;
            }
          }
          if (fits) {
            if (needsRowPlacement) {
              item.rowStart = r;
              item.rowEnd = r + spanRows;
            }
            if (needsColPlacement) {
              item.colStart = c;
              item.colEnd = c + spanCols;
            }
            markOccupied(occupiedCells, item);
            autoCol = c;
            autoRow = item.rowEnd;
            if (autoRow >= maxRow) {
              autoCol++;
              autoRow = 0;
            }
            placed = true;
            break;
          }
        }
        if (!placed) {
          if (c >= maxCol) maxCol = c + 1;
          autoRow = 0;
        }
      }
    }

    if (item.colEnd > maxCol) maxCol = item.colEnd;
    if (item.rowEnd > maxRow) maxRow = item.rowEnd;
  }

  return { totalCols: maxCol, totalRows: maxRow };
}

// ---------------------------------------------------------------------------
// Track sizing
// ---------------------------------------------------------------------------

function resolveTrackSizes(
  tracks: ResolvedTrack[],
  availableSize: number,
  gap: number,
  items: GridItem[],
  axis: 'col' | 'row',
  layoutFn: (node: FlexNode, w: number, h: number) => LayoutResult,
): number[] {
  const sizes = new Array<number>(tracks.length).fill(0);
  const totalGap = gap * Math.max(0, tracks.length - 1);
  let remainingSpace = availableSize - totalGap;

  // Pass 1: resolve fixed (px) and percent tracks
  const frTracks: number[] = [];
  let totalFr = 0;

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i]!;
    if (t.type === 'px') {
      sizes[i] = t.value;
      remainingSpace -= t.value;
    } else if (t.type === 'percent') {
      sizes[i] = (t.value / 100) * availableSize;
      remainingSpace -= sizes[i]!;
    } else if (t.type === 'fr') {
      frTracks.push(i);
      totalFr += t.value;
    } else {
      // auto: size to content
      let maxContent = 0;
      for (const item of items) {
        const start = axis === 'col' ? item.colStart : item.rowStart;
        const end = axis === 'col' ? item.colEnd : item.rowEnd;
        if (start === i && end === i + 1) {
          const childStyle = item.style;
          const childPadding = resolvePadding(childStyle);
          const childBorder = resolveBorder(childStyle);

          if (axis === 'col') {
            const resolved = resolveSize(childStyle.width, availableSize);
            if (resolved !== null) {
              let w = resolved;
              if (childStyle.boxSizing === 'border-box') {
                w = Math.max(0, w - horizontalInset(childPadding, childBorder));
              }
              maxContent = Math.max(maxContent, w + horizontalInset(childPadding, childBorder));
            } else if (item.node.measure) {
              const measured = item.node.measure(Infinity, Infinity);
              maxContent = Math.max(maxContent, measured.width + horizontalInset(childPadding, childBorder));
            } else if ((item.node.children ?? []).length > 0) {
              const childLayout = layoutFn(item.node, Infinity, Infinity);
              maxContent = Math.max(maxContent, childLayout.width);
            }
          } else {
            const resolved = resolveSize(childStyle.height, availableSize);
            if (resolved !== null) {
              let h = resolved;
              if (childStyle.boxSizing === 'border-box') {
                h = Math.max(0, h - verticalInset(childPadding, childBorder));
              }
              maxContent = Math.max(maxContent, h + verticalInset(childPadding, childBorder));
            } else if (item.node.measure) {
              const measured = item.node.measure(Infinity, Infinity);
              maxContent = Math.max(maxContent, measured.height + verticalInset(childPadding, childBorder));
            } else if ((item.node.children ?? []).length > 0) {
              const childLayout = layoutFn(item.node, Infinity, Infinity);
              maxContent = Math.max(maxContent, childLayout.height);
            }
          }
        }
      }
      sizes[i] = maxContent;
      remainingSpace -= maxContent;
    }
  }

  // Pass 2: distribute remaining space to fr tracks
  if (frTracks.length > 0 && totalFr > 0) {
    const frSpace = Math.max(0, remainingSpace);
    for (const idx of frTracks) {
      sizes[idx] = (tracks[idx]!.value / totalFr) * frSpace;
    }
  }

  return sizes;
}

// ---------------------------------------------------------------------------
// Grid alignment helpers
// ---------------------------------------------------------------------------

function resolveJustifySelf(
  justifySelf: ResolvedStyle['justifySelf'],
  parentJustifyItems: JustifyItems,
): JustifyItems {
  return justifySelf === 'auto' ? parentJustifyItems : justifySelf;
}

function resolveAlignSelf(
  alignSelf: ResolvedStyle['alignSelf'],
  parentAlignItems: ResolvedStyle['alignItems'],
): ResolvedStyle['alignItems'] {
  return alignSelf === 'auto' ? parentAlignItems : alignSelf;
}

// ---------------------------------------------------------------------------
// layoutGrid — the grid layout entry point
// ---------------------------------------------------------------------------

export function layoutGrid(
  node: FlexNode,
  availableWidth: number,
  availableHeight: number,
  layoutNodeFn: (node: FlexNode, w: number, h: number) => LayoutResult,
): LayoutResult {
  const style = resolveStyle(node.style);

  const padding = resolvePadding(style);
  const border = resolveBorder(style);
  const hInset = horizontalInset(padding, border);
  const vInset = verticalInset(padding, border);

  // Resolve container size
  let containerWidth = resolveSize(style.width, availableWidth);
  let containerHeight = resolveSize(style.height, availableHeight);

  if (style.boxSizing === 'border-box') {
    if (containerWidth !== null) containerWidth = Math.max(0, containerWidth - hInset);
    if (containerHeight !== null) containerHeight = Math.max(0, containerHeight - vInset);
  }

  const contentWidth = containerWidth ?? Math.max(0, availableWidth - hInset);
  const contentHeight = containerHeight ?? Math.max(0, availableHeight - vInset);

  // Resolve min/max
  const containerMinW = resolveDimension(style.minWidth, availableWidth);
  const containerMaxW = resolveDimension(style.maxWidth, availableWidth);
  const containerMinH = resolveDimension(style.minHeight, availableHeight);
  const containerMaxH = resolveDimension(style.maxHeight, availableHeight);

  // ---------------------------------------------------------------------------
  // Build grid items (separate absolute from flow, like flex)
  // ---------------------------------------------------------------------------

  const children = node.children ?? [];

  interface ChildEntry {
    index: number;
    child: FlexNode;
    style: ResolvedStyle;
  }

  const absoluteChildren: ChildEntry[] = [];
  const flowEntries: ChildEntry[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    const childStyle = resolveStyle(child.style);
    const entry: ChildEntry = { index: i, child, style: childStyle };
    if (childStyle.position === 'absolute') {
      absoluteChildren.push(entry);
    } else if (childStyle.display !== 'none') {
      flowEntries.push(entry);
    }
  }

  // Build grid items with sentinel placements (-1 = needs auto-placement)
  const gridItems: GridItem[] = flowEntries.map((e) => ({
    node: e.child,
    style: e.style,
    originalIndex: e.index,
    colStart: -1,
    colEnd: -1,
    rowStart: -1,
    rowEnd: -1,
  }));

  // Parse template definitions
  const colTemplates = style.gridTemplateColumns.map(parseTrackSize);
  const rowTemplates = style.gridTemplateRows.map(parseTrackSize);
  const autoColTrack = parseTrackSize(style.gridAutoColumns);
  const autoRowTrack = parseTrackSize(style.gridAutoRows);

  const explicitCols = colTemplates.length;
  const explicitRows = rowTemplates.length;

  // Place items and determine final grid size
  const { totalCols, totalRows } = placeItems(
    gridItems,
    Math.max(explicitCols, 1),
    Math.max(explicitRows, 1),
    style.gridAutoFlow,
  );

  // Build full track lists (explicit + implicit)
  const allColTracks: ResolvedTrack[] = [];
  for (let i = 0; i < totalCols; i++) {
    allColTracks.push(i < explicitCols ? colTemplates[i]! : autoColTrack);
  }

  const allRowTracks: ResolvedTrack[] = [];
  for (let i = 0; i < totalRows; i++) {
    allRowTracks.push(i < explicitRows ? rowTemplates[i]! : autoRowTrack);
  }

  // Resolve track sizes
  const colSizes = resolveTrackSizes(
    allColTracks, contentWidth, style.columnGap, gridItems, 'col', layoutNodeFn,
  );
  const rowSizes = resolveTrackSizes(
    allRowTracks, contentHeight, style.rowGap, gridItems, 'row', layoutNodeFn,
  );

  // Compute track positions (cumulative offsets including gaps)
  const colPositions = new Array<number>(totalCols);
  let pos = 0;
  for (let i = 0; i < totalCols; i++) {
    colPositions[i] = pos;
    pos += colSizes[i]! + (i < totalCols - 1 ? style.columnGap : 0);
  }

  const rowPositions = new Array<number>(totalRows);
  pos = 0;
  for (let i = 0; i < totalRows; i++) {
    rowPositions[i] = pos;
    pos += rowSizes[i]! + (i < totalRows - 1 ? style.rowGap : 0);
  }

  // Total content size from tracks
  const tracksWidth = totalCols > 0
    ? colPositions[totalCols - 1]! + colSizes[totalCols - 1]!
    : 0;
  const tracksHeight = totalRows > 0
    ? rowPositions[totalRows - 1]! + rowSizes[totalRows - 1]!
    : 0;

  // Final container size
  let finalWidth: number;
  if (containerWidth !== null) {
    finalWidth = containerWidth + hInset;
  } else {
    finalWidth = clamp(tracksWidth + hInset, containerMinW, containerMaxW);
  }

  let finalHeight: number;
  if (containerHeight !== null) {
    finalHeight = containerHeight + vInset;
  } else {
    finalHeight = clamp(tracksHeight + vInset, containerMinH, containerMaxH);
  }

  // ---------------------------------------------------------------------------
  // Align-content / justify-content: offset all tracks within container
  // ---------------------------------------------------------------------------

  const usableWidth = finalWidth - hInset;
  const usableHeight = finalHeight - vInset;

  const justifyOffset = computeContentAlignment(
    style.justifyContent, tracksWidth, usableWidth,
  );
  const alignOffset = computeContentAlignment(
    style.alignContent, tracksHeight, usableHeight,
  );

  // ---------------------------------------------------------------------------
  // Position each grid item
  // ---------------------------------------------------------------------------

  const childLayoutMap = new Map<number, LayoutResult>();

  for (const item of gridItems) {
    // Grid area bounds
    let areaX = colPositions[item.colStart]! + justifyOffset;
    let areaY = rowPositions[item.rowStart]! + alignOffset;
    let areaW = 0;
    for (let c = item.colStart; c < item.colEnd; c++) {
      areaW += colSizes[c]!;
      if (c > item.colStart) areaW += style.columnGap;
    }
    let areaH = 0;
    for (let r = item.rowStart; r < item.rowEnd; r++) {
      areaH += rowSizes[r]!;
      if (r > item.rowStart) areaH += style.rowGap;
    }

    const childPadding = resolvePadding(item.style);
    const childBorder = resolveBorder(item.style);
    const childHInset = horizontalInset(childPadding, childBorder);
    const childVInset = verticalInset(childPadding, childBorder);

    // Resolve item size
    let itemW = resolveSize(item.style.width, contentWidth);
    let itemH = resolveSize(item.style.height, contentHeight);

    if (item.style.boxSizing === 'border-box') {
      if (itemW !== null) itemW = Math.max(0, itemW - childHInset);
      if (itemH !== null) itemH = Math.max(0, itemH - childVInset);
    }

    // Aspect ratio
    if (item.style.aspectRatio !== undefined) {
      if (itemW !== null && itemH === null) {
        itemH = itemW / item.style.aspectRatio;
      } else if (itemH !== null && itemW === null) {
        itemW = itemH * item.style.aspectRatio;
      }
    }

    // Alignment determines whether we stretch to fill the grid area
    const effectiveJustify = resolveJustifySelf(item.style.justifySelf, style.justifyItems);
    const effectiveAlign = resolveAlignSelf(item.style.alignSelf, style.alignItems);

    if (itemW === null) {
      if (effectiveJustify === 'stretch') {
        itemW = Math.max(0, areaW - childHInset);
      } else if (item.node.measure) {
        const measured = item.node.measure(areaW, areaH);
        itemW = measured.width;
      } else if ((item.node.children ?? []).length > 0) {
        const childLayout = layoutNodeFn(item.node, areaW, areaH);
        itemW = Math.max(0, childLayout.width - childHInset);
      } else {
        itemW = Math.max(0, areaW - childHInset);
      }
    }

    if (itemH === null) {
      if (effectiveAlign === 'stretch') {
        itemH = Math.max(0, areaH - childVInset);
      } else if (item.node.measure) {
        const measured = item.node.measure(itemW + childHInset, areaH);
        itemH = measured.height;
      } else if ((item.node.children ?? []).length > 0) {
        const childLayout = layoutNodeFn(item.node, itemW + childHInset, areaH);
        itemH = Math.max(0, childLayout.height - childVInset);
      } else {
        itemH = Math.max(0, areaH - childVInset);
      }
    }

    // Clamp
    const minW = resolveDimension(item.style.minWidth, contentWidth);
    const maxW = resolveDimension(item.style.maxWidth, contentWidth);
    const minH = resolveDimension(item.style.minHeight, contentHeight);
    const maxH = resolveDimension(item.style.maxHeight, contentHeight);
    itemW = clamp(itemW, minW, maxW);
    itemH = clamp(itemH, minH, maxH);

    const outerW = itemW + childHInset;
    const outerH = itemH + childVInset;

    // Position within grid area based on alignment
    let itemX = padding.left + border.left + areaX;
    let itemY = padding.top + border.top + areaY;

    switch (effectiveJustify) {
      case 'start':
        break;
      case 'end':
        itemX += areaW - outerW;
        break;
      case 'center':
        itemX += (areaW - outerW) / 2;
        break;
      case 'stretch':
        break;
    }

    switch (effectiveAlign) {
      case 'flex-start':
        break;
      case 'flex-end':
        itemY += areaH - outerH;
        break;
      case 'center':
        itemY += (areaH - outerH) / 2;
        break;
      case 'stretch':
        break;
    }

    // Apply relative positioning
    if (item.style.position === 'relative') {
      const insetTop = resolveInset(item.style.top, finalHeight);
      const insetLeft = resolveInset(item.style.left, finalWidth);
      const insetBottom = resolveInset(item.style.bottom, finalHeight);
      const insetRight = resolveInset(item.style.right, finalWidth);

      if (insetLeft !== null) itemX += insetLeft;
      else if (insetRight !== null) itemX -= insetRight;
      if (insetTop !== null) itemY += insetTop;
      else if (insetBottom !== null) itemY -= insetBottom;
    }

    // Recursively layout children, propagating grid-determined dimensions
    let itemChildLayouts: LayoutResult[] = [];
    if ((item.node.children ?? []).length > 0) {
      const sizedNode: FlexNode = {
        ...item.node,
        style: {
          ...item.node.style,
          width: outerW,
          height: outerH,
          boxSizing: 'border-box' as const,
        },
      };
      const innerLayout = layoutNodeFn(sizedNode, outerW, outerH);
      itemChildLayouts = innerLayout.children;
    }

    childLayoutMap.set(item.originalIndex, {
      x: itemX,
      y: itemY,
      width: outerW,
      height: outerH,
      children: itemChildLayouts,
    });
  }

  // ---------------------------------------------------------------------------
  // Absolute children (same logic as flex)
  // ---------------------------------------------------------------------------

  const cbWidth = finalWidth - border.left - border.right;
  const cbHeight = finalHeight - border.top - border.bottom;

  for (const { index, child, style: absStyle } of absoluteChildren) {
    if (absStyle.display === 'none') {
      childLayoutMap.set(index, { x: 0, y: 0, width: 0, height: 0, children: [] });
      continue;
    }

    const absPadding = resolvePadding(absStyle);
    const absBorder = resolveBorder(absStyle);
    const absHInset = horizontalInset(absPadding, absBorder);
    const absVInset = verticalInset(absPadding, absBorder);

    const insetTop = resolveInset(absStyle.top, cbHeight);
    const insetRight = resolveInset(absStyle.right, cbWidth);
    const insetBottom = resolveInset(absStyle.bottom, cbHeight);
    const insetLeft = resolveInset(absStyle.left, cbWidth);

    let absW = resolveSize(absStyle.width, cbWidth);
    let absH = resolveSize(absStyle.height, cbHeight);

    if (absStyle.boxSizing === 'border-box') {
      if (absW !== null) absW = Math.max(0, absW - absHInset);
      if (absH !== null) absH = Math.max(0, absH - absVInset);
    }

    if (absW === null && insetLeft !== null && insetRight !== null) {
      absW = Math.max(0, cbWidth - insetLeft - insetRight - absHInset);
    }
    if (absH === null && insetTop !== null && insetBottom !== null) {
      absH = Math.max(0, cbHeight - insetTop - insetBottom - absVInset);
    }

    if (absStyle.aspectRatio !== undefined) {
      if (absW !== null && absH === null) absH = absW / absStyle.aspectRatio;
      else if (absH !== null && absW === null) absW = absH * absStyle.aspectRatio;
    }

    if (absW === null || absH === null) {
      if (child.measure) {
        const measured = child.measure(absW ?? cbWidth, absH ?? cbHeight);
        if (absW === null) absW = measured.width;
        if (absH === null) absH = measured.height;
      } else if ((child.children ?? []).length > 0) {
        const intrinsic = layoutNodeFn(child, absW !== null ? absW + absHInset : cbWidth, absH !== null ? absH + absVInset : cbHeight);
        if (absW === null) absW = Math.max(0, intrinsic.width - absHInset);
        if (absH === null) absH = Math.max(0, intrinsic.height - absVInset);
      } else {
        if (absW === null) absW = 0;
        if (absH === null) absH = 0;
      }
    }

    const absMinW = resolveDimension(absStyle.minWidth, cbWidth);
    const absMaxW = resolveDimension(absStyle.maxWidth, cbWidth);
    const absMinH = resolveDimension(absStyle.minHeight, cbHeight);
    const absMaxH = resolveDimension(absStyle.maxHeight, cbHeight);
    absW = clamp(absW, absMinW, absMaxW);
    absH = clamp(absH, absMinH, absMaxH);

    const absOuterW = absW + absHInset;
    const absOuterH = absH + absVInset;

    let absX = insetLeft !== null ? border.left + insetLeft
      : insetRight !== null ? border.left + cbWidth - insetRight - absOuterW
      : border.left;
    let absY = insetTop !== null ? border.top + insetTop
      : insetBottom !== null ? border.top + cbHeight - insetBottom - absOuterH
      : border.top;

    let absChildLayouts: LayoutResult[] = [];
    if ((child.children ?? []).length > 0) {
      const innerLayout = layoutNodeFn(child, absOuterW, absOuterH);
      absChildLayouts = innerLayout.children;
    }

    childLayoutMap.set(index, {
      x: absX,
      y: absY,
      width: absOuterW,
      height: absOuterH,
      children: absChildLayouts,
    });
  }

  // Hidden children
  for (let i = 0; i < children.length; i++) {
    if (!childLayoutMap.has(i)) {
      const childStyle = resolveStyle(children[i]!.style);
      if (childStyle.display === 'none' && childStyle.position !== 'absolute') {
        childLayoutMap.set(i, { x: 0, y: 0, width: 0, height: 0, children: [] });
      }
    }
  }

  // Reassemble in DOM order
  const childLayouts: LayoutResult[] = [];
  for (let i = 0; i < children.length; i++) {
    const layout = childLayoutMap.get(i);
    if (layout) childLayouts.push(layout);
  }

  return {
    x: 0,
    y: 0,
    width: finalWidth,
    height: finalHeight,
    children: childLayouts,
  };
}

// ---------------------------------------------------------------------------
// Content alignment (justify-content / align-content for grid)
// ---------------------------------------------------------------------------

function computeContentAlignment(
  alignment: ResolvedStyle['justifyContent'] | ResolvedStyle['alignContent'],
  tracksSize: number,
  containerSize: number,
): number {
  const freeSpace = Math.max(0, containerSize - tracksSize);

  switch (alignment) {
    case 'flex-start':
    case 'stretch':
      return 0;
    case 'flex-end':
      return freeSpace;
    case 'center':
      return freeSpace / 2;
    case 'space-between':
    case 'space-around':
    case 'space-evenly':
      return 0;
  }
}
