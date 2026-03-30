import type { SceneNode } from './types.js';

export interface FocusManager {
  /** Currently focused node, or null. */
  readonly focused: SceneNode | null;

  /** Focus a specific node. */
  focus(node: SceneNode): void;

  /** Clear focus. */
  blur(): void;

  /** Move focus to the next focusable node in tab order. */
  tabNext(scene: SceneNode): void;

  /** Move focus to the previous focusable node in tab order. */
  tabPrev(scene: SceneNode): void;
}

/**
 * A node is focusable if it has `data` with a truthy `focusable` property,
 * or if it has a `cursor` set (interactive intent), or if it's `scrollable`.
 */
function isFocusable(node: SceneNode): boolean {
  if (node.scrollable) return true;
  if (node.cursor && node.cursor !== 'default') return true;
  if (node.data && typeof node.data === 'object' && 'focusable' in node.data) {
    return !!(node.data as Record<string, unknown>).focusable;
  }
  return false;
}

/**
 * Collect all focusable nodes in depth-first (tab) order.
 */
function collectFocusable(node: SceneNode, out: SceneNode[]): void {
  if (isFocusable(node)) {
    out.push(node);
  }
  if (node.children) {
    for (const child of node.children) {
      collectFocusable(child, out);
    }
  }
}

export function createFocusManager(): FocusManager {
  let focused: SceneNode | null = null;

  return {
    get focused() {
      return focused;
    },

    focus(node: SceneNode): void {
      focused = node;
    },

    blur(): void {
      focused = null;
    },

    tabNext(scene: SceneNode): void {
      const nodes: SceneNode[] = [];
      collectFocusable(scene, nodes);
      if (nodes.length === 0) return;

      if (focused === null) {
        focused = nodes[0]!;
        return;
      }

      const idx = nodes.indexOf(focused);
      focused = nodes[(idx + 1) % nodes.length]!;
    },

    tabPrev(scene: SceneNode): void {
      const nodes: SceneNode[] = [];
      collectFocusable(scene, nodes);
      if (nodes.length === 0) return;

      if (focused === null) {
        focused = nodes[nodes.length - 1]!;
        return;
      }

      const idx = nodes.indexOf(focused);
      focused = nodes[(idx - 1 + nodes.length) % nodes.length]!;
    },
  };
}
