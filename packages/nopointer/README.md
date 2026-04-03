# nopointer

**Pure TypeScript hit-testing, pointer events, and gesture recognition. No DOM.**

nopointer is the event layer for Canvas and WebGPU UIs. It takes a layout tree (from [noreflow](https://github.com/jbpete87/noreflow)) and handles everything the DOM normally does for interaction: spatial hit-testing, event capture/bubble propagation, gesture recognition, momentum scrolling, and focus management.

Part of the **noreflow** stack:
[Pretext](https://github.com/chenglou/pretext) (text) + [noreflow](https://github.com/jbpete87/noreflow) (layout) + **nopointer** (events) + [Tela](https://github.com/jbpete87/noreflow/tree/main/packages/tela) (React renderer)

## Install

```bash
npm install nopointer
```

## Quick Start

```typescript
import { hitTest, propagate, createPointerSession, createScrollState } from 'nopointer';
import type { SceneNode } from 'nopointer';

// Build a scene tree from your noreflow LayoutResult
const scene: SceneNode = {
  layout: layoutResult, // from computeLayout()
  children: [
    {
      layout: layoutResult.children[0],
      cursor: 'pointer',
      data: { id: 'button-1' },
    },
  ],
};

// Hit-test a point
const hit = hitTest(scene, mouseX, mouseY);
// → { node, path, localX, localY }

// Full pointer session with gesture recognition
const session = createPointerSession();
const events = session.down(scene, x, y, Date.now());
// events → [{ type: 'pointerdown', target, path, ... }]
```

## API

### Hit-Testing

```typescript
hitTest(root: SceneNode, x: number, y: number): HitResult | null
```

Walks the scene tree front-to-back, respecting `zIndex`, `clip`, and `hitArea` properties. Returns the deepest node under the point with the full ancestor path.

### Event Propagation

```typescript
propagate(event: NoPointerEvent, handler: EventHandler): void
```

Runs capture → target → bubble phases over the hit path. Call `event.stopPropagation()` to halt.

### Pointer Session

```typescript
const session = createPointerSession(config?: GestureConfig);

session.down(root, x, y, timestamp)   → NoPointerEvent[]
session.move(root, x, y, timestamp)   → NoPointerEvent[]
session.up(root, x, y, timestamp)     → NoPointerEvent[]
session.cancel()                      → NoPointerEvent[]
session.wheel(root, x, y, dx, dy, ts) → NoPointerEvent[]

session.state       // 'idle' | 'down' | 'dragging'
session.hoveredNode // { node, cursor } | null
```

Classifies raw pointer input into semantic events: `tap`, `doubletap`, `longpress`, `dragstart`, `dragmove`, `dragend`, `scroll`, `wheel`, `pointerenter`, `pointerleave`.

### Scroll Physics

```typescript
const scroll = createScrollState(config?: ScrollConfig);

scroll.impulse(velocity)   // kick with velocity (from drag end)
scroll.scrollTo(offset)    // jump to position
scroll.scrollBy(delta)     // relative scroll
scroll.setBounds(min, max) // content bounds
scroll.tick(deltaMs)       // advance physics (call in RAF)

scroll.offset       // current scroll position
scroll.velocity     // current velocity
scroll.isAnimating  // true if momentum is active
```

Momentum scrolling with configurable friction. Matches native iOS/macOS feel.

### Focus Management

```typescript
const focus = createFocusManager();

focus.focus(node)   // focus a node
focus.blur()        // blur current
focus.tabNext()     // tab forward
focus.tabPrev()     // tab backward
focus.focused       // currently focused node
```

### SceneNode

```typescript
interface SceneNode {
  layout: LayoutResult;        // from noreflow
  children?: SceneNode[];
  clip?: boolean;              // clip children to bounds during hit-test
  zIndex?: number;             // paint/hit order among siblings
  hitArea?: 'rect' | 'none';  // 'none' = pointer passes through
  cursor?: CursorStyle;       // CSS cursor on hover
  scrollable?: 'x' | 'y' | 'both';
  draggable?: boolean;
  data?: unknown;              // your app data (widget ref, message id, etc.)
}
```

## License

MIT
