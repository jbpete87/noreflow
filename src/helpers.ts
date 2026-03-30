import type { FlexNode, FlexStyle } from './types.js';

/**
 * Create a layout node with style applied directly — no `{ style: { ... } }` wrapping.
 *
 *   h({ width: 100, height: 50 })
 *   h({ flexGrow: 1 }, child1, child2)
 */
export function h(style: FlexStyle, ...children: FlexNode[]): FlexNode {
  return children.length > 0 ? { style, children } : { style };
}

/**
 * Create a row (flex-direction: row) node.
 *
 *   row({ gap: 12, padding: 8 }, child1, child2)
 */
export function row(style: FlexStyle, ...children: FlexNode[]): FlexNode {
  return h({ flexDirection: 'row', ...style }, ...children);
}

/**
 * Create a column (flex-direction: column) node.
 *
 *   col({ width: 375, height: 667 }, header, content, footer)
 */
export function col(style: FlexStyle, ...children: FlexNode[]): FlexNode {
  return h({ flexDirection: 'column', ...style }, ...children);
}

/**
 * Create a grid container node.
 *
 *   grid({ gridTemplateColumns: ['1fr', '1fr'], gap: 8 }, ...items)
 */
export function grid(style: FlexStyle, ...children: FlexNode[]): FlexNode {
  return h({ display: 'grid', ...style }, ...children);
}
