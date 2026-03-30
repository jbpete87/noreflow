# Noreflow

**Pure TypeScript layout engine. Flexbox + CSS Grid. Zero dependencies. No WASM. No DOM.**

Every time an AI chat streams a token, the browser recalculates the entire page layout. That's why ChatGPT stutters, Claude janks, and every streaming UI feels sluggish. The DOM reflow bottleneck is the performance wall every serious web app hits.

Noreflow computes layout as a pure function — feed it a tree of nodes with styles, get back exact pixel positions. Pair it with [Pretext](https://pretext.dev) for text measurement and you get **zero-reflow rendering** for streaming UIs, virtual scrolling, Canvas apps, and anywhere else DOM layout is too slow.

## Install

```bash
npm install noreflow
```

## Quick Start

```typescript
import { computeLayout } from 'noreflow';

const layout = computeLayout({
  style: { width: 400, height: 200, gap: 16, padding: 20 },
  children: [
    { style: { flexGrow: 1, height: 60 } },
    { style: { flexGrow: 2, height: 60 } },
    { style: { width: 80, height: 60 } },
  ],
});

// layout.children[0] → { x: 20, y: 20, width: 88, height: 60 }
// layout.children[1] → { x: 124, y: 20, width: 176, height: 60 }
// layout.children[2] → { x: 316, y: 20, width: 80, height: 60 }
```

Pure data in, pure data out. No classes, no manual memory management, no `.free()`.

## The Problem

The DOM reflow bottleneck is THE performance wall every serious web app hits. Every app that's gotten big enough has had to build ugly workarounds:

- **Slack** estimates message heights and gets them wrong (scroll jumping)
- **Google Docs** slows down on long documents because every keystroke triggers paragraph reflow
- **VS Code** built an entire custom editor (Monaco) because `contenteditable` + DOM layout couldn't keep up
- **Figma** renders entirely to Canvas because DOM layout can't handle a design tool
- **Every AI chat app** (ChatGPT, Claude) janks when streaming because tokens cause text reflow → height changes → scroll jumps

The root cause is the same: the browser's layout engine is a black box that forces synchronous reflow whenever content changes.

## The Solution

Noreflow + [Pretext](https://pretext.dev) = zero-reflow rendering.

1. **Pretext** measures text (line breaks, wrapping, height) as pure arithmetic — no DOM
2. **Noreflow** computes layout (flexbox, grid, absolute positioning) as a pure function — no DOM
3. Together they replace the browser's Style → Layout pipeline with deterministic, synchronous TypeScript

```typescript
import { prepareWithSegments, layout } from '@chenglou/pretext';
import { computeLayout } from 'noreflow';

const prepared = prepareWithSegments(
  'Each new token can cause a line wrap, changing the height.',
  '400 14px Inter',
);

const measure = (availableWidth: number) => {
  const result = layout(prepared, availableWidth, 20);
  return { width: availableWidth, height: result.height };
};

const chatMessage = computeLayout({
  style: { width: 320, flexDirection: 'row', gap: 8, padding: 12 },
  children: [
    { style: { width: 32, height: 32, flexShrink: 0 } },
    {
      style: { flexGrow: 1, flexDirection: 'column', gap: 4 },
      children: [
        { style: { height: 16 } },
        { measure },
      ],
    },
  ],
});
```

The message body height is computed from the actual text without touching the DOM. When a new token arrives, re-run the computation — it takes microseconds.

## Use Cases

- **AI streaming UIs** — compute height before rendering, eliminate scroll jank
- **Virtual scrolling** — accurate variable-height rows without measuring DOM elements
- **Canvas / WebGPU apps** — full UI layout in a draw loop
- **Server-side rendering** — layout computation in Node.js, Workers, Deno, Bun
- **PDF / document generation** — without headless Chrome
- **Layout unit testing** — without a browser

## API

### `computeLayout(node, availableWidth?, availableHeight?)`

```typescript
interface FlexNode {
  style?: FlexStyle;
  children?: FlexNode[];
  measure?: (availableWidth: number, availableHeight: number) => { width: number; height: number };
}

interface LayoutResult {
  x: number;
  y: number;
  width: number;
  height: number;
  children: LayoutResult[];
}
```

### Supported Style Properties

**Container:**
- `display`: `'flex'` | `'grid'` | `'none'`
- `flexDirection`: `'row'` | `'column'` | `'row-reverse'` | `'column-reverse'`
- `flexWrap`: `'nowrap'` | `'wrap'` | `'wrap-reverse'`
- `justifyContent`: `'flex-start'` | `'flex-end'` | `'center'` | `'space-between'` | `'space-around'` | `'space-evenly'`
- `alignItems`: `'flex-start'` | `'flex-end'` | `'center'` | `'stretch'`
- `alignContent`: `'flex-start'` | `'flex-end'` | `'center'` | `'stretch'` | `'space-between'` | `'space-around'`
- `gap`, `rowGap`, `columnGap`

**CSS Grid:**
- `gridTemplateColumns`, `gridTemplateRows` — explicit track sizes (number, `'Nfr'`, `'auto'`)
- `gridAutoRows`, `gridAutoColumns` — implicit track sizes
- `gridColumnStart`, `gridColumnEnd`, `gridRowStart`, `gridRowEnd` — item placement
- `gridAutoFlow`: `'row'` | `'column'`

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
- `aspectRatio`: number

**Positioning:**
- `position`: `'relative'` | `'absolute'` | `'fixed'`
- `top`, `right`, `bottom`, `left`

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
| Flat row | 10 | 3.4 us | 292,000 |
| Flat row | 100 | 26 us | 38,000 |
| Flat row | 1,000 | 276 us | 3,600 |
| Flat row | 10,000 | 6.6 ms | 150 |
| Wrapped | 100 | 27 us | 36,500 |
| Wrapped | 1,000 | 280 us | 3,500 |
| Nested (84 nodes) | 84 | 204 us | 4,900 |
| Nested (780 nodes) | 780 | 5.2 ms | 192 |

## Comparison

| | Noreflow | Yoga | Textura |
|---|---|---|---|
| Architecture | Purpose-built TS engine | C++ -> WASM | Wraps Yoga |
| Language | Pure TypeScript | WASM binary | WASM binary |
| API | Pure function, data in/out | Class-based, manual `.free()` | Imperative |
| Initialization | Synchronous | `await init()` | `await init()` |
| CSS Grid | Yes | No | No |
| Aspect Ratio | Yes | Yes | Yes |
| Absolute/Fixed | Yes | Yes | Yes |
| Bundle | ~10 KB gzip | ~45 KB (WASM) | ~45 KB+ (WASM) |
| Dependencies | Zero | None | yoga-layout + pretext |
| Debugging | JS debugger | WASM boundary | WASM boundary |
| Tree-shakeable | Yes | No | No |

## Current Limitations

- Writing modes / RTL
- Baseline alignment
- Intrinsic sizing keywords (`min-content`, `max-content`, `fit-content`)
- `visibility: collapse`
- `position: sticky`

These are planned for future releases.

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
