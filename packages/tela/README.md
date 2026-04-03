# Tela

**React renderer for Canvas UIs. Write JSX, render to Canvas. Zero DOM nodes.**

<!-- TODO: Add GIF of streaming chat demo -->

Tela is a React renderer powered by `react-reconciler` that renders your components to an HTML Canvas instead of the DOM. Write normal React code — hooks, context, suspense — and get pixel-perfect Canvas rendering with zero layout reflow.

Built on the noreflow stack:
- **[noreflow](https://github.com/jbpete87/noreflow)** — flexbox + CSS Grid layout as a pure function
- **[Pretext](https://github.com/chenglou/pretext)** — text measurement without the DOM
- **[nopointer](https://github.com/jbpete87/noreflow/tree/main/packages/nopointer)** — hit-testing, pointer events, gestures, scroll physics

## Install

```bash
npm install tela react noreflow nopointer @chenglou/pretext
```

## Quick Start

```tsx
import { Canvas, View, Text, ScrollView, Pressable } from 'tela';

function App() {
  const [count, setCount] = useState(0);

  return (
    <Canvas width={400} height={300}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: '#0f172a' }}>
        <Text font="600 24px Inter" lineHeight={32} color="#f1f5f9">
          Count: {count}
        </Text>
        <Pressable
          onPress={() => setCount(c => c + 1)}
          style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 12, paddingBottom: 12, backgroundColor: '#6366f1', borderRadius: 8 }}
        >
          <Text font="500 14px Inter" lineHeight={20} color="#ffffff">
            Increment
          </Text>
        </Pressable>
      </View>
    </Canvas>
  );
}
```

Everything inside `<Canvas>` renders to a single `<canvas>` element. No DOM nodes, no reflow, no jank.

## Components

### `<Canvas>`

The root component. Renders a `<canvas>` element and manages the React reconciler, RAF loop, and pointer events.

```tsx
<Canvas width={800} height={600} style={{ border: '1px solid #333' }}>
  {/* Tela components here */}
</Canvas>
```

### `<View>`

Flexbox container. Accepts any noreflow `FlexStyle` property plus visual properties.

```tsx
<View style={{
  flexDirection: 'row',
  gap: 12,
  padding: 16,
  backgroundColor: '#1e293b',
  borderRadius: 8,
}}>
  {children}
</View>
```

### `<Text>`

Text rendering powered by Pretext. No DOM text measurement.

```tsx
<Text font="400 14px Inter" lineHeight={20} color="#e2e8f0">
  Hello world
</Text>
```

| Prop | Type | Default |
|------|------|---------|
| `font` | string | `'400 14px Inter, system-ui, sans-serif'` |
| `lineHeight` | number | `20` |
| `color` | string | `'#000000'` |
| `whiteSpace` | `'normal' \| 'pre-wrap'` | `'normal'` |

### `<ScrollView>`

Scrollable container with momentum physics (via nopointer).

```tsx
<ScrollView style={{ flex: 1 }} scrollDirection="y">
  {/* scrollable content */}
</ScrollView>
```

### `<Pressable>`

Interactive element with press and hover callbacks.

```tsx
<Pressable
  onPress={() => console.log('pressed')}
  onHoverIn={() => console.log('hover start')}
  onHoverOut={() => console.log('hover end')}
  style={{ backgroundColor: '#6366f1', borderRadius: 8 }}
>
  <Text color="#fff">Click me</Text>
</Pressable>
```

## Style Properties

Tela accepts all noreflow `FlexStyle` properties plus visual properties:

**Layout** (from noreflow): `flexDirection`, `justifyContent`, `alignItems`, `gap`, `padding`, `margin`, `width`, `height`, `flex`, `flexGrow`, `flexShrink`, `position`, `top/right/bottom/left`, and all CSS Grid properties.

**Visual** (Tela-specific): `backgroundColor`, `borderColor`, `borderRadius`, `opacity`.

## How It Works

1. You write JSX with Tela components
2. `react-reconciler` manages a mutable `HostNode` tree
3. On each React commit, the HostNode tree is converted to an immutable `FlexNode` tree
4. `noreflow.computeLayout()` computes pixel positions
5. A Canvas 2D paint pass renders backgrounds, borders, and text
6. `nopointer` handles hit-testing and pointer events on the canvas

Layout is computed as a pure function — no DOM reads, no reflow. Text is measured by Pretext — no `getBoundingClientRect`. Events are handled by nopointer — no DOM event delegation inside the canvas.

## License

MIT
