import { describe, it, expect } from 'vitest';
import { hitTest } from '../src/hitTest.js';
import type { SceneNode } from '../src/types.js';

function scene(
  x: number, y: number, w: number, h: number,
  opts?: Partial<Omit<SceneNode, 'layout'>>,
): SceneNode {
  return {
    layout: { x, y, width: w, height: h, children: [] },
    ...opts,
  };
}

describe('hitTest', () => {
  it('hits a single root node', () => {
    const root = scene(0, 0, 100, 100);
    const result = hitTest(root, 50, 50);
    expect(result).not.toBeNull();
    expect(result!.node).toBe(root);
    expect(result!.localX).toBe(50);
    expect(result!.localY).toBe(50);
    expect(result!.path).toEqual([root]);
  });

  it('returns null when outside bounds', () => {
    const root = scene(0, 0, 100, 100);
    expect(hitTest(root, 150, 50)).toBeNull();
    expect(hitTest(root, 50, 150)).toBeNull();
    expect(hitTest(root, -1, 50)).toBeNull();
  });

  it('hits the deepest nested child', () => {
    const child = scene(10, 10, 30, 30);
    const root = scene(0, 0, 100, 100, { children: [child] });

    const result = hitTest(root, 15, 15);
    expect(result).not.toBeNull();
    expect(result!.node).toBe(child);
    expect(result!.path).toEqual([root, child]);
    expect(result!.localX).toBe(5);
    expect(result!.localY).toBe(5);
  });

  it('falls through to parent when child is missed', () => {
    const child = scene(10, 10, 30, 30);
    const root = scene(0, 0, 100, 100, { children: [child] });

    const result = hitTest(root, 80, 80);
    expect(result).not.toBeNull();
    expect(result!.node).toBe(root);
  });

  it('respects zIndex — higher zIndex sibling wins', () => {
    const a = scene(0, 0, 50, 50, { data: 'a', zIndex: 1 });
    const b = scene(0, 0, 50, 50, { data: 'b', zIndex: 2 });
    const root = scene(0, 0, 100, 100, { children: [a, b] });

    const result = hitTest(root, 25, 25);
    expect(result!.node).toBe(b);
  });

  it('respects zIndex — later sibling with lower zIndex loses', () => {
    const a = scene(0, 0, 50, 50, { data: 'a', zIndex: 5 });
    const b = scene(0, 0, 50, 50, { data: 'b', zIndex: 1 });
    const root = scene(0, 0, 100, 100, { children: [a, b] });

    const result = hitTest(root, 25, 25);
    expect(result!.node).toBe(a);
  });

  it('equal zIndex — later sibling wins (source order)', () => {
    const a = scene(0, 0, 50, 50, { data: 'a' });
    const b = scene(0, 0, 50, 50, { data: 'b' });
    const root = scene(0, 0, 100, 100, { children: [a, b] });

    const result = hitTest(root, 25, 25);
    expect(result!.node).toBe(b);
  });

  it('hitArea: none — pointer passes through', () => {
    const overlay = scene(0, 0, 100, 100, { hitArea: 'none', data: 'overlay' });
    const behind = scene(0, 0, 100, 100, { data: 'behind' });
    const root = scene(0, 0, 100, 100, { children: [behind, overlay] });

    const result = hitTest(root, 50, 50);
    expect(result!.node).toBe(behind);
  });

  it('clip — children outside clipped parent are not hit', () => {
    const child = scene(80, 0, 50, 50);
    const clipParent = scene(0, 0, 100, 100, { clip: true, children: [child] });
    const root = scene(0, 0, 200, 200, { children: [clipParent] });

    // Point at (120, 25) is inside the child's rect (80..130, 0..50)
    // but outside the clipParent's rect (0..100, 0..100) — should not hit
    const result = hitTest(root, 120, 25);
    expect(result!.node).toBe(root);
  });

  it('clip — children inside clipped parent are hit', () => {
    const child = scene(10, 10, 30, 30);
    const clipParent = scene(0, 0, 100, 100, { clip: true, children: [child] });
    const root = scene(0, 0, 200, 200, { children: [clipParent] });

    const result = hitTest(root, 15, 15);
    expect(result!.node).toBe(child);
  });

  it('deeply nested — 3 levels', () => {
    const grandchild = scene(5, 5, 10, 10, { data: 'gc' });
    const child = scene(10, 10, 40, 40, { children: [grandchild] });
    const root = scene(0, 0, 100, 100, { children: [child] });

    const result = hitTest(root, 18, 18);
    expect(result!.node).toBe(grandchild);
    expect(result!.path).toEqual([root, child, grandchild]);
    // localX: 18 - (0+10+5) = 3, localY: 18 - (0+10+5) = 3
    expect(result!.localX).toBe(3);
    expect(result!.localY).toBe(3);
  });

  it('returns null for empty scene with hitArea none', () => {
    const root = scene(0, 0, 100, 100, { hitArea: 'none' });
    expect(hitTest(root, 50, 50)).toBeNull();
  });

  it('handles offset root node', () => {
    const root = scene(50, 50, 100, 100);
    expect(hitTest(root, 0, 0)).toBeNull();
    const result = hitTest(root, 75, 75);
    expect(result!.node).toBe(root);
    expect(result!.localX).toBe(25);
    expect(result!.localY).toBe(25);
  });
});
