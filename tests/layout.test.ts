import { describe, it, expect } from 'vitest';
import { computeLayout } from '../src/layout.js';
import type { FlexNode } from '../src/types.js';

function round(result: ReturnType<typeof computeLayout>, decimals = 2): typeof result {
  const factor = 10 ** decimals;
  return {
    x: Math.round(result.x * factor) / factor,
    y: Math.round(result.y * factor) / factor,
    width: Math.round(result.width * factor) / factor,
    height: Math.round(result.height * factor) / factor,
    children: result.children.map((c) => round(c, decimals)),
  };
}

// ==========================================================================
// Basic container sizing
// ==========================================================================

describe('container sizing', () => {
  it('uses explicit width and height', () => {
    const result = computeLayout({
      style: { width: 200, height: 100 },
    });
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('includes padding in container size (content-box)', () => {
    const result = computeLayout({
      style: { width: 200, height: 100, padding: 10 },
    });
    // content-box: specified width is content width, total = content + padding
    expect(result.width).toBe(220);
    expect(result.height).toBe(120);
  });

  it('border-box sizing works', () => {
    const result = computeLayout({
      style: { width: 200, height: 100, padding: 20, boxSizing: 'border-box' },
    });
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });
});

// ==========================================================================
// flex-grow
// ==========================================================================

describe('flex-grow', () => {
  it('distributes space equally with equal grow factors', () => {
    const result = computeLayout({
      style: { width: 300, height: 50 },
      children: [
        { style: { flexGrow: 1 } },
        { style: { flexGrow: 1 } },
        { style: { flexGrow: 1 } },
      ],
    });

    expect(result.children).toHaveLength(3);
    expect(result.children[0]!.width).toBe(100);
    expect(result.children[1]!.width).toBe(100);
    expect(result.children[2]!.width).toBe(100);
  });

  it('distributes space proportionally with different grow factors', () => {
    const result = computeLayout({
      style: { width: 400, height: 50 },
      children: [
        { style: { flexGrow: 1 } },
        { style: { flexGrow: 3 } },
      ],
    });

    expect(result.children[0]!.width).toBe(100);
    expect(result.children[1]!.width).toBe(300);
  });

  it('grows from flex-basis', () => {
    const result = computeLayout({
      style: { width: 500, height: 50 },
      children: [
        { style: { flexBasis: 100, flexGrow: 1 } },
        { style: { flexBasis: 200, flexGrow: 1 } },
      ],
    });

    // 200px free space, split equally: 100 each
    expect(result.children[0]!.width).toBe(200);
    expect(result.children[1]!.width).toBe(300);
  });

  it('items without flexGrow stay at their base size', () => {
    const result = computeLayout({
      style: { width: 300, height: 50 },
      children: [
        { style: { width: 50 } },
        { style: { flexGrow: 1 } },
      ],
    });

    expect(result.children[0]!.width).toBe(50);
    expect(result.children[1]!.width).toBe(250);
  });
});

// ==========================================================================
// flex-shrink
// ==========================================================================

describe('flex-shrink', () => {
  it('shrinks items when they overflow the container', () => {
    const result = computeLayout({
      style: { width: 200, height: 50 },
      children: [
        { style: { flexBasis: 200, flexShrink: 1 } },
        { style: { flexBasis: 200, flexShrink: 1 } },
      ],
    });

    // Both start at 200, need to fit in 200. Equal shrink.
    expect(result.children[0]!.width).toBe(100);
    expect(result.children[1]!.width).toBe(100);
  });

  it('shrinks proportionally weighted by base size', () => {
    const result = round(computeLayout({
      style: { width: 300, height: 50 },
      children: [
        { style: { flexBasis: 200, flexShrink: 1 } },
        { style: { flexBasis: 400, flexShrink: 1 } },
      ],
    }));

    // Total base = 600, need to shrink by 300
    // Item 0 scaled factor: 1 * 200 = 200, ratio = 200/600 = 1/3
    // Item 1 scaled factor: 1 * 400 = 400, ratio = 400/600 = 2/3
    expect(result.children[0]!.width).toBe(100);
    expect(result.children[1]!.width).toBe(200);
  });

  it('respects flex-shrink: 0', () => {
    const result = computeLayout({
      style: { width: 200, height: 50 },
      children: [
        { style: { flexBasis: 150, flexShrink: 0 } },
        { style: { flexBasis: 150, flexShrink: 1 } },
      ],
    });

    expect(result.children[0]!.width).toBe(150);
    expect(result.children[1]!.width).toBe(50);
  });
});

// ==========================================================================
// flex-basis
// ==========================================================================

describe('flex-basis', () => {
  it('flex-basis sets the initial main size', () => {
    const result = computeLayout({
      style: { width: 500, height: 50 },
      children: [
        { style: { flexBasis: 100 } },
        { style: { flexBasis: 200 } },
      ],
    });

    expect(result.children[0]!.width).toBe(100);
    expect(result.children[1]!.width).toBe(200);
  });

  it('flex-basis: auto falls back to width', () => {
    const result = computeLayout({
      style: { width: 500, height: 50 },
      children: [
        { style: { width: 120 } },
      ],
    });

    expect(result.children[0]!.width).toBe(120);
  });
});

// ==========================================================================
// justify-content
// ==========================================================================

describe('justify-content', () => {
  const makeTree = (justify: FlexNode['style'] extends infer S ? NonNullable<S>['justifyContent'] : never): FlexNode => ({
    style: { width: 300, height: 50, justifyContent: justify },
    children: [
      { style: { width: 50, height: 50 } },
      { style: { width: 50, height: 50 } },
    ],
  });

  it('flex-start packs items at the start', () => {
    const result = computeLayout(makeTree('flex-start'));
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[1]!.x).toBe(50);
  });

  it('flex-end packs items at the end', () => {
    const result = computeLayout(makeTree('flex-end'));
    expect(result.children[0]!.x).toBe(200);
    expect(result.children[1]!.x).toBe(250);
  });

  it('center centers items', () => {
    const result = computeLayout(makeTree('center'));
    expect(result.children[0]!.x).toBe(100);
    expect(result.children[1]!.x).toBe(150);
  });

  it('space-between puts space between items', () => {
    const result = computeLayout(makeTree('space-between'));
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[1]!.x).toBe(250);
  });

  it('space-around puts equal space around items', () => {
    const result = computeLayout(makeTree('space-around'));
    // 200px free space, 2 items → 100px per item
    // First item: 50px offset, then item, then 50px
    expect(result.children[0]!.x).toBe(50);
    expect(result.children[1]!.x).toBe(200);
  });

  it('space-evenly distributes space evenly', () => {
    const result = round(computeLayout(makeTree('space-evenly')));
    // 200px free space, 3 slots → 66.67px each
    expect(result.children[0]!.x).toBeCloseTo(66.67, 1);
    expect(result.children[1]!.x).toBeCloseTo(183.33, 1);
  });
});

// ==========================================================================
// align-items
// ==========================================================================

describe('align-items', () => {
  it('stretch makes items fill the cross axis', () => {
    const result = computeLayout({
      style: { width: 300, height: 100, alignItems: 'stretch' },
      children: [
        { style: { width: 50 } },
      ],
    });

    expect(result.children[0]!.height).toBe(100);
  });

  it('flex-start aligns to the start of the cross axis', () => {
    const result = computeLayout({
      style: { width: 300, height: 100, alignItems: 'flex-start' },
      children: [
        { style: { width: 50, height: 30 } },
      ],
    });

    expect(result.children[0]!.y).toBe(0);
  });

  it('flex-end aligns to the end of the cross axis', () => {
    const result = computeLayout({
      style: { width: 300, height: 100, alignItems: 'flex-end' },
      children: [
        { style: { width: 50, height: 30 } },
      ],
    });

    expect(result.children[0]!.y).toBe(70);
  });

  it('center centers items on the cross axis', () => {
    const result = computeLayout({
      style: { width: 300, height: 100, alignItems: 'center' },
      children: [
        { style: { width: 50, height: 30 } },
      ],
    });

    expect(result.children[0]!.y).toBe(35);
  });
});

// ==========================================================================
// flex-direction: column
// ==========================================================================

describe('flex-direction: column', () => {
  it('lays out children vertically', () => {
    const result = computeLayout({
      style: { width: 100, height: 300, flexDirection: 'column' },
      children: [
        { style: { height: 50 } },
        { style: { height: 50 } },
        { style: { height: 50 } },
      ],
    });

    expect(result.children[0]!.y).toBe(0);
    expect(result.children[1]!.y).toBe(50);
    expect(result.children[2]!.y).toBe(100);
  });

  it('flex-grow works in column direction', () => {
    const result = computeLayout({
      style: { width: 100, height: 300, flexDirection: 'column' },
      children: [
        { style: { flexGrow: 1 } },
        { style: { flexGrow: 2 } },
      ],
    });

    expect(result.children[0]!.height).toBe(100);
    expect(result.children[1]!.height).toBe(200);
  });

  it('justify-content center works vertically', () => {
    const result = computeLayout({
      style: { width: 100, height: 300, flexDirection: 'column', justifyContent: 'center' },
      children: [
        { style: { height: 50 } },
      ],
    });

    expect(result.children[0]!.y).toBe(125);
  });

  it('stretch fills the main axis width in column mode', () => {
    const result = computeLayout({
      style: { width: 200, height: 300, flexDirection: 'column', alignItems: 'stretch' },
      children: [
        { style: { height: 50 } },
      ],
    });

    expect(result.children[0]!.width).toBe(200);
  });
});

// ==========================================================================
// Padding and border
// ==========================================================================

describe('padding', () => {
  it('offsets children by padding', () => {
    const result = computeLayout({
      style: { width: 200, height: 100, padding: 10 },
      children: [
        { style: { width: 50, height: 50 } },
      ],
    });

    expect(result.children[0]!.x).toBe(10);
    expect(result.children[0]!.y).toBe(10);
  });

  it('reduces available space for children (border-box)', () => {
    const result = computeLayout({
      style: { width: 200, height: 100, padding: 20, boxSizing: 'border-box' },
      children: [
        { style: { flexGrow: 1 } },
      ],
    });

    // border-box: content area = 200 - 40 = 160
    expect(result.children[0]!.width).toBe(160);
  });

  it('content-box children fill the content area', () => {
    const result = computeLayout({
      style: { width: 200, height: 100, padding: 20 },
      children: [
        { style: { flexGrow: 1 } },
      ],
    });

    // content-box: width 200 IS the content area, children fill it
    expect(result.children[0]!.width).toBe(200);
  });
});

describe('border', () => {
  it('offsets children by border', () => {
    const result = computeLayout({
      style: { width: 200, height: 100, border: 5 },
      children: [
        { style: { width: 50, height: 50 } },
      ],
    });

    expect(result.children[0]!.x).toBe(5);
    expect(result.children[0]!.y).toBe(5);
  });
});

// ==========================================================================
// gap
// ==========================================================================

describe('gap', () => {
  it('adds space between items', () => {
    const result = computeLayout({
      style: { width: 300, height: 50, gap: 10 },
      children: [
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50 } },
      ],
    });

    expect(result.children[0]!.x).toBe(0);
    expect(result.children[1]!.x).toBe(60);
    expect(result.children[2]!.x).toBe(120);
  });

  it('gap reduces available space for flex-grow', () => {
    const result = computeLayout({
      style: { width: 300, height: 50, gap: 20 },
      children: [
        { style: { flexGrow: 1 } },
        { style: { flexGrow: 1 } },
      ],
    });

    // Available = 300, gap = 20, each item = (300 - 20) / 2 = 140
    expect(result.children[0]!.width).toBe(140);
    expect(result.children[1]!.width).toBe(140);
  });
});

// ==========================================================================
// flex-wrap
// ==========================================================================

describe('flex-wrap', () => {
  it('wraps items to the next line', () => {
    const result = computeLayout({
      style: { width: 200, height: 200, flexWrap: 'wrap', alignContent: 'flex-start' },
      children: [
        { style: { width: 120, height: 50 } },
        { style: { width: 120, height: 50 } },
      ],
    });

    expect(result.children[0]!.y).toBe(0);
    expect(result.children[1]!.y).toBe(50);
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[1]!.x).toBe(0);
  });

  it('multiple items per line', () => {
    const result = computeLayout({
      style: { width: 200, height: 200, flexWrap: 'wrap', alignContent: 'flex-start' },
      children: [
        { style: { width: 80, height: 40 } },
        { style: { width: 80, height: 40 } },
        { style: { width: 80, height: 40 } },
      ],
    });

    // Line 1: items 0, 1 (80+80=160 < 200)
    // Line 2: item 2
    expect(result.children[0]!.y).toBe(0);
    expect(result.children[1]!.y).toBe(0);
    expect(result.children[2]!.y).toBe(40);
  });

  it('align-content: stretch distributes extra cross space to lines', () => {
    const result = computeLayout({
      style: { width: 200, height: 200, flexWrap: 'wrap' },
      children: [
        { style: { width: 120, height: 50 } },
        { style: { width: 120, height: 50 } },
      ],
    });

    // Default alignContent is stretch. 2 lines of 50px = 100 used.
    // 100px free space split equally: each line becomes 100.
    // Line 2 starts at y=100.
    expect(result.children[0]!.y).toBe(0);
    expect(result.children[1]!.y).toBe(100);
  });
});

// ==========================================================================
// display: none
// ==========================================================================

describe('display: none', () => {
  it('skips display:none items', () => {
    const result = computeLayout({
      style: { width: 300, height: 50 },
      children: [
        { style: { width: 100, height: 50 } },
        { style: { width: 100, height: 50, display: 'none' } },
        { style: { width: 100, height: 50 } },
      ],
    });

    // Only 2 visible items
    expect(result.children).toHaveLength(2);
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[1]!.x).toBe(100);
  });
});

// ==========================================================================
// min/max constraints
// ==========================================================================

describe('min/max constraints', () => {
  it('respects minWidth during flex shrink', () => {
    const result = computeLayout({
      style: { width: 200, height: 50 },
      children: [
        { style: { flexBasis: 200, flexShrink: 1, minWidth: 150 } },
        { style: { flexBasis: 200, flexShrink: 1 } },
      ],
    });

    // Item 0 can only shrink to 150, item 1 takes the rest
    expect(result.children[0]!.width).toBe(150);
    expect(result.children[1]!.width).toBe(50);
  });

  it('respects maxWidth during flex grow', () => {
    const result = computeLayout({
      style: { width: 400, height: 50 },
      children: [
        { style: { flexGrow: 1, maxWidth: 100 } },
        { style: { flexGrow: 1 } },
      ],
    });

    // Item 0 capped at 100, item 1 gets the rest (300)
    expect(result.children[0]!.width).toBe(100);
    expect(result.children[1]!.width).toBe(300);
  });
});

// ==========================================================================
// measure function
// ==========================================================================

describe('measure function', () => {
  it('uses measure function for leaf node sizing', () => {
    const result = computeLayout({
      style: { width: 300, height: 100 },
      children: [
        {
          measure: () => ({ width: 80, height: 20 }),
        },
        { style: { flexGrow: 1 } },
      ],
    });

    expect(result.children[0]!.width).toBe(80);
    expect(result.children[1]!.width).toBe(220);
  });
});

// ==========================================================================
// Nested flex containers
// ==========================================================================

describe('nested flex containers', () => {
  it('handles a basic nested layout', () => {
    const result = computeLayout({
      style: { width: 400, height: 200 },
      children: [
        {
          style: { flexGrow: 1, flexDirection: 'column' },
          children: [
            { style: { height: 50 } },
            { style: { flexGrow: 1 } },
          ],
        },
        { style: { width: 100 } },
      ],
    });

    // Outer: 400 wide. Item 0 grows to 300, item 1 is 100
    expect(result.children[0]!.width).toBe(300);
    expect(result.children[1]!.width).toBe(100);

    // Inner column: 300 wide, 200 tall
    const inner = result.children[0]!;
    expect(inner.children).toHaveLength(2);
  });
});

// ==========================================================================
// Percentage sizes
// ==========================================================================

describe('percentage sizes', () => {
  it('resolves percentage width against parent', () => {
    const result = computeLayout({
      style: { width: 400, height: 100 },
      children: [
        { style: { width: '50%', height: 50 } },
      ],
    });

    expect(result.children[0]!.width).toBe(200);
  });
});

// ==========================================================================
// auto margins
// ==========================================================================

describe('auto margins', () => {
  it('margin auto on main axis pushes item to the end', () => {
    const result = computeLayout({
      style: { width: 300, height: 50 },
      children: [
        { style: { width: 50, height: 50, marginLeft: 'auto' } },
      ],
    });

    expect(result.children[0]!.x).toBe(250);
  });

  it('margin auto on both sides centers the item', () => {
    const result = computeLayout({
      style: { width: 300, height: 50 },
      children: [
        { style: { width: 50, height: 50, marginLeft: 'auto', marginRight: 'auto' } },
      ],
    });

    expect(result.children[0]!.x).toBe(125);
  });
});
