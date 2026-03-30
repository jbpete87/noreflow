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

    // All 3 children present in DOM order; hidden one collapses to zero
    expect(result.children).toHaveLength(3);
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[0]!.width).toBe(100);

    expect(result.children[1]!.width).toBe(0);
    expect(result.children[1]!.height).toBe(0);

    expect(result.children[2]!.x).toBe(100);
    expect(result.children[2]!.width).toBe(100);
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

// ==========================================================================
// position: absolute
// ==========================================================================

describe('position: absolute', () => {
  it('removes absolute children from the flex flow', () => {
    const result = computeLayout({
      style: { width: 300, height: 200 },
      children: [
        { style: { width: 50, height: 50 } },
        { style: { width: 80, height: 80, position: 'absolute', top: 10, left: 10 } },
        { style: { width: 50, height: 50 } },
      ],
    });

    expect(result.children).toHaveLength(3);

    // Flow children are placed as if the absolute child doesn't exist
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[0]!.width).toBe(50);
    expect(result.children[2]!.x).toBe(50);
    expect(result.children[2]!.width).toBe(50);

    // Absolute child is positioned via insets
    expect(result.children[1]!.x).toBe(10);
    expect(result.children[1]!.y).toBe(10);
    expect(result.children[1]!.width).toBe(80);
    expect(result.children[1]!.height).toBe(80);
  });

  it('positions with top/left insets', () => {
    const result = computeLayout({
      style: { width: 200, height: 200 },
      children: [
        { style: { width: 40, height: 40, position: 'absolute', top: 20, left: 30 } },
      ],
    });

    expect(result.children[0]!.x).toBe(30);
    expect(result.children[0]!.y).toBe(20);
  });

  it('positions with bottom/right insets', () => {
    const result = computeLayout({
      style: { width: 200, height: 200 },
      children: [
        { style: { width: 40, height: 40, position: 'absolute', bottom: 10, right: 20 } },
      ],
    });

    expect(result.children[0]!.x).toBe(200 - 20 - 40);
    expect(result.children[0]!.y).toBe(200 - 10 - 40);
  });

  it('derives width from left+right when width is auto', () => {
    const result = computeLayout({
      style: { width: 300, height: 200 },
      children: [
        { style: { height: 50, position: 'absolute', top: 0, left: 20, right: 30 } },
      ],
    });

    expect(result.children[0]!.x).toBe(20);
    expect(result.children[0]!.width).toBe(300 - 20 - 30);
    expect(result.children[0]!.height).toBe(50);
  });

  it('derives height from top+bottom when height is auto', () => {
    const result = computeLayout({
      style: { width: 200, height: 300 },
      children: [
        { style: { width: 50, position: 'absolute', top: 10, bottom: 20, left: 0 } },
      ],
    });

    expect(result.children[0]!.y).toBe(10);
    expect(result.children[0]!.height).toBe(300 - 10 - 20);
  });

  it('handles percentage insets', () => {
    const result = computeLayout({
      style: { width: 400, height: 200 },
      children: [
        { style: { width: 50, height: 50, position: 'absolute', top: '10%', left: '25%' } },
      ],
    });

    expect(result.children[0]!.x).toBe(100);
    expect(result.children[0]!.y).toBe(20);
  });

  it('defaults to top-left when no insets specified', () => {
    const result = computeLayout({
      style: { width: 200, height: 200 },
      children: [
        { style: { width: 50, height: 50, position: 'absolute' } },
      ],
    });

    expect(result.children[0]!.x).toBe(0);
    expect(result.children[0]!.y).toBe(0);
  });

  it('positions relative to padding box when container has padding', () => {
    const result = computeLayout({
      style: { width: 200, height: 200, padding: 20, boxSizing: 'border-box' },
      children: [
        { style: { width: 40, height: 40, position: 'absolute', top: 0, left: 0 } },
      ],
    });

    // Containing block is the padding box; insets measured from padding edge
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[0]!.y).toBe(0);
  });

  it('respects min/max constraints on absolute children', () => {
    const result = computeLayout({
      style: { width: 300, height: 300 },
      children: [
        {
          style: {
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 50,
            minWidth: 200,
            maxWidth: 250,
          },
        },
      ],
    });

    expect(result.children[0]!.width).toBe(250);
  });

  it('preserves DOM order in output with mixed flow and absolute', () => {
    const result = computeLayout({
      style: { width: 200, height: 200, flexDirection: 'column' },
      children: [
        { style: { width: 30, height: 30 } },
        { style: { width: 40, height: 40, position: 'absolute', top: 100, left: 100 } },
        { style: { width: 50, height: 50 } },
        { style: { width: 60, height: 60, position: 'absolute', bottom: 0, right: 0 } },
        { style: { width: 70, height: 70 } },
      ],
    });

    expect(result.children).toHaveLength(5);

    // Flow items placed sequentially (column)
    expect(result.children[0]!.width).toBe(30);
    expect(result.children[0]!.y).toBe(0);
    expect(result.children[2]!.width).toBe(50);
    expect(result.children[2]!.y).toBe(30);
    expect(result.children[4]!.width).toBe(70);
    expect(result.children[4]!.y).toBe(80);

    // Absolute children
    expect(result.children[1]!.x).toBe(100);
    expect(result.children[1]!.y).toBe(100);
    expect(result.children[3]!.x).toBe(200 - 60);
    expect(result.children[3]!.y).toBe(200 - 60);
  });

  it('lays out nested children of absolute items', () => {
    const result = computeLayout({
      style: { width: 300, height: 300 },
      children: [
        {
          style: { width: 100, height: 100, position: 'absolute', top: 10, left: 10 },
          children: [
            { style: { width: 40, height: 40 } },
            { style: { width: 40, height: 40 } },
          ],
        },
      ],
    });

    const absChild = result.children[0]!;
    expect(absChild.x).toBe(10);
    expect(absChild.y).toBe(10);
    expect(absChild.children).toHaveLength(2);
    expect(absChild.children[0]!.x).toBe(0);
    expect(absChild.children[1]!.x).toBe(40);
  });
});

// ==========================================================================
// position: relative
// ==========================================================================

describe('position: relative', () => {
  it('offsets item from its normal flow position with top/left', () => {
    const result = computeLayout({
      style: { width: 300, height: 100 },
      children: [
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50, position: 'relative', top: 10, left: 20 } },
        { style: { width: 50, height: 50 } },
      ],
    });

    // Normal flow positions: x=0, x=50, x=100
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[0]!.y).toBe(0);

    // Relative: offset from normal position
    expect(result.children[1]!.x).toBe(50 + 20);
    expect(result.children[1]!.y).toBe(0 + 10);

    // Third item unaffected by relative offset
    expect(result.children[2]!.x).toBe(100);
    expect(result.children[2]!.y).toBe(0);
  });

  it('offsets item with bottom/right (opposite of top/left)', () => {
    const result = computeLayout({
      style: { width: 300, height: 100 },
      children: [
        { style: { width: 50, height: 50, position: 'relative', bottom: 15, right: 25 } },
      ],
    });

    expect(result.children[0]!.x).toBe(0 - 25);
    expect(result.children[0]!.y).toBe(0 - 15);
  });

  it('top takes precedence over bottom', () => {
    const result = computeLayout({
      style: { width: 200, height: 200 },
      children: [
        { style: { width: 50, height: 50, position: 'relative', top: 10, bottom: 999 } },
      ],
    });

    expect(result.children[0]!.y).toBe(10);
  });

  it('left takes precedence over right', () => {
    const result = computeLayout({
      style: { width: 200, height: 200 },
      children: [
        { style: { width: 50, height: 50, position: 'relative', left: 30, right: 999 } },
      ],
    });

    expect(result.children[0]!.x).toBe(30);
  });

  it('does not affect sibling positions', () => {
    const result = computeLayout({
      style: { width: 300, height: 100 },
      children: [
        { style: { width: 80, height: 50, position: 'relative', left: 200 } },
        { style: { width: 80, height: 50 } },
      ],
    });

    // Second item is at x=80 (as if the first item had no offset)
    expect(result.children[1]!.x).toBe(80);
  });

  it('handles percentage insets for relative positioning', () => {
    const result = computeLayout({
      style: { width: 400, height: 200 },
      children: [
        { style: { width: 50, height: 50, position: 'relative', top: '10%', left: '25%' } },
      ],
    });

    expect(result.children[0]!.x).toBe(100);
    expect(result.children[0]!.y).toBe(20);
  });
});

// ==========================================================================
// aspectRatio
// ==========================================================================

describe('aspectRatio', () => {
  it('derives height from width (row direction)', () => {
    const result = computeLayout({
      style: { width: 400, height: 300 },
      children: [
        { style: { width: 200, aspectRatio: 2 } },
      ],
    });

    // width=200, ratio=2 (w:h) → height = 200 / 2 = 100
    expect(result.children[0]!.width).toBe(200);
    expect(result.children[0]!.height).toBe(100);
  });

  it('derives width from height in column direction', () => {
    const result = computeLayout({
      style: { width: 400, height: 400, flexDirection: 'column' },
      children: [
        { style: { height: 100, aspectRatio: 2 } },
      ],
    });

    // In column: main=height, cross=width
    // height=100, ratio=2 → width = 100 * 2 = 200
    expect(result.children[0]!.height).toBe(100);
    expect(result.children[0]!.width).toBe(200);
  });

  it('square aspect ratio', () => {
    const result = computeLayout({
      style: { width: 400, height: 400 },
      children: [
        { style: { width: 150, aspectRatio: 1 } },
      ],
    });

    expect(result.children[0]!.width).toBe(150);
    expect(result.children[0]!.height).toBe(150);
  });

  it('16:9 aspect ratio', () => {
    const result = computeLayout({
      style: { width: 400, height: 400 },
      children: [
        { style: { width: 320, aspectRatio: 16 / 9 } },
      ],
    });

    expect(result.children[0]!.width).toBe(320);
    expect(result.children[0]!.height).toBe(180);
  });

  it('derives main size from cross size when main is auto (row)', () => {
    const result = computeLayout({
      style: { width: 400, height: 200 },
      children: [
        { style: { height: 100, aspectRatio: 2 } },
      ],
    });

    // main=width=auto, cross=height=100, ratio=2 → width = 100 * 2 = 200
    expect(result.children[0]!.width).toBe(200);
    expect(result.children[0]!.height).toBe(100);
  });

  it('works with flex-grow', () => {
    const result = computeLayout({
      style: { width: 400, height: 300 },
      children: [
        { style: { flexGrow: 1, aspectRatio: 2 } },
      ],
    });

    // flex-grow fills main axis (width=400), then ratio derives height
    expect(result.children[0]!.width).toBe(400);
    expect(result.children[0]!.height).toBe(200);
  });

  it('works with absolute positioning', () => {
    const result = computeLayout({
      style: { width: 400, height: 400 },
      children: [
        { style: { width: 200, aspectRatio: 2, position: 'absolute', top: 10, left: 10 } },
      ],
    });

    expect(result.children[0]!.x).toBe(10);
    expect(result.children[0]!.y).toBe(10);
    expect(result.children[0]!.width).toBe(200);
    expect(result.children[0]!.height).toBe(100);
  });

  it('absolute child: derives width from height + aspect ratio', () => {
    const result = computeLayout({
      style: { width: 400, height: 400 },
      children: [
        { style: { height: 100, aspectRatio: 2, position: 'absolute', top: 0, left: 0 } },
      ],
    });

    expect(result.children[0]!.width).toBe(200);
    expect(result.children[0]!.height).toBe(100);
  });

  it('respects min/max constraints after ratio computation', () => {
    const result = computeLayout({
      style: { width: 400, height: 400 },
      children: [
        { style: { width: 200, aspectRatio: 2, maxHeight: 80 } },
      ],
    });

    // ratio would give height=100, but maxHeight=80 clamps it
    expect(result.children[0]!.width).toBe(200);
    expect(result.children[0]!.height).toBe(80);
  });

  it('multiple items with different ratios', () => {
    const result = computeLayout({
      style: { width: 400, height: 300, alignItems: 'flex-start' },
      children: [
        { style: { width: 100, aspectRatio: 1 } },
        { style: { width: 100, aspectRatio: 2 } },
        { style: { width: 100, aspectRatio: 0.5 } },
      ],
    });

    expect(result.children[0]!.width).toBe(100);
    expect(result.children[0]!.height).toBe(100);

    expect(result.children[1]!.width).toBe(100);
    expect(result.children[1]!.height).toBe(50);

    expect(result.children[2]!.width).toBe(100);
    expect(result.children[2]!.height).toBe(200);
  });
});

// ==========================================================================
// CSS Grid
// ==========================================================================

describe('CSS Grid', () => {
  it('basic 2-column grid with fixed tracks', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 200,
        height: 200,
        gridTemplateColumns: [100, 100],
        gridTemplateRows: [50, 50],
      },
      children: [
        { style: { } },
        { style: { } },
        { style: { } },
        { style: { } },
      ],
    });

    expect(result.width).toBe(200);
    expect(result.height).toBe(200);

    // Row 0, Col 0
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[0]!.y).toBe(0);
    expect(result.children[0]!.width).toBe(100);
    expect(result.children[0]!.height).toBe(50);

    // Row 0, Col 1
    expect(result.children[1]!.x).toBe(100);
    expect(result.children[1]!.y).toBe(0);

    // Row 1, Col 0
    expect(result.children[2]!.x).toBe(0);
    expect(result.children[2]!.y).toBe(50);

    // Row 1, Col 1
    expect(result.children[3]!.x).toBe(100);
    expect(result.children[3]!.y).toBe(50);
  });

  it('fr units distribute remaining space', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 300,
        height: 100,
        gridTemplateColumns: ['1fr', '2fr'],
        gridTemplateRows: [100],
      },
      children: [
        { style: {} },
        { style: {} },
      ],
    });

    // 1fr = 100, 2fr = 200
    expect(result.children[0]!.width).toBe(100);
    expect(result.children[1]!.width).toBe(200);
    expect(result.children[1]!.x).toBe(100);
  });

  it('mixed px and fr tracks', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 400,
        height: 100,
        gridTemplateColumns: [100, '1fr', '1fr'],
        gridTemplateRows: [100],
      },
      children: [
        { style: {} },
        { style: {} },
        { style: {} },
      ],
    });

    // 100px fixed, then 150px each for the two 1fr tracks
    expect(result.children[0]!.width).toBe(100);
    expect(result.children[1]!.x).toBe(100);
    expect(result.children[1]!.width).toBe(150);
    expect(result.children[2]!.x).toBe(250);
    expect(result.children[2]!.width).toBe(150);
  });

  it('percentage tracks', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 400,
        height: 100,
        gridTemplateColumns: ['25%', '75%'],
        gridTemplateRows: [100],
      },
      children: [
        { style: {} },
        { style: {} },
      ],
    });

    expect(result.children[0]!.width).toBe(100);
    expect(result.children[1]!.width).toBe(300);
  });

  it('gap between tracks', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 220,
        height: 100,
        gridTemplateColumns: [100, 100],
        gridTemplateRows: [100],
        columnGap: 20,
      },
      children: [
        { style: {} },
        { style: {} },
      ],
    });

    expect(result.children[0]!.x).toBe(0);
    expect(result.children[0]!.width).toBe(100);
    expect(result.children[1]!.x).toBe(120);
    expect(result.children[1]!.width).toBe(100);
  });

  it('row and column gaps', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 220,
        height: 120,
        gridTemplateColumns: [100, 100],
        gridTemplateRows: [50, 50],
        columnGap: 20,
        rowGap: 20,
      },
      children: [
        { style: {} },
        { style: {} },
        { style: {} },
        { style: {} },
      ],
    });

    // (0,0)
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[0]!.y).toBe(0);
    // (0,1)
    expect(result.children[1]!.x).toBe(120);
    expect(result.children[1]!.y).toBe(0);
    // (1,0)
    expect(result.children[2]!.x).toBe(0);
    expect(result.children[2]!.y).toBe(70);
    // (1,1)
    expect(result.children[3]!.x).toBe(120);
    expect(result.children[3]!.y).toBe(70);
  });

  it('explicit item placement with grid-column/row', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 200,
        height: 200,
        gridTemplateColumns: [100, 100],
        gridTemplateRows: [100, 100],
      },
      children: [
        { style: { gridColumnStart: 2, gridRowStart: 2 } },
        { style: {} },
      ],
    });

    // First child placed at col 1, row 1 (0-indexed)
    expect(result.children[0]!.x).toBe(100);
    expect(result.children[0]!.y).toBe(100);

    // Second child auto-placed at first available cell (0,0)
    expect(result.children[1]!.x).toBe(0);
    expect(result.children[1]!.y).toBe(0);
  });

  it('item spanning multiple columns', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 300,
        height: 100,
        gridTemplateColumns: [100, 100, 100],
        gridTemplateRows: [100],
      },
      children: [
        { style: { gridColumnStart: 1, gridColumnEnd: 3 } },
        { style: {} },
      ],
    });

    // First child spans columns 0 and 1 (200px wide)
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[0]!.width).toBe(200);

    // Second auto-placed into col 2
    expect(result.children[1]!.x).toBe(200);
  });

  it('auto-placement fills rows by default', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 300,
        height: 200,
        gridTemplateColumns: [100, 100, 100],
        gridTemplateRows: [100, 100],
      },
      children: [
        { style: {} },
        { style: {} },
        { style: {} },
        { style: {} },
        { style: {} },
      ],
    });

    // Should fill row-by-row: (0,0) (0,1) (0,2) (1,0) (1,1)
    expect(result.children[0]!.x).toBe(0);
    expect(result.children[0]!.y).toBe(0);
    expect(result.children[1]!.x).toBe(100);
    expect(result.children[1]!.y).toBe(0);
    expect(result.children[2]!.x).toBe(200);
    expect(result.children[2]!.y).toBe(0);
    expect(result.children[3]!.x).toBe(0);
    expect(result.children[3]!.y).toBe(100);
    expect(result.children[4]!.x).toBe(100);
    expect(result.children[4]!.y).toBe(100);
  });

  it('items with explicit width/height inside grid cells', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 200,
        height: 200,
        gridTemplateColumns: [200],
        gridTemplateRows: [200],
        justifyItems: 'start',
        alignItems: 'flex-start',
      },
      children: [
        { style: { width: 50, height: 50 } },
      ],
    });

    expect(result.children[0]!.width).toBe(50);
    expect(result.children[0]!.height).toBe(50);
  });

  it('justify-items: center', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 200,
        height: 100,
        gridTemplateColumns: [200],
        gridTemplateRows: [100],
        justifyItems: 'center',
        alignItems: 'flex-start',
      },
      children: [
        { style: { width: 50, height: 50 } },
      ],
    });

    expect(result.children[0]!.x).toBe(75);
    expect(result.children[0]!.width).toBe(50);
  });

  it('align-items: center', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 200,
        height: 200,
        gridTemplateColumns: [200],
        gridTemplateRows: [200],
        justifyItems: 'start',
        alignItems: 'center',
      },
      children: [
        { style: { width: 50, height: 50 } },
      ],
    });

    expect(result.children[0]!.y).toBe(75);
    expect(result.children[0]!.height).toBe(50);
  });

  it('auto rows for implicit tracks', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 200,
        height: 300,
        gridTemplateColumns: [200],
        gridTemplateRows: [100],
        gridAutoRows: 50,
      },
      children: [
        { style: {} },
        { style: {} },
        { style: {} },
      ],
    });

    // First child in explicit row (100px)
    expect(result.children[0]!.height).toBe(100);
    // Second and third in implicit rows (50px each)
    expect(result.children[1]!.y).toBe(100);
    expect(result.children[1]!.height).toBe(50);
    expect(result.children[2]!.y).toBe(150);
    expect(result.children[2]!.height).toBe(50);
  });

  it('padding on grid container', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 220,
        height: 120,
        padding: 10,
        gridTemplateColumns: [100, 100],
        gridTemplateRows: [100],
      },
      children: [
        { style: {} },
        { style: {} },
      ],
    });

    expect(result.children[0]!.x).toBe(10);
    expect(result.children[0]!.y).toBe(10);
    expect(result.children[1]!.x).toBe(110);
  });

  it('nested flex inside grid cell', () => {
    const result = computeLayout({
      style: {
        display: 'grid',
        width: 300,
        height: 100,
        gridTemplateColumns: [300],
        gridTemplateRows: [100],
      },
      children: [
        {
          style: { justifyContent: 'center', alignItems: 'center' },
          children: [
            { style: { width: 50, height: 50 } },
          ],
        },
      ],
    });

    const gridChild = result.children[0]!;
    expect(gridChild.width).toBe(300);
    expect(gridChild.height).toBe(100);
    expect(gridChild.children[0]!.x).toBe(125);
    expect(gridChild.children[0]!.y).toBe(25);
  });
});
