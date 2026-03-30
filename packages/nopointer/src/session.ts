import type {
  SceneNode,
  NoPointerEvent,
  GestureConfig,
  HitResult,
  ScrollAxis,
} from './types.js';
import { DEFAULT_GESTURE_CONFIG } from './types.js';
import { hitTest } from './hitTest.js';
import { createEvent } from './propagate.js';

type SessionState = 'idle' | 'pressed' | 'dragging' | 'scrolling';

export interface PointerSession {
  down(x: number, y: number, scene: SceneNode, timestamp?: number): NoPointerEvent[];
  move(x: number, y: number, scene: SceneNode, timestamp?: number): NoPointerEvent[];
  up(x: number, y: number, scene: SceneNode, timestamp?: number): NoPointerEvent[];
  cancel(): NoPointerEvent[];
  wheel(x: number, y: number, deltaX: number, deltaY: number, scene: SceneNode, timestamp?: number): NoPointerEvent[];
  readonly state: SessionState;
  readonly hoveredNode: SceneNode | null;
}

export function createPointerSession(config?: GestureConfig): PointerSession {
  const cfg: Required<GestureConfig> = { ...DEFAULT_GESTURE_CONFIG, ...config };

  let state: SessionState = 'idle';
  let downX = 0;
  let downY = 0;
  let downTime = 0;
  let downHit: HitResult | null = null;

  let lastTapTime = -Infinity;

  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressFired = false;

  let hoveredNode: SceneNode | null = null;
  let hoveredPath: SceneNode[] = [];

  function clearLongPress(): void {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function dist(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function makeEvent(
    type: NoPointerEvent['type'],
    hit: HitResult | null,
    x: number,
    y: number,
    timestamp: number,
    extra?: { deltaX?: number; deltaY?: number },
  ): NoPointerEvent {
    if (hit) {
      return createEvent(type, hit.node, hit.path, x, y, hit.localX, hit.localY, timestamp, extra);
    }
    const nullNode: SceneNode = { layout: { x: 0, y: 0, width: 0, height: 0, children: [] } };
    return createEvent(type, nullNode, [], x, y, x, y, timestamp, extra);
  }

  /**
   * Walk up the path from the target to find the nearest scrollable ancestor.
   */
  function findScrollableAncestor(path: SceneNode[]): { node: SceneNode; axis: ScrollAxis } | null {
    for (let i = path.length - 1; i >= 0; i--) {
      const n = path[i]!;
      if (n.scrollable) {
        return { node: n, axis: n.scrollable };
      }
    }
    return null;
  }

  /**
   * Compute enter/leave events when the hovered node changes.
   */
  function computeHoverEvents(
    newHit: HitResult | null,
    x: number,
    y: number,
    timestamp: number,
  ): NoPointerEvent[] {
    const events: NoPointerEvent[] = [];
    const newNode = newHit?.node ?? null;
    const newPath = newHit?.path ?? [];

    if (newNode === hoveredNode) {
      hoveredPath = newPath;
      return events;
    }

    // Find the common ancestor index
    let commonLen = 0;
    const minLen = Math.min(hoveredPath.length, newPath.length);
    for (let i = 0; i < minLen; i++) {
      if (hoveredPath[i] === newPath[i]) {
        commonLen = i + 1;
      } else {
        break;
      }
    }

    // Leave events for nodes no longer in the path (deepest first)
    for (let i = hoveredPath.length - 1; i >= commonLen; i--) {
      const node = hoveredPath[i]!;
      events.push(createEvent('pointerleave', node, hoveredPath.slice(0, i + 1), x, y, 0, 0, timestamp));
    }

    // Enter events for new nodes (shallowest first)
    for (let i = commonLen; i < newPath.length; i++) {
      const node = newPath[i]!;
      events.push(createEvent('pointerenter', node, newPath.slice(0, i + 1), x, y, 0, 0, timestamp));
    }

    hoveredNode = newNode;
    hoveredPath = newPath;
    return events;
  }

  return {
    get state() {
      return state;
    },

    get hoveredNode() {
      return hoveredNode;
    },

    down(x: number, y: number, scene: SceneNode, timestamp?: number): NoPointerEvent[] {
      const t = timestamp ?? Date.now();
      const hit = hitTest(scene, x, y);
      const events: NoPointerEvent[] = [];

      events.push(...computeHoverEvents(hit, x, y, t));
      events.push(makeEvent('pointerdown', hit, x, y, t));

      state = 'pressed';
      downX = x;
      downY = y;
      downTime = t;
      downHit = hit;
      longPressFired = false;

      clearLongPress();
      longPressTimer = setTimeout(() => {
        if (state === 'pressed') {
          longPressFired = true;
          events.push(makeEvent('longpress', downHit, downX, downY, Date.now()));
        }
      }, cfg.longPressDelay);

      return events;
    },

    move(x: number, y: number, scene: SceneNode, timestamp?: number): NoPointerEvent[] {
      const t = timestamp ?? Date.now();
      const hit = hitTest(scene, x, y);
      const events: NoPointerEvent[] = [];

      events.push(...computeHoverEvents(hit, x, y, t));
      events.push(makeEvent('pointermove', hit, x, y, t));

      if (state === 'pressed') {
        const d = dist(x, y, downX, downY);
        if (d > cfg.dragThreshold) {
          clearLongPress();

          const scrollTarget = downHit ? findScrollableAncestor(downHit.path) : null;
          if (scrollTarget) {
            state = 'scrolling';
            events.push(makeEvent('scrollstart', downHit, x, y, t));
          } else {
            state = 'dragging';
            events.push(makeEvent('dragstart', downHit, x, y, t));
          }
        }
      }

      if (state === 'dragging') {
        events.push(makeEvent('drag', downHit, x, y, t, {
          deltaX: x - downX,
          deltaY: y - downY,
        }));
      }

      if (state === 'scrolling') {
        events.push(makeEvent('scroll', downHit, x, y, t, {
          deltaX: x - downX,
          deltaY: y - downY,
        }));
      }

      return events;
    },

    up(x: number, y: number, scene: SceneNode, timestamp?: number): NoPointerEvent[] {
      const t = timestamp ?? Date.now();
      const hit = hitTest(scene, x, y);
      const events: NoPointerEvent[] = [];

      events.push(makeEvent('pointerup', hit, x, y, t));
      clearLongPress();

      if (state === 'pressed' && !longPressFired) {
        const duration = t - downTime;
        const d = dist(x, y, downX, downY);

        if (duration <= cfg.tapMaxDuration && d <= cfg.tapMaxDistance) {
          // Check for double-tap
          if (t - lastTapTime <= cfg.doubleTapMaxGap) {
            events.push(makeEvent('doubletap', hit, x, y, t));
            lastTapTime = 0;
          } else {
            events.push(makeEvent('tap', hit, x, y, t));
            lastTapTime = t;
          }
        }
      }

      if (state === 'dragging') {
        events.push(makeEvent('dragend', downHit, x, y, t));
      }

      if (state === 'scrolling') {
        events.push(makeEvent('scrollend', downHit, x, y, t));
      }

      state = 'idle';
      downHit = null;
      return events;
    },

    cancel(): NoPointerEvent[] {
      clearLongPress();
      const events: NoPointerEvent[] = [];
      const t = Date.now();

      if (state === 'dragging') {
        events.push(makeEvent('dragend', downHit, downX, downY, t));
      }
      if (state === 'scrolling') {
        events.push(makeEvent('scrollend', downHit, downX, downY, t));
      }

      state = 'idle';
      downHit = null;
      return events;
    },

    wheel(x: number, y: number, deltaX: number, deltaY: number, scene: SceneNode, timestamp?: number): NoPointerEvent[] {
      const t = timestamp ?? Date.now();
      const hit = hitTest(scene, x, y);
      const events: NoPointerEvent[] = [];

      events.push(makeEvent('wheel', hit, x, y, t, { deltaX, deltaY }));
      return events;
    },
  };
}
