import type { LayoutResult } from 'noreflow';
import type { SceneNode, CursorStyle, ScrollAxis } from 'nopointer';
import type { HostNode } from './hostNode.js';

export function buildSceneTree(
  hostNode: HostNode,
  layoutResult: LayoutResult,
  scrollContentLayouts?: Map<HostNode, LayoutResult>,
): SceneNode {
  const scene: SceneNode = {
    layout: layoutResult,
    data: hostNode,
  };

  if (hostNode.type === 'pressable') {
    scene.cursor = 'pointer' as CursorStyle;
  } else if (hostNode.type === 'textinput') {
    scene.cursor = 'text' as CursorStyle;
  }

  if (hostNode.type === 'scroll') {
    const dir = (hostNode.props['scrollDirection'] as string | undefined) ?? 'y';
    scene.scrollable = dir as ScrollAxis;
    scene.clip = true;
  }

  // Determine which layout children to use
  const childrenLayout = hostNode.type === 'scroll'
    ? scrollContentLayouts?.get(hostNode)?.children ?? []
    : layoutResult.children;

  if (hostNode.children.length > 0 && childrenLayout.length > 0) {
    const children: SceneNode[] = [];
    for (let i = 0; i < hostNode.children.length; i++) {
      const childHost = hostNode.children[i]!;
      const childLayout = childrenLayout[i];
      if (!childLayout || childHost.type === '_rawtext') continue;
      children.push(buildSceneTree(childHost, childLayout, scrollContentLayouts));
    }
    if (children.length > 0) {
      scene.children = children;
    }
  }

  return scene;
}
