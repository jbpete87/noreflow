import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';
import { HostNode } from './hostNode.js';
import type { TContainer, TextMeta } from './types.js';
import type { MeasureFunction } from 'noreflow';

function buildTextMeasure(node: HostNode): void {
  const font = (node.props['font'] as string | undefined) ?? '400 14px Inter, system-ui, sans-serif';
  const lineHeight = (node.props['lineHeight'] as number | undefined) ?? 20;
  const color = (node.props['color'] as string | undefined) ?? '#000000';
  const textAlign = (node.props['textAlign'] as 'left' | 'center' | 'right' | undefined) ?? 'left';
  const whiteSpace = (node.props['whiteSpace'] as 'normal' | 'pre-wrap' | undefined) ?? 'normal';

  // For textinput, use value or placeholder for measurement
  let text: string;
  if (node.type === 'textinput') {
    const value = node.props['value'] as string | undefined;
    const placeholder = node.props['placeholder'] as string | undefined;
    text = value || placeholder || '';
  } else {
    text = node.collectText();
  }

  if (!text && node.type !== 'textinput') {
    node.measure = undefined;
    node.textMeta = undefined;
    return;
  }

  const displayText = text || ' ';
  const opts = whiteSpace === 'pre-wrap' ? { whiteSpace: 'pre-wrap' as const } : undefined;
  const prepared = prepareWithSegments(displayText, font, opts);

  const meta: TextMeta = { prepared, font, lineHeight, color, textAlign };
  node.textMeta = meta;

  const measure: MeasureFunction = (availableWidth: number, _availableHeight: number) => {
    if (!isFinite(availableWidth) || availableWidth <= 0) {
      return { width: 0, height: lineHeight };
    }
    const result = layoutWithLines(prepared, availableWidth, lineHeight);
    return { width: availableWidth, height: Math.max(result.height, lineHeight) };
  };
  node.measure = measure;
}

function findContainer(node: HostNode): TContainer | null {
  return (node as unknown as { _container?: TContainer })._container ?? null;
}

export const hostConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: false,

  supportsMicrotasks: true,
  scheduleMicrotask: (fn: () => void) => queueMicrotask(fn),

  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,

  rendererVersion: '0.1.0',
  rendererPackageName: 'tela',
  extraDevToolsConfig: null,

  supportsTestSelectors: false,
  findFiberRoot: () => null,
  getBoundingRect: () => null,
  getTextContent: () => null,
  isHiddenSubtree: () => false,
  matchAccessibilityRole: () => false,
  setFocusIfFocusable: () => false,
  setupIntersectionObserver: () => null,

  getPublicInstance(instance: HostNode) {
    return instance;
  },

  getRootHostContext(_rootContainer: TContainer) {
    return {};
  },

  getChildHostContext(parentHostContext: Record<string, never>, _type: string, _rootContainer: TContainer) {
    return parentHostContext;
  },

  createInstance(type: string, props: Record<string, unknown>, rootContainer: TContainer): HostNode {
    const nodeType = type as HostNode['type'];
    const node = new HostNode(nodeType, props);
    (node as unknown as { _container: TContainer })._container = rootContainer;

    if (nodeType === 'text' || nodeType === 'textinput') {
      buildTextMeasure(node);
    }

    return node;
  },

  createTextInstance(text: string, rootContainer: TContainer): HostNode {
    const node = new HostNode('_rawtext', {});
    node.rawText = text;
    (node as unknown as { _container: TContainer })._container = rootContainer;
    return node;
  },

  shouldSetTextContent(_type: string, _props: Record<string, unknown>): boolean {
    return false;
  },

  appendInitialChild(parent: HostNode, child: HostNode): void {
    parent.appendChild(child);
  },

  appendChild(parent: HostNode, child: HostNode): void {
    parent.appendChild(child);
    markDirty(parent);
  },

  appendChildToContainer(container: TContainer, child: HostNode): void {
    container.rootNode.appendChild(child);
    container.dirty = true;
  },

  removeChild(parent: HostNode, child: HostNode): void {
    parent.removeChild(child);
    markDirty(parent);
  },

  removeChildFromContainer(container: TContainer, child: HostNode): void {
    container.rootNode.removeChild(child);
    container.dirty = true;
  },

  insertBefore(parent: HostNode, child: HostNode, before: HostNode): void {
    parent.insertBefore(child, before);
    markDirty(parent);
  },

  insertInContainerBefore(container: TContainer, child: HostNode, before: HostNode): void {
    container.rootNode.insertBefore(child, before);
    container.dirty = true;
  },

  finalizeInitialChildren(_instance: HostNode, _type: string, _props: Record<string, unknown>): boolean {
    return false;
  },

  commitUpdate(
    instance: HostNode,
    _type: string,
    _oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>,
    _internalHandle: unknown,
  ): void {
    instance.updateProps(newProps);
    if (instance.type === 'text' || instance.type === 'textinput') {
      buildTextMeasure(instance);
    }
    markDirty(instance);
  },

  commitTextUpdate(instance: HostNode, _oldText: string, newText: string): void {
    instance.rawText = newText;
    const parent = instance.parent;
    if (parent?.type === 'text') {
      buildTextMeasure(parent);
    }
    markDirty(instance);
  },

  commitMount(): void {},

  resetTextContent(_instance: HostNode): void {},

  prepareForCommit(_containerInfo: TContainer): null {
    return null;
  },

  resetAfterCommit(containerInfo: TContainer): void {
    containerInfo.dirty = true;
    containerInfo.onCommit?.();
  },

  preparePortalMount(): void {},

  clearContainer(_container: TContainer): void {},

  hideInstance(instance: HostNode): void {
    instance.style = { ...instance.style, display: 'none' as const };
    markDirty(instance);
  },

  hideTextInstance(instance: HostNode): void {
    instance.rawText = '';
    markDirty(instance);
  },

  unhideInstance(instance: HostNode, props: Record<string, unknown>): void {
    instance.updateProps(props);
    markDirty(instance);
  },

  unhideTextInstance(instance: HostNode, text: string): void {
    instance.rawText = text;
    markDirty(instance);
  },

  getInstanceFromNode(): null {
    return null;
  },

  setCurrentUpdatePriority(_newPriority: number): void {},
  getCurrentUpdatePriority(): number { return 0; },
  resolveUpdatePriority(): number { return 0; },

  shouldAttemptEagerTransition(): boolean { return false; },

  detachDeletedInstance(): void {},

  maySuspendCommit(): boolean { return false; },
  preloadInstance(): boolean { return true; },
  startSuspendingCommit(): void {},
  suspendInstance(): void {},
  waitForCommitToBeReady(): null { return null; },

  NotPendingTransition: null as unknown,
  HostTransitionContext: { $$typeof: Symbol.for('react.context'), _currentValue: null } as unknown,
  resetFormInstance(): void {},

  cloneMutableInstance: undefined,
  cloneMutableTextInstance: undefined,
};

function markDirty(node: HostNode): void {
  const container = findContainer(node);
  if (container) container.dirty = true;
}
