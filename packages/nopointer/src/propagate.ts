import type { SceneNode, NoPointerEvent, EventHandler } from './types.js';

/**
 * Propagate an event through a scene path: capture → target → bubble.
 *
 * `handlers` maps a SceneNode to its handler. The handler is called once
 * per phase the node participates in (capture for ancestors, target for
 * the target node, bubble for ancestors in reverse).
 *
 * Calling event.stopPropagation() halts further dispatch.
 */
export function propagate(
  event: NoPointerEvent,
  handlers: Map<SceneNode, EventHandler>,
): void {
  const { path } = event;
  if (path.length === 0) return;

  const targetIdx = path.length - 1;

  // Capture phase: root → parent of target
  for (let i = 0; i < targetIdx; i++) {
    if (event.stopped) return;
    const handler = handlers.get(path[i]!);
    if (handler) {
      event.phase = 'capture';
      handler(event);
    }
  }

  // Target phase
  if (event.stopped) return;
  const targetHandler = handlers.get(path[targetIdx]!);
  if (targetHandler) {
    event.phase = 'target';
    targetHandler(event);
  }

  // Bubble phase: parent of target → root
  for (let i = targetIdx - 1; i >= 0; i--) {
    if (event.stopped) return;
    const handler = handlers.get(path[i]!);
    if (handler) {
      event.phase = 'bubble';
      handler(event);
    }
  }
}

/**
 * Create a NoPointerEvent with sensible defaults.
 */
export function createEvent(
  type: NoPointerEvent['type'],
  target: SceneNode,
  path: SceneNode[],
  x: number,
  y: number,
  localX: number,
  localY: number,
  timestamp: number,
  extra?: { deltaX?: number; deltaY?: number },
): NoPointerEvent {
  return {
    type,
    target,
    path,
    x,
    y,
    localX,
    localY,
    phase: 'target',
    stopped: false,
    stopPropagation() {
      this.stopped = true;
    },
    deltaX: extra?.deltaX ?? 0,
    deltaY: extra?.deltaY ?? 0,
    timestamp,
  };
}
