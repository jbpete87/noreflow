import type { LayoutResult } from 'noreflow';

// ---------------------------------------------------------------------------
// Scene tree — annotates a LayoutResult with interaction metadata
// ---------------------------------------------------------------------------

export type CursorStyle =
  | 'default'
  | 'pointer'
  | 'text'
  | 'grab'
  | 'grabbing'
  | 'crosshair'
  | 'move'
  | 'not-allowed'
  | 'col-resize'
  | 'row-resize'
  | 'ew-resize'
  | 'ns-resize'
  | 'none';

export type ScrollAxis = 'x' | 'y' | 'both';

export interface SceneNode {
  layout: LayoutResult;
  children?: SceneNode[];
  /** When true, children are clipped to this node's bounds during hit-testing. */
  clip?: boolean;
  /** Override paint/hit order among siblings. Higher wins. */
  zIndex?: number;
  /** 'none' makes the pointer pass through this node to what's behind it. Default: 'rect'. */
  hitArea?: 'rect' | 'none';
  /** CSS cursor to show when this node is hovered. */
  cursor?: CursorStyle;
  /** Mark this node as a scroll container. */
  scrollable?: ScrollAxis;
  /** When true, drags on this node take priority over ancestor scroll containers. */
  draggable?: boolean;
  /** Arbitrary user data — widget ref, message id, semantic role, etc. */
  data?: unknown;
}

// ---------------------------------------------------------------------------
// Hit-testing result
// ---------------------------------------------------------------------------

export interface HitResult {
  /** The deepest node under the pointer. */
  node: SceneNode;
  /** Path from root to target (inclusive on both ends). */
  path: SceneNode[];
  /** Pointer x relative to the hit node's layout origin. */
  localX: number;
  /** Pointer y relative to the hit node's layout origin. */
  localY: number;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type NoPointerEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointerenter'
  | 'pointerleave'
  | 'tap'
  | 'doubletap'
  | 'longpress'
  | 'dragstart'
  | 'drag'
  | 'dragend'
  | 'scrollstart'
  | 'scroll'
  | 'scrollend'
  | 'wheel';

export type PropagationPhase = 'capture' | 'target' | 'bubble';

export interface NoPointerEvent {
  type: NoPointerEventType;
  /** The deepest node under the pointer at the time of the event. */
  target: SceneNode;
  /** Path from root to target. */
  path: SceneNode[];
  /** Pointer x in scene coordinates. */
  x: number;
  /** Pointer y in scene coordinates. */
  y: number;
  /** Pointer x relative to the target node. */
  localX: number;
  /** Pointer y relative to the target node. */
  localY: number;
  /** Current propagation phase. */
  phase: PropagationPhase;
  /** True after stopPropagation() is called. */
  stopped: boolean;
  stopPropagation(): void;
  /** Scroll/wheel delta (only meaningful for scroll/wheel events). */
  deltaX: number;
  deltaY: number;
  /** Timestamp in ms (from the raw input or performance.now). */
  timestamp: number;
}

export type EventHandler = (event: NoPointerEvent) => void;

// ---------------------------------------------------------------------------
// Gesture config
// ---------------------------------------------------------------------------

export interface GestureConfig {
  /** Max duration in ms for a tap (down→up). Default: 300. */
  tapMaxDuration?: number;
  /** Max pointer travel in px for a tap. Default: 5. */
  tapMaxDistance?: number;
  /** Delay in ms before a long-press fires. Default: 500. */
  longPressDelay?: number;
  /** Distance in px before a drag starts. Default: 3. */
  dragThreshold?: number;
  /** Max gap in ms between two taps for a double-tap. Default: 300. */
  doubleTapMaxGap?: number;
  /** Friction multiplier for scroll momentum (0–1). Default: 0.95. */
  scrollFriction?: number;
}

export const DEFAULT_GESTURE_CONFIG: Required<GestureConfig> = {
  tapMaxDuration: 300,
  tapMaxDistance: 5,
  longPressDelay: 500,
  dragThreshold: 3,
  doubleTapMaxGap: 300,
  scrollFriction: 0.95,
};
