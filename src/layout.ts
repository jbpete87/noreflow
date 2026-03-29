import type {
  AlignItems,
  EdgeSizes,
  FlexNode,
  LayoutResult,
  MeasureFunction,
  ResolvedStyle,
} from './types.js';
import { resolveStyle } from './defaults.js';
import {
  clamp,
  resolveBorder,
  resolveDimension,
  resolveMargin,
  resolvePadding,
  resolveSize,
  horizontalInset,
  verticalInset,
} from './boxModel.js';

// ---------------------------------------------------------------------------
// Internal item representation used during layout
// ---------------------------------------------------------------------------

interface FlexItem {
  node: FlexNode;
  style: ResolvedStyle;
  padding: EdgeSizes;
  border: EdgeSizes;

  // Resolved margins (null = auto margin)
  marginTop: number | null;
  marginRight: number | null;
  marginBottom: number | null;
  marginLeft: number | null;

  // Sizes computed during layout
  flexBaseSize: number;
  hypotheticalMainSize: number;
  targetMainSize: number;
  usedMainSize: number;
  hypotheticalCrossSize: number;
  usedCrossSize: number;

  // Min/max constraints in the main axis (resolved to px)
  minMainSize: number;
  maxMainSize: number;
  minCrossSize: number;
  maxCrossSize: number;

  // Position (relative to container's content box)
  mainPos: number;
  crossPos: number;

  frozen: boolean;

  measure?: MeasureFunction;
  children: FlexNode[];
}

interface FlexLine {
  items: FlexItem[];
  crossSize: number;
  crossOffset: number;
}

// ---------------------------------------------------------------------------
// Axis helpers
// ---------------------------------------------------------------------------

function isRow(direction: ResolvedStyle['flexDirection']): boolean {
  return direction === 'row' || direction === 'row-reverse';
}

function mainAxisIsHorizontal(direction: ResolvedStyle['flexDirection']): boolean {
  return isRow(direction);
}

// ---------------------------------------------------------------------------
// computeLayout — the main entry point
// ---------------------------------------------------------------------------

export function computeLayout(
  node: FlexNode,
  availableWidth: number = Infinity,
  availableHeight: number = Infinity,
): LayoutResult {
  return layoutNode(node, availableWidth, availableHeight);
}

function layoutNode(
  node: FlexNode,
  availableWidth: number,
  availableHeight: number,
): LayoutResult {
  const style = resolveStyle(node.style);

  if (style.display === 'none') {
    return { x: 0, y: 0, width: 0, height: 0, children: [] };
  }

  const padding = resolvePadding(style);
  const border = resolveBorder(style);
  const hInset = horizontalInset(padding, border);
  const vInset = verticalInset(padding, border);

  // Resolve container's own size
  let containerWidth = resolveSize(style.width, availableWidth);
  let containerHeight = resolveSize(style.height, availableHeight);

  // For border-box, the specified size includes padding+border
  if (style.boxSizing === 'border-box') {
    if (containerWidth !== null) containerWidth = Math.max(0, containerWidth - hInset);
    if (containerHeight !== null) containerHeight = Math.max(0, containerHeight - vInset);
  }

  const horizontal = mainAxisIsHorizontal(style.flexDirection);
  const mainSize = horizontal ? containerWidth : containerHeight;
  const crossSize = horizontal ? containerHeight : containerWidth;

  const availableMainForItems = mainSize ?? (horizontal ? availableWidth - hInset : availableHeight - vInset);
  const availableCrossForItems = crossSize ?? (horizontal ? availableHeight - vInset : availableWidth - hInset);

  // Resolve min/max for the container content box
  const containerMinW = resolveDimension(style.minWidth, availableWidth);
  const containerMaxW = resolveDimension(style.maxWidth, availableWidth);
  const containerMinH = resolveDimension(style.minHeight, availableHeight);
  const containerMaxH = resolveDimension(style.maxHeight, availableHeight);

  // ---------------------------------------------------------------------------
  // 9.1 — Generate flex items
  // ---------------------------------------------------------------------------

  const children = node.children ?? [];
  const items: FlexItem[] = children.map((child) => {
    const childStyle = resolveStyle(child.style);
    const childPadding = resolvePadding(childStyle);
    const childBorder = resolveBorder(childStyle);
    return {
      node: child,
      style: childStyle,
      padding: childPadding,
      border: childBorder,
      marginTop: resolveMargin(childStyle.marginTop, horizontal ? availableCrossForItems : availableMainForItems),
      marginRight: resolveMargin(childStyle.marginRight, horizontal ? availableMainForItems : availableCrossForItems),
      marginBottom: resolveMargin(childStyle.marginBottom, horizontal ? availableCrossForItems : availableMainForItems),
      marginLeft: resolveMargin(childStyle.marginLeft, horizontal ? availableMainForItems : availableCrossForItems),
      flexBaseSize: 0,
      hypotheticalMainSize: 0,
      targetMainSize: 0,
      usedMainSize: 0,
      hypotheticalCrossSize: 0,
      usedCrossSize: 0,
      minMainSize: horizontal
        ? resolveDimension(childStyle.minWidth, availableMainForItems)
        : resolveDimension(childStyle.minHeight, availableMainForItems),
      maxMainSize: horizontal
        ? resolveDimension(childStyle.maxWidth, availableMainForItems)
        : resolveDimension(childStyle.maxHeight, availableMainForItems),
      minCrossSize: horizontal
        ? resolveDimension(childStyle.minHeight, availableCrossForItems)
        : resolveDimension(childStyle.minWidth, availableCrossForItems),
      maxCrossSize: horizontal
        ? resolveDimension(childStyle.maxHeight, availableCrossForItems)
        : resolveDimension(childStyle.maxWidth, availableCrossForItems),
      mainPos: 0,
      crossPos: 0,
      frozen: false,
      measure: child.measure,
      children: child.children ?? [],
    } satisfies FlexItem;
  });

  // Filter out display:none items
  const visibleItems = items.filter((item) => item.style.display !== 'none');

  // ---------------------------------------------------------------------------
  // 9.2 — Determine flex base size and hypothetical main size
  // ---------------------------------------------------------------------------

  for (const item of visibleItems) {
    const childHInset = horizontalInset(item.padding, item.border);
    const childVInset = verticalInset(item.padding, item.border);
    const mainInset = horizontal ? childHInset : childVInset;

    let baseSize: number;

    if (item.style.flexBasis !== 'auto') {
      // Definite flex-basis
      baseSize = item.style.flexBasis;
      if (item.style.boxSizing === 'border-box') {
        baseSize = Math.max(0, baseSize - mainInset);
      }
    } else {
      // flex-basis: auto → use main size property (width or height)
      const mainSizeValue = horizontal ? item.style.width : item.style.height;
      const resolved = resolveSize(mainSizeValue, availableMainForItems);

      if (resolved !== null) {
        baseSize = resolved;
        if (item.style.boxSizing === 'border-box') {
          baseSize = Math.max(0, baseSize - mainInset);
        }
      } else if (item.measure) {
        // Content-based sizing via measure callback
        const measured = item.measure(
          horizontal ? availableMainForItems : Infinity,
          horizontal ? Infinity : availableMainForItems,
        );
        baseSize = horizontal ? measured.width : measured.height;
      } else if (item.children.length > 0 && item.style.display === 'flex') {
        // Nested flex container: compute its layout to get intrinsic size
        const childLayout = layoutNode(
          item.node,
          horizontal ? Infinity : availableMainForItems + mainInset,
          horizontal ? availableMainForItems + mainInset : Infinity,
        );
        baseSize = horizontal
          ? Math.max(0, childLayout.width - childHInset)
          : Math.max(0, childLayout.height - childVInset);
      } else {
        baseSize = 0;
      }
    }

    item.flexBaseSize = baseSize;

    // Hypothetical main size = flex base size clamped by min/max, floored at 0
    item.hypotheticalMainSize = Math.max(
      0,
      clamp(baseSize, item.minMainSize, item.maxMainSize),
    );
  }

  // ---------------------------------------------------------------------------
  // 9.3 — Collect flex items into flex lines
  // ---------------------------------------------------------------------------

  const lines: FlexLine[] = [];
  const mainGap = horizontal ? style.columnGap : style.rowGap;
  const crossGap = horizontal ? style.rowGap : style.columnGap;

  if (style.flexWrap === 'nowrap' || visibleItems.length === 0) {
    lines.push({ items: visibleItems, crossSize: 0, crossOffset: 0 });
  } else {
    let currentLine: FlexItem[] = [];
    let lineMainSize = 0;

    for (const item of visibleItems) {
      const outerHypo = item.hypotheticalMainSize + outerMainMargin(item, horizontal);
      const gapSize = currentLine.length > 0 ? mainGap : 0;

      if (currentLine.length > 0 && lineMainSize + gapSize + outerHypo > availableMainForItems) {
        lines.push({ items: currentLine, crossSize: 0, crossOffset: 0 });
        currentLine = [item];
        lineMainSize = outerHypo;
      } else {
        currentLine.push(item);
        lineMainSize += gapSize + outerHypo;
      }
    }

    if (currentLine.length > 0) {
      lines.push({ items: currentLine, crossSize: 0, crossOffset: 0 });
    }
  }

  // Reverse lines for wrap-reverse
  if (style.flexWrap === 'wrap-reverse') {
    lines.reverse();
  }

  // ---------------------------------------------------------------------------
  // 9.3 continued + 9.7 — Resolve flexible lengths for each line
  // ---------------------------------------------------------------------------

  for (const line of lines) {
    resolveFlexibleLengths(line.items, availableMainForItems, mainGap, horizontal);
  }

  // ---------------------------------------------------------------------------
  // 9.4 — Cross size determination
  // ---------------------------------------------------------------------------

  for (const line of lines) {
    for (const item of line.items) {
      const childHInset = horizontalInset(item.padding, item.border);
      const childVInset = verticalInset(item.padding, item.border);
      const crossInset = horizontal ? childVInset : childHInset;

      // Determine hypothetical cross size
      const crossSizeValue = horizontal ? item.style.height : item.style.width;
      const resolvedCross = resolveSize(crossSizeValue, availableCrossForItems);

      if (resolvedCross !== null) {
        let cs = resolvedCross;
        if (item.style.boxSizing === 'border-box') {
          cs = Math.max(0, cs - crossInset);
        }
        item.hypotheticalCrossSize = cs;
      } else if (item.measure) {
        const measured = item.measure(
          horizontal ? item.usedMainSize : Infinity,
          horizontal ? Infinity : item.usedMainSize,
        );
        item.hypotheticalCrossSize = horizontal ? measured.height : measured.width;
      } else if (item.children.length > 0 && item.style.display === 'flex') {
        const childLayout = layoutNode(
          item.node,
          horizontal ? item.usedMainSize + childHInset : availableCrossForItems + childHInset,
          horizontal ? availableCrossForItems + childVInset : item.usedMainSize + childVInset,
        );
        item.hypotheticalCrossSize = horizontal
          ? Math.max(0, childLayout.height - childVInset)
          : Math.max(0, childLayout.width - childHInset);
      } else {
        item.hypotheticalCrossSize = 0;
      }

      item.hypotheticalCrossSize = Math.max(
        0,
        clamp(item.hypotheticalCrossSize, item.minCrossSize, item.maxCrossSize),
      );
    }
  }

  // Calculate cross size of each flex line
  const isSingleLine = style.flexWrap === 'nowrap';

  if (isSingleLine && crossSize !== null) {
    // Single-line with definite cross size
    lines[0]!.crossSize = crossSize;
  } else {
    for (const line of lines) {
      let maxCross = 0;
      for (const item of line.items) {
        const outerCross = item.hypotheticalCrossSize + outerCrossMargin(item, horizontal);
        if (outerCross > maxCross) maxCross = outerCross;
      }
      line.crossSize = maxCross;
    }

    // For single-line, clamp by container min/max cross size
    if (isSingleLine && lines[0]) {
      const minCross = horizontal
        ? Math.max(0, containerMinH - vInset)
        : Math.max(0, containerMinW - hInset);
      const maxCross = horizontal
        ? Math.max(0, containerMaxH - vInset)
        : Math.max(0, containerMaxW - hInset);
      lines[0].crossSize = clamp(lines[0].crossSize, minCross, maxCross);
    }
  }

  // Determine used cross size of each item
  for (const line of lines) {
    for (const item of line.items) {
      const effectiveAlign = resolveAlignSelf(item.style.alignSelf, style.alignItems);

      if (
        effectiveAlign === 'stretch' &&
        (horizontal ? item.style.height : item.style.width) === 'auto' &&
        item.marginTop !== null &&
        item.marginBottom !== null &&
        (horizontal ? item.marginTop : item.marginLeft) !== null &&
        (horizontal ? item.marginBottom : item.marginRight) !== null
      ) {
        const crossMargin = outerCrossMargin(item, horizontal);
        item.usedCrossSize = clamp(
          line.crossSize - crossMargin,
          item.minCrossSize,
          item.maxCrossSize,
        );
      } else {
        item.usedCrossSize = item.hypotheticalCrossSize;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 9.5 — Main-axis alignment
  // ---------------------------------------------------------------------------

  for (const line of lines) {
    alignMainAxis(line.items, availableMainForItems, style.justifyContent, mainGap, horizontal);
  }

  // ---------------------------------------------------------------------------
  // 9.6 — Cross-axis alignment
  // ---------------------------------------------------------------------------

  // Per-item cross-axis alignment within each line
  for (const line of lines) {
    for (const item of line.items) {
      const effectiveAlign = resolveAlignSelf(item.style.alignSelf, style.alignItems);
      const outerCross = item.usedCrossSize + outerCrossMargin(item, horizontal);
      const freeSpace = line.crossSize - outerCross;

      // Handle auto cross-axis margins
      const crossStartMarginAuto = horizontal
        ? item.marginTop === null
        : item.marginLeft === null;
      const crossEndMarginAuto = horizontal
        ? item.marginBottom === null
        : item.marginRight === null;

      if (crossStartMarginAuto || crossEndMarginAuto) {
        if (crossStartMarginAuto && crossEndMarginAuto) {
          const half = Math.max(0, freeSpace) / 2;
          if (horizontal) {
            item.marginTop = half;
            item.marginBottom = half;
          } else {
            item.marginLeft = half;
            item.marginRight = half;
          }
        } else if (crossStartMarginAuto) {
          if (horizontal) item.marginTop = Math.max(0, freeSpace);
          else item.marginLeft = Math.max(0, freeSpace);
        } else {
          if (horizontal) item.marginBottom = Math.max(0, freeSpace);
          else item.marginRight = Math.max(0, freeSpace);
        }
        // After resolving auto margins, position at cross-start
        item.crossPos = crossStartMarginValue(item, horizontal);
      } else {
        const crossStartM = crossStartMarginValue(item, horizontal);
        switch (effectiveAlign) {
          case 'flex-start':
            item.crossPos = crossStartM;
            break;
          case 'flex-end':
            item.crossPos = line.crossSize - item.usedCrossSize - crossEndMarginValue(item, horizontal);
            break;
          case 'center': {
            item.crossPos = crossStartM + freeSpace / 2;
            break;
          }
          case 'stretch':
            item.crossPos = crossStartM;
            break;
        }
      }
    }
  }

  // Determine container cross size and line offsets
  let totalCrossSize: number;
  if (crossSize !== null) {
    totalCrossSize = crossSize;
  } else {
    totalCrossSize = 0;
    for (let i = 0; i < lines.length; i++) {
      totalCrossSize += lines[i]!.crossSize;
      if (i < lines.length - 1) totalCrossSize += crossGap;
    }

    // Clamp by container min/max
    const minCross = horizontal
      ? Math.max(0, containerMinH - vInset)
      : Math.max(0, containerMinW - hInset);
    const maxCross = horizontal
      ? Math.max(0, containerMaxH - vInset)
      : Math.max(0, containerMaxW - hInset);
    totalCrossSize = clamp(totalCrossSize, minCross, maxCross);
  }

  // align-content: distribute lines along the cross axis
  alignCrossLines(lines, totalCrossSize, style.alignContent, crossGap);

  // ---------------------------------------------------------------------------
  // Compute final container size
  // ---------------------------------------------------------------------------

  let usedMainSize: number;
  if (mainSize !== null) {
    usedMainSize = mainSize;
  } else {
    // Auto main size: sum of items on the longest line
    usedMainSize = 0;
    for (const line of lines) {
      let lineSize = 0;
      for (let i = 0; i < line.items.length; i++) {
        const it = line.items[i]!;
        lineSize += it.usedMainSize + outerMainMargin(it, horizontal);
        if (i < line.items.length - 1) lineSize += mainGap;
      }
      if (lineSize > usedMainSize) usedMainSize = lineSize;
    }
  }

  const contentWidth = horizontal ? usedMainSize : totalCrossSize;
  const contentHeight = horizontal ? totalCrossSize : usedMainSize;

  let finalWidth: number;
  let finalHeight: number;

  if (containerWidth !== null) {
    finalWidth = containerWidth + hInset;
  } else {
    finalWidth = clamp(contentWidth + hInset, containerMinW, containerMaxW);
  }

  if (containerHeight !== null) {
    finalHeight = containerHeight + vInset;
  } else {
    finalHeight = clamp(contentHeight + vInset, containerMinH, containerMaxH);
  }

  // ---------------------------------------------------------------------------
  // Convert positions to absolute coordinates and recurse
  // ---------------------------------------------------------------------------

  const childLayouts: LayoutResult[] = [];

  // Build a map from FlexNode to its position
  for (const line of lines) {
    for (const item of line.items) {
      const mainOffset = horizontal ? padding.left + border.left : padding.top + border.top;
      const crossOffset = horizontal ? padding.top + border.top : padding.left + border.left;

      const itemX = horizontal
        ? mainOffset + item.mainPos
        : crossOffset + line.crossOffset + item.crossPos;
      const itemY = horizontal
        ? crossOffset + line.crossOffset + item.crossPos
        : mainOffset + item.mainPos;

      const itemW = horizontal ? item.usedMainSize : item.usedCrossSize;
      const itemH = horizontal ? item.usedCrossSize : item.usedMainSize;

      const itemOuterW = itemW + horizontalInset(item.padding, item.border);
      const itemOuterH = itemH + verticalInset(item.padding, item.border);

      // Recursively layout children of this item
      let itemChildLayouts: LayoutResult[] = [];
      if (item.children.length > 0 && item.style.display === 'flex') {
        const innerLayout = layoutNode(item.node, itemOuterW, itemOuterH);
        itemChildLayouts = innerLayout.children;
      }

      childLayouts.push({
        x: itemX,
        y: itemY,
        width: itemOuterW,
        height: itemOuterH,
        children: itemChildLayouts,
      });
    }
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
// 9.7 — Resolving Flexible Lengths
// ---------------------------------------------------------------------------

function resolveFlexibleLengths(
  items: FlexItem[],
  availableMain: number,
  gap: number,
  horizontal: boolean,
): void {
  if (items.length === 0) return;

  // Total gap space
  const totalGap = gap * (items.length - 1);

  // Initialize target main size to flex base size; mark all as unfrozen
  for (const item of items) {
    item.targetMainSize = item.flexBaseSize;
    item.frozen = false;
  }

  // Determine used space from outer hypothetical main sizes
  let usedByHypothetical = totalGap;
  for (const item of items) {
    usedByHypothetical += item.hypotheticalMainSize + outerMainMargin(item, horizontal);
  }

  const growing = usedByHypothetical < availableMain;

  // Freeze inflexible items
  for (const item of items) {
    const factor = growing ? item.style.flexGrow : item.style.flexShrink;
    if (factor === 0) {
      item.targetMainSize = item.hypotheticalMainSize;
      item.frozen = true;
    } else if (growing && item.flexBaseSize > item.hypotheticalMainSize) {
      item.targetMainSize = item.hypotheticalMainSize;
      item.frozen = true;
    } else if (!growing && item.flexBaseSize < item.hypotheticalMainSize) {
      item.targetMainSize = item.hypotheticalMainSize;
      item.frozen = true;
    }
  }

  // Calculate initial free space
  let initialFreeSpace = availableMain - totalGap;
  for (const item of items) {
    if (item.frozen) {
      initialFreeSpace -= item.targetMainSize + outerMainMargin(item, horizontal);
    } else {
      initialFreeSpace -= item.flexBaseSize + outerMainMargin(item, horizontal);
    }
  }

  // Flex resolution loop
  for (let iteration = 0; iteration < 100; iteration++) {
    // Check if all items are frozen
    const unfrozen = items.filter((i) => !i.frozen);
    if (unfrozen.length === 0) break;

    // Calculate remaining free space
    let remainingFreeSpace = availableMain - totalGap;
    for (const item of items) {
      if (item.frozen) {
        remainingFreeSpace -= item.targetMainSize + outerMainMargin(item, horizontal);
      } else {
        remainingFreeSpace -= item.flexBaseSize + outerMainMargin(item, horizontal);
      }
    }

    // If sum of flex factors < 1, scale the free space
    let sumFlexFactors = 0;
    for (const item of unfrozen) {
      sumFlexFactors += growing ? item.style.flexGrow : item.style.flexShrink;
    }

    if (sumFlexFactors < 1 && sumFlexFactors > 0) {
      const scaled = initialFreeSpace * sumFlexFactors;
      if (Math.abs(scaled) < Math.abs(remainingFreeSpace)) {
        remainingFreeSpace = scaled;
      }
    }

    // Distribute free space
    if (remainingFreeSpace !== 0) {
      if (growing) {
        let totalGrowth = 0;
        for (const item of unfrozen) totalGrowth += item.style.flexGrow;

        if (totalGrowth > 0) {
          for (const item of unfrozen) {
            const ratio = item.style.flexGrow / totalGrowth;
            item.targetMainSize = item.flexBaseSize + remainingFreeSpace * ratio;
          }
        }
      } else {
        // Shrink: weighted by flex-shrink * base size
        let totalScaledShrink = 0;
        for (const item of unfrozen) {
          totalScaledShrink += item.style.flexShrink * item.flexBaseSize;
        }

        if (totalScaledShrink > 0) {
          for (const item of unfrozen) {
            const scaledFactor = item.style.flexShrink * item.flexBaseSize;
            const ratio = scaledFactor / totalScaledShrink;
            item.targetMainSize =
              item.flexBaseSize - Math.abs(remainingFreeSpace) * ratio;
          }
        }
      }
    }

    // Fix min/max violations and freeze
    let totalViolation = 0;
    const violations: Array<{ item: FlexItem; type: 'min' | 'max' | 'none' }> = [];

    for (const item of unfrozen) {
      const clamped = Math.max(0, clamp(item.targetMainSize, item.minMainSize, item.maxMainSize));
      const violation = clamped - item.targetMainSize;
      totalViolation += violation;

      if (violation > 0) {
        violations.push({ item, type: 'min' });
      } else if (violation < 0) {
        violations.push({ item, type: 'max' });
      } else {
        violations.push({ item, type: 'none' });
      }

      item.targetMainSize = clamped;
    }

    if (totalViolation === 0) {
      // Freeze all
      for (const item of unfrozen) item.frozen = true;
    } else if (totalViolation > 0) {
      // Freeze min violations
      for (const { item, type } of violations) {
        if (type === 'min') item.frozen = true;
      }
    } else {
      // Freeze max violations
      for (const { item, type } of violations) {
        if (type === 'max') item.frozen = true;
      }
    }
  }

  // Set used main size
  for (const item of items) {
    item.usedMainSize = Math.max(0, item.targetMainSize);
  }
}

// ---------------------------------------------------------------------------
// Main-axis alignment (justify-content)
// ---------------------------------------------------------------------------

function alignMainAxis(
  items: FlexItem[],
  availableMain: number,
  justifyContent: ResolvedStyle['justifyContent'],
  gap: number,
  horizontal: boolean,
): void {
  if (items.length === 0) return;

  const totalGap = gap * (items.length - 1);

  // Check for auto margins on the main axis
  let autoMarginCount = 0;
  for (const item of items) {
    if (horizontal) {
      if (item.marginLeft === null) autoMarginCount++;
      if (item.marginRight === null) autoMarginCount++;
    } else {
      if (item.marginTop === null) autoMarginCount++;
      if (item.marginBottom === null) autoMarginCount++;
    }
  }

  let usedSpace = totalGap;
  for (const item of items) {
    usedSpace += item.usedMainSize + outerMainMargin(item, horizontal);
  }

  const freeSpace = availableMain - usedSpace;

  // If there are auto margins, distribute free space to them
  if (autoMarginCount > 0 && freeSpace > 0) {
    const perAutoMargin = freeSpace / autoMarginCount;
    for (const item of items) {
      if (horizontal) {
        if (item.marginLeft === null) item.marginLeft = perAutoMargin;
        if (item.marginRight === null) item.marginRight = perAutoMargin;
      } else {
        if (item.marginTop === null) item.marginTop = perAutoMargin;
        if (item.marginBottom === null) item.marginBottom = perAutoMargin;
      }
    }
    // Recalculate: now just position sequentially
    let pos = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      pos += mainStartMarginValue(item, horizontal);
      item.mainPos = pos;
      pos += item.usedMainSize + mainEndMarginValue(item, horizontal);
      if (i < items.length - 1) pos += gap;
    }
    return;
  }

  // Set any remaining null margins to 0
  for (const item of items) {
    if (horizontal) {
      if (item.marginLeft === null) item.marginLeft = 0;
      if (item.marginRight === null) item.marginRight = 0;
    } else {
      if (item.marginTop === null) item.marginTop = 0;
      if (item.marginBottom === null) item.marginBottom = 0;
    }
  }

  // Recalculate used space with resolved margins
  usedSpace = totalGap;
  for (const item of items) {
    usedSpace += item.usedMainSize + outerMainMargin(item, horizontal);
  }
  const actualFreeSpace = Math.max(0, availableMain - usedSpace);

  let startOffset = 0;
  let betweenSpace = gap;

  switch (justifyContent) {
    case 'flex-start':
      startOffset = 0;
      betweenSpace = gap;
      break;
    case 'flex-end':
      startOffset = actualFreeSpace;
      betweenSpace = gap;
      break;
    case 'center':
      startOffset = actualFreeSpace / 2;
      betweenSpace = gap;
      break;
    case 'space-between':
      startOffset = 0;
      betweenSpace = items.length > 1
        ? gap + actualFreeSpace / (items.length - 1)
        : gap;
      break;
    case 'space-around': {
      const perItem = actualFreeSpace / items.length;
      startOffset = perItem / 2;
      betweenSpace = gap + perItem;
      break;
    }
    case 'space-evenly': {
      const perSlot = actualFreeSpace / (items.length + 1);
      startOffset = perSlot;
      betweenSpace = gap + perSlot;
      break;
    }
  }

  let pos = startOffset;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    pos += mainStartMarginValue(item, horizontal);
    item.mainPos = pos;
    pos += item.usedMainSize + mainEndMarginValue(item, horizontal);
    if (i < items.length - 1) pos += betweenSpace;
  }
}

// ---------------------------------------------------------------------------
// Cross-axis line alignment (align-content)
// ---------------------------------------------------------------------------

function alignCrossLines(
  lines: FlexLine[],
  totalCrossSize: number,
  alignContent: ResolvedStyle['alignContent'],
  crossGap: number,
): void {
  if (lines.length === 0) return;

  const totalLinesCross =
    lines.reduce((sum, l) => sum + l.crossSize, 0) +
    crossGap * (lines.length - 1);
  const freeSpace = Math.max(0, totalCrossSize - totalLinesCross);

  let offset = 0;
  let betweenSpace = crossGap;

  switch (alignContent) {
    case 'flex-start':
      offset = 0;
      betweenSpace = crossGap;
      break;
    case 'flex-end':
      offset = freeSpace;
      betweenSpace = crossGap;
      break;
    case 'center':
      offset = freeSpace / 2;
      betweenSpace = crossGap;
      break;
    case 'stretch':
      offset = 0;
      betweenSpace = crossGap;
      if (lines.length > 0) {
        const extra = freeSpace / lines.length;
        for (const line of lines) {
          line.crossSize += extra;
        }
      }
      break;
    case 'space-between':
      offset = 0;
      betweenSpace = lines.length > 1
        ? crossGap + freeSpace / (lines.length - 1)
        : crossGap;
      break;
    case 'space-around': {
      const perLine = freeSpace / lines.length;
      offset = perLine / 2;
      betweenSpace = crossGap + perLine;
      break;
    }
  }

  let pos = offset;
  for (const line of lines) {
    line.crossOffset = pos;
    pos += line.crossSize + betweenSpace;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveAlignSelf(
  alignSelf: ResolvedStyle['alignSelf'],
  parentAlignItems: AlignItems,
): AlignItems {
  return alignSelf === 'auto' ? parentAlignItems : alignSelf;
}

function outerMainMargin(item: FlexItem, horizontal: boolean): number {
  if (horizontal) {
    return (item.marginLeft ?? 0) + (item.marginRight ?? 0);
  }
  return (item.marginTop ?? 0) + (item.marginBottom ?? 0);
}

function outerCrossMargin(item: FlexItem, horizontal: boolean): number {
  if (horizontal) {
    return (item.marginTop ?? 0) + (item.marginBottom ?? 0);
  }
  return (item.marginLeft ?? 0) + (item.marginRight ?? 0);
}

function mainStartMarginValue(item: FlexItem, horizontal: boolean): number {
  return (horizontal ? item.marginLeft : item.marginTop) ?? 0;
}

function mainEndMarginValue(item: FlexItem, horizontal: boolean): number {
  return (horizontal ? item.marginRight : item.marginBottom) ?? 0;
}

function crossStartMarginValue(item: FlexItem, horizontal: boolean): number {
  return (horizontal ? item.marginTop : item.marginLeft) ?? 0;
}

function crossEndMarginValue(item: FlexItem, horizontal: boolean): number {
  return (horizontal ? item.marginBottom : item.marginRight) ?? 0;
}
