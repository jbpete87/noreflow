import type { FlexNode } from '../../src/types.js';

/**
 * Each fixture is a named test case: a FlexNode tree that we'll render
 * in both Preflow and a real browser, then compare the results.
 */
export interface Fixture {
  name: string;
  node: FlexNode;
  availableWidth?: number;
  availableHeight?: number;
}

export const fixtures: Fixture[] = [
  // -----------------------------------------------------------------------
  // Basic flex-grow
  // -----------------------------------------------------------------------
  {
    name: 'flex-grow: equal distribution',
    node: {
      style: { width: 300, height: 50 },
      children: [
        { style: { flexGrow: 1 } },
        { style: { flexGrow: 1 } },
        { style: { flexGrow: 1 } },
      ],
    },
  },
  {
    name: 'flex-grow: proportional (1:3)',
    node: {
      style: { width: 400, height: 50 },
      children: [
        { style: { flexGrow: 1 } },
        { style: { flexGrow: 3 } },
      ],
    },
  },
  {
    name: 'flex-grow from flex-basis',
    node: {
      style: { width: 500, height: 50 },
      children: [
        { style: { flexBasis: 100, flexGrow: 1 } },
        { style: { flexBasis: 200, flexGrow: 1 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // Flex-shrink
  // -----------------------------------------------------------------------
  {
    name: 'flex-shrink: equal',
    node: {
      style: { width: 200, height: 50 },
      children: [
        { style: { flexBasis: 200, flexShrink: 1 } },
        { style: { flexBasis: 200, flexShrink: 1 } },
      ],
    },
  },
  {
    name: 'flex-shrink: weighted by base size',
    node: {
      style: { width: 300, height: 50 },
      children: [
        { style: { flexBasis: 200, flexShrink: 1 } },
        { style: { flexBasis: 400, flexShrink: 1 } },
      ],
    },
  },
  {
    name: 'flex-shrink: 0 prevents shrinking',
    node: {
      style: { width: 200, height: 50 },
      children: [
        { style: { flexBasis: 150, flexShrink: 0 } },
        { style: { flexBasis: 150, flexShrink: 1 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // justify-content
  // -----------------------------------------------------------------------
  {
    name: 'justify-content: flex-start',
    node: {
      style: { width: 300, height: 50, justifyContent: 'flex-start' },
      children: [
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50 } },
      ],
    },
  },
  {
    name: 'justify-content: flex-end',
    node: {
      style: { width: 300, height: 50, justifyContent: 'flex-end' },
      children: [
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50 } },
      ],
    },
  },
  {
    name: 'justify-content: center',
    node: {
      style: { width: 300, height: 50, justifyContent: 'center' },
      children: [
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50 } },
      ],
    },
  },
  {
    name: 'justify-content: space-between',
    node: {
      style: { width: 300, height: 50, justifyContent: 'space-between' },
      children: [
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50 } },
      ],
    },
  },
  {
    name: 'justify-content: space-around',
    node: {
      style: { width: 300, height: 50, justifyContent: 'space-around' },
      children: [
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50 } },
      ],
    },
  },
  {
    name: 'justify-content: space-evenly',
    node: {
      style: { width: 300, height: 50, justifyContent: 'space-evenly' },
      children: [
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // align-items
  // -----------------------------------------------------------------------
  {
    name: 'align-items: stretch',
    node: {
      style: { width: 300, height: 100, alignItems: 'stretch' },
      children: [
        { style: { width: 50 } },
      ],
    },
  },
  {
    name: 'align-items: flex-start',
    node: {
      style: { width: 300, height: 100, alignItems: 'flex-start' },
      children: [
        { style: { width: 50, height: 30 } },
      ],
    },
  },
  {
    name: 'align-items: flex-end',
    node: {
      style: { width: 300, height: 100, alignItems: 'flex-end' },
      children: [
        { style: { width: 50, height: 30 } },
      ],
    },
  },
  {
    name: 'align-items: center',
    node: {
      style: { width: 300, height: 100, alignItems: 'center' },
      children: [
        { style: { width: 50, height: 30 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // flex-direction: column
  // -----------------------------------------------------------------------
  {
    name: 'column: basic vertical layout',
    node: {
      style: { width: 100, height: 300, flexDirection: 'column' },
      children: [
        { style: { height: 50 } },
        { style: { height: 50 } },
        { style: { height: 50 } },
      ],
    },
  },
  {
    name: 'column: flex-grow',
    node: {
      style: { width: 100, height: 300, flexDirection: 'column' },
      children: [
        { style: { flexGrow: 1 } },
        { style: { flexGrow: 2 } },
      ],
    },
  },
  {
    name: 'column: justify-content center',
    node: {
      style: { width: 100, height: 300, flexDirection: 'column', justifyContent: 'center' },
      children: [
        { style: { height: 50 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // Padding and border
  // -----------------------------------------------------------------------
  {
    name: 'padding offsets children',
    node: {
      style: { width: 200, height: 100, padding: 10 },
      children: [
        { style: { width: 50, height: 50 } },
      ],
    },
  },
  {
    name: 'border offsets children',
    node: {
      style: { width: 200, height: 100, border: 5 },
      children: [
        { style: { width: 50, height: 50 } },
      ],
    },
  },
  {
    name: 'border-box container',
    node: {
      style: { width: 200, height: 100, padding: 20, boxSizing: 'border-box' },
      children: [
        { style: { flexGrow: 1 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // Gap
  // -----------------------------------------------------------------------
  {
    name: 'gap between items',
    node: {
      style: { width: 300, height: 50, gap: 10 },
      children: [
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50 } },
      ],
    },
  },
  {
    name: 'gap with flex-grow',
    node: {
      style: { width: 300, height: 50, gap: 20 },
      children: [
        { style: { flexGrow: 1 } },
        { style: { flexGrow: 1 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // flex-wrap
  // -----------------------------------------------------------------------
  {
    name: 'wrap: items wrap to next line',
    node: {
      style: { width: 200, height: 200, flexWrap: 'wrap', alignContent: 'flex-start' },
      children: [
        { style: { width: 120, height: 50 } },
        { style: { width: 120, height: 50 } },
      ],
    },
  },
  {
    name: 'wrap: multiple items per line',
    node: {
      style: { width: 200, height: 200, flexWrap: 'wrap', alignContent: 'flex-start' },
      children: [
        { style: { width: 80, height: 40 } },
        { style: { width: 80, height: 40 } },
        { style: { width: 80, height: 40 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // min/max constraints
  // -----------------------------------------------------------------------
  {
    name: 'minWidth prevents shrinking below threshold',
    node: {
      style: { width: 200, height: 50 },
      children: [
        { style: { flexBasis: 200, flexShrink: 1, minWidth: 150 } },
        { style: { flexBasis: 200, flexShrink: 1 } },
      ],
    },
  },
  {
    name: 'maxWidth caps growth',
    node: {
      style: { width: 400, height: 50 },
      children: [
        { style: { flexGrow: 1, maxWidth: 100 } },
        { style: { flexGrow: 1 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // Auto margins
  // -----------------------------------------------------------------------
  {
    name: 'margin-left auto pushes to end',
    node: {
      style: { width: 300, height: 50 },
      children: [
        { style: { width: 50, height: 50, marginLeft: 'auto' } },
      ],
    },
  },
  {
    name: 'margin auto centers horizontally',
    node: {
      style: { width: 300, height: 50 },
      children: [
        { style: { width: 50, height: 50, marginLeft: 'auto', marginRight: 'auto' } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // Percentage sizes
  // -----------------------------------------------------------------------
  {
    name: 'percentage width',
    node: {
      style: { width: 400, height: 100 },
      children: [
        { style: { width: '50%', height: 50 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // Mixed / complex scenarios
  // -----------------------------------------------------------------------
  {
    name: 'mixed: fixed + flex items with gap and padding',
    node: {
      style: { width: 500, height: 80, padding: 10, gap: 8 },
      children: [
        { style: { width: 60, height: 40 } },
        { style: { flexGrow: 1, height: 40 } },
        { style: { flexGrow: 2, height: 40 } },
        { style: { width: 80, height: 40 } },
      ],
    },
  },
  {
    name: 'column with stretch + mixed heights',
    node: {
      style: { width: 200, height: 400, flexDirection: 'column', alignItems: 'stretch' },
      children: [
        { style: { height: 50 } },
        { style: { flexGrow: 1 } },
        { style: { height: 80 } },
      ],
    },
  },
  {
    name: 'wrap with gap and align-content: space-between',
    node: {
      style: {
        width: 300, height: 300,
        flexWrap: 'wrap', gap: 10,
        alignContent: 'space-between',
      },
      children: [
        { style: { width: 140, height: 60 } },
        { style: { width: 140, height: 60 } },
        { style: { width: 140, height: 60 } },
        { style: { width: 140, height: 60 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // position: absolute
  // -----------------------------------------------------------------------
  {
    name: 'absolute: top/left positioning',
    node: {
      style: { width: 300, height: 300, position: 'relative' },
      children: [
        { style: { width: 50, height: 50, position: 'absolute', top: 20, left: 30 } },
      ],
    },
  },
  {
    name: 'absolute: bottom/right positioning',
    node: {
      style: { width: 300, height: 300, position: 'relative' },
      children: [
        { style: { width: 50, height: 50, position: 'absolute', bottom: 10, right: 20 } },
      ],
    },
  },
  {
    name: 'absolute: width from left+right insets',
    node: {
      style: { width: 400, height: 200, position: 'relative' },
      children: [
        { style: { height: 60, position: 'absolute', top: 0, left: 20, right: 30 } },
      ],
    },
  },
  {
    name: 'absolute: height from top+bottom insets',
    node: {
      style: { width: 200, height: 400, position: 'relative' },
      children: [
        { style: { width: 60, position: 'absolute', top: 10, bottom: 20, left: 0 } },
      ],
    },
  },
  {
    name: 'absolute: mixed with flow children',
    node: {
      style: { width: 300, height: 200, position: 'relative' },
      children: [
        { style: { width: 80, height: 50 } },
        { style: { width: 60, height: 60, position: 'absolute', top: 10, right: 10 } },
        { style: { width: 80, height: 50 } },
      ],
    },
  },
  {
    name: 'absolute: percentage insets',
    node: {
      style: { width: 400, height: 200, position: 'relative' },
      children: [
        { style: { width: 50, height: 50, position: 'absolute', top: '10%', left: '25%' } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // position: relative
  // -----------------------------------------------------------------------
  {
    name: 'relative: offset with top/left',
    node: {
      style: { width: 300, height: 100 },
      children: [
        { style: { width: 50, height: 50 } },
        { style: { width: 50, height: 50, position: 'relative', top: 10, left: 20 } },
        { style: { width: 50, height: 50 } },
      ],
    },
  },
  {
    name: 'relative: offset with bottom/right',
    node: {
      style: { width: 300, height: 100 },
      children: [
        { style: { width: 50, height: 50, position: 'relative', bottom: 15, right: 25 } },
      ],
    },
  },

  // -----------------------------------------------------------------------
  // aspectRatio
  // -----------------------------------------------------------------------
  {
    name: 'aspectRatio: width given, height derived (2:1)',
    node: {
      style: { width: 400, height: 300, alignItems: 'flex-start' },
      children: [
        { style: { width: 200, aspectRatio: 2 } },
      ],
    },
  },
  {
    name: 'aspectRatio: square',
    node: {
      style: { width: 400, height: 400, alignItems: 'flex-start' },
      children: [
        { style: { width: 150, aspectRatio: 1 } },
      ],
    },
  },
  {
    name: 'aspectRatio: 16/9',
    node: {
      style: { width: 400, height: 400, alignItems: 'flex-start' },
      children: [
        { style: { width: 320, aspectRatio: 16 / 9 } },
      ],
    },
  },
  {
    name: 'aspectRatio: height given, width derived in row',
    node: {
      style: { width: 400, height: 200, alignItems: 'flex-start' },
      children: [
        { style: { height: 100, aspectRatio: 2 } },
      ],
    },
  },
  {
    name: 'aspectRatio: column direction',
    node: {
      style: { width: 400, height: 400, flexDirection: 'column', alignItems: 'flex-start' },
      children: [
        { style: { height: 100, aspectRatio: 2 } },
      ],
    },
  },
  {
    name: 'aspectRatio: with flex-grow',
    node: {
      style: { width: 400, height: 300, alignItems: 'flex-start' },
      children: [
        { style: { flexGrow: 1, aspectRatio: 2 } },
      ],
    },
  },
  {
    name: 'aspectRatio: absolute positioning',
    node: {
      style: { width: 400, height: 400, position: 'relative' },
      children: [
        { style: { width: 200, aspectRatio: 2, position: 'absolute', top: 10, left: 10 } },
      ],
    },
  },
  {
    name: 'aspectRatio: multiple items with different ratios',
    node: {
      style: { width: 400, height: 300, alignItems: 'flex-start' },
      children: [
        { style: { width: 100, aspectRatio: 1 } },
        { style: { width: 100, aspectRatio: 2 } },
        { style: { width: 100, aspectRatio: 0.5 } },
      ],
    },
  },

  // ======================================================================
  // CSS Grid fixtures
  // ======================================================================

  {
    name: 'grid: basic 2x2 fixed tracks',
    node: {
      style: {
        display: 'grid',
        width: 200,
        height: 200,
        gridTemplateColumns: [100, 100],
        gridTemplateRows: [100, 100],
      },
      children: [
        { style: {} },
        { style: {} },
        { style: {} },
        { style: {} },
      ],
    },
  },
  {
    name: 'grid: fr units',
    node: {
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
    },
  },
  {
    name: 'grid: mixed px and fr',
    node: {
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
    },
  },
  {
    name: 'grid: percentage tracks',
    node: {
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
    },
  },
  {
    name: 'grid: row and column gaps',
    node: {
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
    },
  },
  {
    name: 'grid: explicit placement',
    node: {
      style: {
        display: 'grid',
        width: 300,
        height: 200,
        gridTemplateColumns: [100, 100, 100],
        gridTemplateRows: [100, 100],
      },
      children: [
        { style: { gridColumnStart: 3, gridRowStart: 2 } },
        { style: {} },
        { style: {} },
      ],
    },
  },
  {
    name: 'grid: spanning multiple columns',
    node: {
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
    },
  },
  {
    name: 'grid: padding on container',
    node: {
      style: {
        display: 'grid',
        width: 240,
        height: 140,
        padding: 20,
        gridTemplateColumns: [100, 100],
        gridTemplateRows: [100],
      },
      children: [
        { style: {} },
        { style: {} },
      ],
    },
  },
  {
    name: 'grid: auto rows',
    node: {
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
    },
  },
  {
    name: 'grid: nested flex inside grid cell',
    node: {
      style: {
        display: 'grid',
        width: 300,
        height: 200,
        gridTemplateColumns: [300],
        gridTemplateRows: [200],
      },
      children: [
        {
          style: { justifyContent: 'center', alignItems: 'center' },
          children: [
            { style: { width: 80, height: 80 } },
          ],
        },
      ],
    },
  },
];
