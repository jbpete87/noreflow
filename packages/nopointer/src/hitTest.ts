import type { SceneNode, HitResult } from './types.js';

/**
 * Find the deepest SceneNode under (x, y) in scene coordinates.
 *
 * Walks the tree depth-first, respecting:
 *  - zIndex ordering among siblings (higher wins)
 *  - clip (skips children whose parent clips and the point is outside)
 *  - hitArea: 'none' (pointer passes through)
 *
 * Coordinates are scene-global. The returned HitResult includes the full
 * path from root to target and pointer coordinates local to the hit node.
 */
export function hitTest(
  scene: SceneNode,
  x: number,
  y: number,
): HitResult | null {
  const path: SceneNode[] = [];
  const result = walkNode(scene, x, y, 0, 0, path);
  if (result === null) return null;
  return result;
}

function walkNode(
  node: SceneNode,
  x: number,
  y: number,
  parentAbsX: number,
  parentAbsY: number,
  pathSoFar: SceneNode[],
): HitResult | null {
  const absX = parentAbsX + node.layout.x;
  const absY = parentAbsY + node.layout.y;

  const inBounds =
    x >= absX &&
    x < absX + node.layout.width &&
    y >= absY &&
    y < absY + node.layout.height;

  if (node.clip && !inBounds) {
    return null;
  }

  pathSoFar.push(node);

  // Walk children — try to find a deeper hit.
  // Sort by zIndex descending so higher z-index children are tested first.
  if (node.children && node.children.length > 0) {
    const ordered = getSortedChildren(node.children);

    for (let i = ordered.length - 1; i >= 0; i--) {
      const child = ordered[i]!;
      const childResult = walkNode(child, x, y, absX, absY, [...pathSoFar]);
      if (childResult !== null) {
        return childResult;
      }
    }
  }

  // No child was hit — check if this node itself is a valid target.
  if (!inBounds || node.hitArea === 'none') {
    return null;
  }

  return {
    node,
    path: pathSoFar,
    localX: x - absX,
    localY: y - absY,
  };
}

/**
 * Returns children sorted by zIndex ascending (so we iterate in reverse
 * to test highest zIndex first). Nodes without zIndex use 0.
 * Stable: preserves source order for equal zIndex.
 */
function getSortedChildren(children: SceneNode[]): SceneNode[] {
  // Fast path: skip sort if no child has a non-zero zIndex
  let needsSort = false;
  for (let i = 0; i < children.length; i++) {
    if (children[i]!.zIndex !== undefined && children[i]!.zIndex !== 0) {
      needsSort = true;
      break;
    }
  }
  if (!needsSort) return children;

  return [...children].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
  );
}
