import { chromium } from 'playwright';
import { computeLayout } from '../../src/layout.js';
import type { FlexNode, FlexStyle, LayoutResult } from '../../src/types.js';
import { fixtures } from './fixtures.js';

const TOLERANCE = 1; // Accept up to 1px difference (sub-pixel rounding)

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ComparisonResult {
  name: string;
  passed: boolean;
  differences: string[];
}

/**
 * Convert a FlexStyle to a CSS style string suitable for setting on a DOM element.
 */
function styleToCss(style: FlexStyle | undefined): Record<string, string> {
  if (!style) return { display: 'flex' };

  const css: Record<string, string> = {};

  css['display'] = style.display === 'none' ? 'none' : style.display === 'grid' ? 'grid' : 'flex';
  css['box-sizing'] = style.boxSizing ?? 'content-box';
  css['position'] = style.position === 'absolute' ? 'absolute' : 'relative';

  if (style.flexDirection) css['flex-direction'] = style.flexDirection;
  if (style.flexWrap) css['flex-wrap'] = style.flexWrap;
  if (style.justifyContent) css['justify-content'] = style.justifyContent;
  if (style.alignItems) css['align-items'] = style.alignItems;
  if (style.alignSelf && style.alignSelf !== 'auto') css['align-self'] = style.alignSelf;
  if (style.alignContent) css['align-content'] = style.alignContent;
  if (style.justifyItems) css['justify-items'] = style.justifyItems;
  if (style.justifySelf && style.justifySelf !== 'auto') css['justify-self'] = style.justifySelf;

  // Grid container properties
  if (style.gridTemplateColumns?.length) {
    css['grid-template-columns'] = style.gridTemplateColumns.map(t =>
      typeof t === 'number' ? `${t}px` : t
    ).join(' ');
  }
  if (style.gridTemplateRows?.length) {
    css['grid-template-rows'] = style.gridTemplateRows.map(t =>
      typeof t === 'number' ? `${t}px` : t
    ).join(' ');
  }
  if (style.gridAutoColumns !== undefined && style.gridAutoColumns !== 'auto') {
    css['grid-auto-columns'] = typeof style.gridAutoColumns === 'number'
      ? `${style.gridAutoColumns}px` : style.gridAutoColumns;
  }
  if (style.gridAutoRows !== undefined && style.gridAutoRows !== 'auto') {
    css['grid-auto-rows'] = typeof style.gridAutoRows === 'number'
      ? `${style.gridAutoRows}px` : style.gridAutoRows;
  }
  if (style.gridAutoFlow) css['grid-auto-flow'] = style.gridAutoFlow;

  // Grid item placement
  if (style.gridColumnStart !== undefined && style.gridColumnStart !== 'auto') {
    css['grid-column-start'] = String(style.gridColumnStart);
  }
  if (style.gridColumnEnd !== undefined && style.gridColumnEnd !== 'auto') {
    css['grid-column-end'] = String(style.gridColumnEnd);
  }
  if (style.gridRowStart !== undefined && style.gridRowStart !== 'auto') {
    css['grid-row-start'] = String(style.gridRowStart);
  }
  if (style.gridRowEnd !== undefined && style.gridRowEnd !== 'auto') {
    css['grid-row-end'] = String(style.gridRowEnd);
  }

  if (style.flexGrow !== undefined) css['flex-grow'] = String(style.flexGrow);
  if (style.flexShrink !== undefined) css['flex-shrink'] = String(style.flexShrink);
  if (style.flexBasis !== undefined) css['flex-basis'] = style.flexBasis === 'auto' ? 'auto' : `${style.flexBasis}px`;

  if (style.width !== undefined && style.width !== 'auto') {
    css['width'] = typeof style.width === 'number' ? `${style.width}px` : style.width;
  }
  if (style.height !== undefined && style.height !== 'auto') {
    css['height'] = typeof style.height === 'number' ? `${style.height}px` : style.height;
  }
  if (style.minWidth !== undefined) {
    css['min-width'] = typeof style.minWidth === 'number' ? `${style.minWidth}px` : style.minWidth;
  }
  if (style.minHeight !== undefined) {
    css['min-height'] = typeof style.minHeight === 'number' ? `${style.minHeight}px` : style.minHeight;
  }
  if (style.maxWidth !== undefined) {
    css['max-width'] = typeof style.maxWidth === 'number' ? `${style.maxWidth}px` : style.maxWidth;
  }
  if (style.maxHeight !== undefined) {
    css['max-height'] = typeof style.maxHeight === 'number' ? `${style.maxHeight}px` : style.maxHeight;
  }

  // Padding
  if (style.padding !== undefined) css['padding'] = `${style.padding}px`;
  if (style.paddingTop !== undefined) css['padding-top'] = `${style.paddingTop}px`;
  if (style.paddingRight !== undefined) css['padding-right'] = `${style.paddingRight}px`;
  if (style.paddingBottom !== undefined) css['padding-bottom'] = `${style.paddingBottom}px`;
  if (style.paddingLeft !== undefined) css['padding-left'] = `${style.paddingLeft}px`;

  // Margin
  const marginProps = [
    ['margin', style.margin],
    ['margin-top', style.marginTop],
    ['margin-right', style.marginRight],
    ['margin-bottom', style.marginBottom],
    ['margin-left', style.marginLeft],
  ] as const;
  for (const [prop, val] of marginProps) {
    if (val !== undefined) {
      css[prop] = val === 'auto' ? 'auto' : `${val}px`;
    }
  }

  // Border (we use border-width + transparent color to avoid visual interference)
  if (style.border !== undefined) css['border'] = `${style.border}px solid transparent`;
  if (style.borderTop !== undefined) css['border-top-width'] = `${style.borderTop}px`;
  if (style.borderRight !== undefined) css['border-right-width'] = `${style.borderRight}px`;
  if (style.borderBottom !== undefined) css['border-bottom-width'] = `${style.borderBottom}px`;
  if (style.borderLeft !== undefined) css['border-left-width'] = `${style.borderLeft}px`;

  // Gap
  if (style.gap !== undefined) css['gap'] = `${style.gap}px`;
  if (style.rowGap !== undefined) css['row-gap'] = `${style.rowGap}px`;
  if (style.columnGap !== undefined) css['column-gap'] = `${style.columnGap}px`;

  // Insets
  const insetProps = [
    ['top', style.top],
    ['right', style.right],
    ['bottom', style.bottom],
    ['left', style.left],
  ] as const;
  for (const [prop, val] of insetProps) {
    if (val !== undefined && val !== 'auto') {
      css[prop] = typeof val === 'number' ? `${val}px` : val;
    }
  }

  if (style.zIndex !== undefined) css['z-index'] = String(style.zIndex);
  if (style.aspectRatio !== undefined) css['aspect-ratio'] = String(style.aspectRatio);

  return css;
}

function cssObjToString(css: Record<string, string>): string {
  return Object.entries(css).map(([k, v]) => `${k}: ${v}`).join('; ');
}

/**
 * Build an HTML string from a FlexNode tree.
 * Each element gets a data-id for later retrieval.
 */
function nodeToHtml(node: FlexNode, path: string = '0'): string {
  const css = styleToCss(node.style);
  const styleStr = cssObjToString(css);
  const children = (node.children ?? [])
    .map((child, i) => nodeToHtml(child, `${path}-${i}`))
    .join('');

  return `<div data-id="${path}" style="${styleStr}">${children}</div>`;
}

/**
 * Flatten a LayoutResult tree into a list of {path, rect} for comparison.
 */
function flattenLayout(result: LayoutResult, parentX = 0, parentY = 0, path = '0'): Array<{ path: string; rect: Rect }> {
  const absX = parentX + result.x;
  const absY = parentY + result.y;
  const entries: Array<{ path: string; rect: Rect }> = [
    { path, rect: { x: absX, y: absY, width: result.width, height: result.height } },
  ];
  for (let i = 0; i < result.children.length; i++) {
    entries.push(...flattenLayout(result.children[i]!, absX, absY, `${path}-${i}`));
  }
  return entries;
}

function closeEnough(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE;
}

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results: ComparisonResult[] = [];
  let totalNodes = 0;
  let totalPassed = 0;

  for (const fixture of fixtures) {
    // Compute layout with Preflow
    const preflowResult = computeLayout(
      fixture.node,
      fixture.availableWidth ?? Infinity,
      fixture.availableHeight ?? Infinity,
    );
    const preflowRects = flattenLayout(preflowResult);

    // Render in browser
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>* { margin: 0; padding: 0; box-sizing: content-box; }</style>
      </head>
      <body>${nodeToHtml(fixture.node)}</body>
      </html>
    `;
    await page.setContent(html);

    // Read back all rects
    const browserRects = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-id]');
      const rects: Array<{ path: string; rect: { x: number; y: number; width: number; height: number } }> = [];
      elements.forEach((el) => {
        const r = el.getBoundingClientRect();
        rects.push({
          path: el.getAttribute('data-id')!,
          rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        });
      });
      return rects;
    });

    // Compare
    const differences: string[] = [];
    for (const preflowEntry of preflowRects) {
      const browserEntry = browserRects.find((b) => b.path === preflowEntry.path);
      if (!browserEntry) {
        differences.push(`  [${preflowEntry.path}] Missing in browser`);
        continue;
      }

      const p = preflowEntry.rect;
      const b = browserEntry.rect;

      const fields: Array<keyof Rect> = ['x', 'y', 'width', 'height'];
      for (const field of fields) {
        if (!closeEnough(p[field], b[field])) {
          differences.push(
            `  [${preflowEntry.path}] ${field}: preflow=${p[field].toFixed(2)} browser=${b[field].toFixed(2)} (diff=${Math.abs(p[field] - b[field]).toFixed(2)})`,
          );
        }
      }
    }

    const passed = differences.length === 0;
    results.push({ name: fixture.name, passed, differences });

    totalNodes += preflowRects.length;
    if (passed) totalPassed++;

    const status = passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`  ${status}  ${fixture.name} (${preflowRects.length} nodes)`);
    if (!passed) {
      for (const diff of differences) {
        console.log(`\x1b[33m${diff}\x1b[0m`);
      }
    }
  }

  await browser.close();

  // Summary
  console.log('\n========================================');
  console.log(`Results: ${totalPassed}/${results.length} fixtures passed`);
  console.log(`Total nodes compared: ${totalNodes}`);

  const failedCount = results.filter((r) => !r.passed).length;
  if (failedCount > 0) {
    console.log(`\x1b[31m${failedCount} fixture(s) failed\x1b[0m`);
    process.exit(1);
  } else {
    console.log('\x1b[32mAll fixtures match the browser!\x1b[0m');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
