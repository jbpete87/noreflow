# @noreflow/stream-ui

**Zero-reflow streaming chat UI. Canvas-rendered. Drop-in React hook.**

<!-- TODO: Add GIF of streaming chat demo -->

stream-ui is a complete, canvas-rendered chat interface built on [noreflow](https://github.com/jbpete87/noreflow) + [Pretext](https://github.com/chenglou/pretext) + [nopointer](https://github.com/jbpete87/noreflow/tree/main/packages/nopointer). One React hook gives you a streaming AI chat with momentum scrolling, hover states, and click handling — rendered entirely to `<canvas>` with zero DOM nodes for the message list.

## Install

```bash
npm install @noreflow/stream-ui noreflow nopointer @chenglou/pretext
```

## Quick Start

```tsx
import { useStreamLayout } from '@noreflow/stream-ui';

function Chat() {
  const { canvasRef, addMessage, setStreamingIdx, nodeCount } = useStreamLayout({
    width: 400,
    height: 600,
    title: 'AI Chat',
  });

  return <canvas ref={canvasRef} width={400} height={600} />;
}
```

That's it. The hook handles layout computation, text measurement, scroll physics, pointer events, and Canvas 2D rendering in a single `requestAnimationFrame` loop.

## How It Works

1. **Text measurement** — Each message is measured with Pretext (`prepareWithSegments` + `layout`). No DOM measurement, no `getBoundingClientRect`.
2. **Structural layout** — Message cards (avatar + label + text body) are laid out with noreflow's flexbox engine. One `computeLayout()` call per frame.
3. **Interaction** — nopointer handles hit-testing, hover states, click detection, and momentum scrolling on the canvas.
4. **Rendering** — A Canvas 2D paint pass draws backgrounds, text, avatars, and chrome.

When streaming tokens arrive, the text is re-measured and re-laid out in ~30 microseconds. No reflow. No jank.

## API

### `useStreamLayout(opts)`

```typescript
interface UseStreamLayoutOpts {
  width: number;
  height: number;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  theme?: Partial<StreamTheme>;
  config?: Partial<StreamChatConfig>;
  onSend?: (text: string) => void;
  onSidebarSelect?: (index: number) => void;
}

interface UseStreamLayoutResult {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  addMessage: (msg: StreamMessage) => void;
  updateMessage: (id: string, text: string) => void;
  setStreamingIdx: (idx: number) => void;
  nodeCount: number;
}
```

### Lower-Level API

For custom renderers or non-React usage:

```typescript
import {
  createTextHandle,      // Pretext-backed text measurement
  measureMessage,        // measure a single chat message
  buildChatLayout,       // build noreflow FlexNode tree
  buildChatScene,        // build nopointer SceneNode tree
  drawChat,              // Canvas 2D paint
} from '@noreflow/stream-ui';
```

## Part of the Stack

| Package | Role |
|---------|------|
| [Pretext](https://github.com/chenglou/pretext) | Text measurement |
| [noreflow](https://github.com/jbpete87/noreflow) | Flexbox layout |
| [nopointer](https://github.com/jbpete87/noreflow/tree/main/packages/nopointer) | Hit-testing + events |
| **@noreflow/stream-ui** | Pre-built chat components |
| [Tela](https://github.com/jbpete87/noreflow/tree/main/packages/tela) | React renderer (JSX → Canvas) |

## License

MIT
