# Preflow

Pure TypeScript flexbox layout engine. Compute CSS-like flex layouts without DOM or browser dependencies.

Inspired by [Pretext](https://pretext.dev)'s approach of rebuilding browser primitives as deterministic, high-performance TypeScript — Preflow does the same for layout. Feed it a tree of nodes with styles, get back exact pixel positions. No DOM, no reflow, no browser required.

## Install

```bash
npm install preflow
```

## Quick Start

```typescript
import { computeLayout } from 'preflow';

const layout = computeLayout({
  style: { width: 400, height: 200, gap: 16, padding: 20 },
  children: [
    { style: { flexGrow: 1, height: 60 } },
    { style: { flexGrow: 2, height: 60 } },
    { style: { width: 80, height: 60 } },
  ],
});

// layout.children[0] → { x: 20, y: 20, width: 88, height: 60, children: [] }
// layout.children[1] → { x: 124, y: 20, width: 176, height: 60, children: [] }
// layout.children[2] → { x: 316, y: 20, width: 80, height: 60, children: [] }
```

Pure data in, pure data out. No classes, no manual memory management, no `.free()`.

## Why

Every time you need to know element sizes without rendering — virtual scrolling, server-side rendering, Canvas/WebGPU apps, PDF generation, AI-generated UIs — you're fighting the browser's layout engine or building your own from scratch. Preflow gives you flexbox layout as a pure function.

**Use cases:**
- Virtual scrolling with accurate variable-height rows
- Canvas/WebGPU applications that need UI layout
- Server-side layout computation (Node.js, Workers, Deno, Bun)
- PDF/document generation without headless Chrome
- Layout unit testing without a browser
- AI interfaces that compute layout as tokens stream

## API

### `computeLayout(node, availableWidth?, availableHeight?)`

Computes the layout of a node tree and returns a result tree with positions and sizes.

```typescript
interface FlexNode {
  style?: FlexStyle;
  children?: FlexNode[];
  measure?: (availableWidth: number, availableHeight: number) => { width: number; height: number };
}

interface LayoutResult {
  x: number;       // Position relative to parent
  y: number;
  width: number;   // Outer size (including padding + border)
  height: number;
  children: LayoutResult[];
}
```

### Supported Style Properties

**Container:**
- `display`: `'flex'` | `'none'`
- `flexDirection`: `'row'` | `'column'` | `'row-reverse'` | `'column-reverse'`
- `flexWrap`: `'nowrap'` | `'wrap'` | `'wrap-reverse'`
- `justifyContent`: `'flex-start'` | `'flex-end'` | `'center'` | `'space-between'` | `'space-around'` | `'space-evenly'`
- `alignItems`: `'flex-start'` | `'flex-end'` | `'center'` | `'stretch'`
- `alignContent`: `'flex-start'` | `'flex-end'` | `'center'` | `'stretch'` | `'space-between'` | `'space-around'`
- `gap`, `rowGap`, `columnGap`

**Item:**
- `flexGrow`, `flexShrink`, `flexBasis`
- `alignSelf`: `'auto'` | `'flex-start'` | `'flex-end'` | `'center'` | `'stretch'`

**Sizing:**
- `width`, `height`: number (px), `'${n}%'`, or `'auto'`
- `minWidth`, `minHeight`, `maxWidth`, `maxHeight`
- `padding`, `paddingTop/Right/Bottom/Left`
- `margin`, `marginTop/Right/Bottom/Left` (including `'auto'`)
- `border`, `borderTop/Right/Bottom/Left`
- `boxSizing`: `'content-box'` | `'border-box'`

### Measure Function

For leaf nodes with dynamic content (text, images), provide a `measure` callback:

```typescript
const node = {
  measure: (availableWidth, availableHeight) => ({
    width: measureTextWidth(myText, availableWidth),
    height: measureTextHeight(myText, availableWidth),
  }),
};
```

This is how you integrate with text measurement libraries like [Pretext](https://pretext.dev).

## Performance

Benchmarked on Apple M-series, Node.js v24:

| Scenario | Items | Time | Ops/sec |
|----------|-------|------|---------|
| Flat row | 10 | 3.4 µs | 292,000 |
| Flat row | 100 | 26 µs | 38,000 |
| Flat row | 1,000 | 276 µs | 3,600 |
| Flat row | 10,000 | 6.6 ms | 150 |
| Wrapped | 100 | 27 µs | 36,500 |
| Wrapped | 1,000 | 280 µs | 3,500 |
| Nested (84 nodes) | 84 | 204 µs | 4,900 |
| Nested (780 nodes) | 780 | 5.2 ms | 192 |

## Comparison with Yoga

| | Preflow | Yoga |
|---|---|---|
| Language | Pure TypeScript | C++ → WASM |
| API | Pure function, data in/out | Class-based, manual `.free()` |
| CSS Grid | Planned | No |
| Bundle size | ~28 KB | ~45 KB (WASM) |
| Debugging | Standard JS debugger | WASM boundary |
| Tree-shakeable | Yes | No |

## Current Limitations

Phase 1 does not yet support:
- CSS Grid layout
- `position: absolute / fixed / sticky`
- Writing modes / RTL
- Baseline alignment
- Intrinsic sizing keywords (`min-content`, `max-content`)
- `visibility: collapse`
- `aspect-ratio`

These are planned for future phases.

## Development

```bash
pnpm install
pnpm test          # Run tests
pnpm test:watch    # Watch mode
pnpm bench         # Run benchmarks
pnpm build         # Build ESM + CJS + types
pnpm typecheck     # Type-check
```

## License

MIT
