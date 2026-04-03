import { useRef, useEffect, useCallback } from 'react';
import { computeLayout } from 'noreflow';
import type { LayoutResult } from 'noreflow';
import { createPointerSession, createScrollState } from 'nopointer';
import type { NoPointerEvent, SceneNode } from 'nopointer';
import { TelReconciler } from './reconciler.js';
import { HostNode } from './hostNode.js';
import { paint } from './paint.js';
import { buildSceneTree } from './scene.js';
import type { TContainer, CanvasProps } from './types.js';

function computeContentHeight(layoutNode: LayoutResult): number {
  if (!layoutNode.children || layoutNode.children.length === 0) return 0;
  let maxBottom = 0;
  for (const child of layoutNode.children) {
    const bottom = child.y + child.height;
    if (bottom > maxBottom) maxBottom = bottom;
  }
  return maxBottom;
}

function updateScrollBounds(hostNode: HostNode, layoutNode: LayoutResult, container: TContainer): void {
  if (hostNode.type === 'scroll') {
    const viewportHeight = layoutNode.height;
    const contentLayout = container.scrollContentLayouts.get(hostNode);
    const contentHeight = contentLayout ? computeContentHeight(contentLayout) : 0;
    const maxScroll = Math.max(0, contentHeight - viewportHeight);
    let state = container.scrollStates.get(hostNode);
    if (!state) {
      state = createScrollState();
      container.scrollStates.set(hostNode, state);
    }
    const prevMax = (state as unknown as { _prevMax?: number })._prevMax;
    const wasAtBottom = prevMax === undefined || state.offset >= prevMax - 1;
    state.setBounds(0, maxScroll);
    if (wasAtBottom && maxScroll > 0) {
      state.scrollTo(maxScroll);
    }
    (state as unknown as { _prevMax: number })._prevMax = maxScroll;
  }
  if (hostNode.type === 'scroll') {
    const contentLayout = container.scrollContentLayouts.get(hostNode);
    if (contentLayout) {
      for (let i = 0; i < hostNode.children.length; i++) {
        const childHost = hostNode.children[i]!;
        if (childHost.type === '_rawtext') continue;
        const childLayout = contentLayout.children[i];
        if (childLayout) {
          updateScrollBounds(childHost, childLayout, container);
        }
      }
    }
  } else {
    for (let i = 0; i < hostNode.children.length; i++) {
      const childHost = hostNode.children[i]!;
      const childLayout = layoutNode.children[i];
      if (childLayout && childHost.type !== '_rawtext') {
        updateScrollBounds(childHost, childLayout, container);
      }
    }
  }
}

function computeScrollContentLayouts(
  hostNode: HostNode,
  layoutNode: LayoutResult,
  container: TContainer,
): void {
  if (hostNode.type === 'scroll' && hostNode.children.length > 0) {
    const scrollWidth = layoutNode.width;
    const contentChildren = hostNode.scrollContentFlexNodes();
    const contentLayout = computeLayout(
      { style: { width: scrollWidth, flexDirection: hostNode.style.flexDirection as 'column' | undefined }, children: contentChildren },
      scrollWidth,
      Infinity,
    );
    container.scrollContentLayouts.set(hostNode, contentLayout);
  }
  // Recurse into non-scroll children (scroll children are handled via contentLayout)
  for (let i = 0; i < hostNode.children.length; i++) {
    const childHost = hostNode.children[i]!;
    if (childHost.type === '_rawtext') continue;
    // For scroll nodes, find children in the scroll content layout
    if (hostNode.type === 'scroll') {
      const contentLayout = container.scrollContentLayouts.get(hostNode);
      const childLayout = contentLayout?.children[i];
      if (childLayout) {
        computeScrollContentLayouts(childHost, childLayout, container);
      }
    } else {
      const childLayout = layoutNode.children[i];
      if (childLayout) {
        computeScrollContentLayouts(childHost, childLayout, container);
      }
    }
  }
}

export function Canvas({ width, height, style, className, children }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<TContainer | null>(null);
  const fiberRootRef = useRef<ReturnType<typeof TelReconciler.createContainer> | null>(null);
  const rafRef = useRef<number>(0);

  const doLayoutAndPaint = useCallback(() => {
    const container = containerRef.current;
    if (!container || container.rootNode.children.length === 0) return;

    try {
      const flexTree = container.rootNode.toFlexNode();
      const layoutResult = computeLayout(
        { style: { width: container.width, height: container.height }, children: flexTree.children },
        container.width,
        container.height,
      );
      container.layoutResult = layoutResult;

      // Compute scroll content layouts separately with unconstrained height
      container.scrollContentLayouts.clear();
      computeScrollContentLayouts(container.rootNode, layoutResult, container);

      container.scene = buildSceneTree(container.rootNode, layoutResult, container.scrollContentLayouts);
      updateScrollBounds(container.rootNode, layoutResult, container);

      const { ctx } = container;
      const dpr = container.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, container.width, container.height);

      const scrollOffsets = new Map<HostNode, number>();
      for (const [node, state] of container.scrollStates) {
        scrollOffsets.set(node, state.offset);
      }

      paint({
        ctx, scrollOffsets,
        scrollContentLayouts: container.scrollContentLayouts,
        focusedNode: container.focusedNode,
        cursorPos: container.cursorPos,
        cursorVisible: container.cursorVisible,
      }, container.rootNode, layoutResult, 0, 0);
      container.dirty = false;
    } catch (err) {
      console.error('[tela] paint error:', err);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const rootNode = new HostNode('_root');

    // Hidden input for capturing keyboard events
    const hiddenInput = document.createElement('input');
    hiddenInput.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;left:-9999px;top:-9999px;';
    hiddenInput.setAttribute('autocomplete', 'off');
    hiddenInput.setAttribute('autocapitalize', 'off');
    hiddenInput.setAttribute('autocorrect', 'off');
    hiddenInput.setAttribute('spellcheck', 'false');
    canvas.parentElement?.appendChild(hiddenInput);

    const container: TContainer = {
      rootNode, canvas, ctx, width, height, dpr,
      scene: null, layoutResult: null, pointerSession: null,
      scrollStates: new Map(), scrollContentLayouts: new Map(),
      focusedNode: null, cursorPos: 0, cursorVisible: true, hiddenInput,
      _valueFromUserInput: false, dirty: true,
      onCommit: () => { container.dirty = true; },
    };
    containerRef.current = container;

    const fiberRoot = TelReconciler.createContainer(
      container, 0, null, false, null, 'tela',
      (err: unknown) => console.error('[tela] uncaught:', err),
      (err: unknown) => console.error('[tela] caught:', err),
      (err: unknown) => console.error('[tela] recoverable:', err),
      null,
    );
    fiberRootRef.current = fiberRoot;

    if (typeof TelReconciler.updateContainerSync === 'function') {
      TelReconciler.updateContainerSync(children, fiberRoot, null, null);
    } else {
      TelReconciler.updateContainer(children, fiberRoot, null, null);
    }

    const session = createPointerSession();
    container.pointerSession = session;

    const findHandler = (path: SceneNode[], prop: string): (() => void) | undefined => {
      for (let i = path.length - 1; i >= 0; i--) {
        const node = path[i]?.data as HostNode | undefined;
        const fn = node?.props[prop] as (() => void) | undefined;
        if (fn) return fn;
      }
      return undefined;
    };

    // Focus a textinput node
    const focusTextInput = (node: HostNode) => {
      container.focusedNode = node;
      const val = (node.props['value'] as string) ?? '';
      container.cursorPos = val.length;
      container.cursorVisible = true;
      hiddenInput.value = val;
      hiddenInput.setSelectionRange(val.length, val.length);
      hiddenInput.focus();
      container.dirty = true;
    };

    const blurTextInput = () => {
      container.focusedNode = null;
      container.cursorVisible = false;
      container.dirty = true;
    };

    const onHiddenInput = () => {
      const node = container.focusedNode;
      if (!node || node.type !== 'textinput') return;
      container._valueFromUserInput = true;
      const cb = node.props['onChangeText'] as ((t: string) => void) | undefined;
      cb?.(hiddenInput.value);
      container.cursorPos = hiddenInput.selectionStart ?? hiddenInput.value.length;
      container.dirty = true;
    };

    const onHiddenKeyDown = (e: KeyboardEvent) => {
      const node = container.focusedNode;
      if (!node || node.type !== 'textinput') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        const submit = node.props['onSubmit'] as (() => void) | undefined;
        submit?.();
      }
    };

    const onHiddenBlur = () => {
      blurTextInput();
    };

    hiddenInput.addEventListener('input', onHiddenInput);
    hiddenInput.addEventListener('keydown', onHiddenKeyDown);
    hiddenInput.addEventListener('blur', onHiddenBlur);

    // Cursor blink interval
    const blinkInterval = setInterval(() => {
      if (container.focusedNode) {
        container.cursorVisible = !container.cursorVisible;
        container.dirty = true;
      }
    }, 530);

    const handleEvents = (events: NoPointerEvent[]) => {
      for (const ev of events) {
        if (ev.type === 'tap') {
          // Check if tap hit a textinput
          let hitTextInput = false;
          for (let i = ev.path.length - 1; i >= 0; i--) {
            const node = ev.path[i]?.data as HostNode | undefined;
            if (node?.type === 'textinput') {
              focusTextInput(node);
              hitTextInput = true;
              break;
            }
          }
          if (!hitTextInput && container.focusedNode) {
            hiddenInput.blur();
          }
          if (!hitTextInput) {
            findHandler(ev.path, 'onPress')?.();
          }
        }
        else if (ev.type === 'pointerdown') findHandler(ev.path, 'onPressIn')?.();
        else if (ev.type === 'pointerup') findHandler(ev.path, 'onPressOut')?.();
        else if (ev.type === 'pointerenter') findHandler(ev.path, 'onHoverIn')?.();
        else if (ev.type === 'pointerleave') findHandler(ev.path, 'onHoverOut')?.();
        else if (ev.type === 'wheel' || ev.type === 'scroll') {
          for (let i = ev.path.length - 1; i >= 0; i--) {
            const node = ev.path[i]?.data as HostNode | undefined;
            if (node?.type === 'scroll') {
              let scrollState = container.scrollStates.get(node);
              if (!scrollState) { scrollState = createScrollState(); container.scrollStates.set(node, scrollState); }
              scrollState.scrollBy(ev.deltaY ?? 0);
              container.dirty = true;
              break;
            }
          }
        }
      }
      const hovered = session.hoveredNode as { cursor?: string; data?: unknown } | null;
      const hoveredHost = hovered?.data as HostNode | undefined;
      const cursor = hoveredHost?.type === 'textinput' ? 'text' : hovered?.cursor ?? 'default';
      canvas.style.cursor = cursor;
    };

    const getXY = (e: PointerEvent | WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onPointerDown = (e: PointerEvent) => { if (container.scene) { const p = getXY(e); handleEvents(session.down(p.x, p.y, container.scene, e.timeStamp)); } };
    const onPointerMove = (e: PointerEvent) => { if (container.scene) { const p = getXY(e); handleEvents(session.move(p.x, p.y, container.scene, e.timeStamp)); } };
    const onPointerUp = (e: PointerEvent) => { if (container.scene) { const p = getXY(e); handleEvents(session.up(p.x, p.y, container.scene, e.timeStamp)); } };
    const onWheel = (e: WheelEvent) => { if (container.scene) { const p = getXY(e); handleEvents(session.wheel(p.x, p.y, e.deltaX, e.deltaY, container.scene, e.timeStamp)); e.preventDefault(); } };
    const onPointerLeave = () => { handleEvents(session.cancel()); };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerleave', onPointerLeave);

    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      for (const s of container.scrollStates.values()) { if (s.isAnimating) { s.tick(dt); container.dirty = true; } }
      if (container.dirty) doLayoutAndPaint();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(blinkInterval);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      hiddenInput.removeEventListener('input', onHiddenInput);
      hiddenInput.removeEventListener('keydown', onHiddenKeyDown);
      hiddenInput.removeEventListener('blur', onHiddenBlur);
      hiddenInput.remove();
      TelReconciler.updateContainer(null, fiberRoot, null, null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = containerRef.current;
    if (c) {
      c.width = width;
      c.height = height;
      const dpr = window.devicePixelRatio || 1;
      c.dpr = dpr;
      c.canvas.width = width * dpr;
      c.canvas.height = height * dpr;
      c.dirty = true;
    }
  }, [width, height]);

  useEffect(() => {
    const fr = fiberRootRef.current;
    if (fr) {
      if (typeof TelReconciler.updateContainerSync === 'function') {
        TelReconciler.updateContainerSync(children, fr, null, null);
      } else {
        TelReconciler.updateContainer(children, fr, null, null);
      }
      const c = containerRef.current;
      if (c) {
        c.dirty = true;
        // Only sync hidden input for programmatic value changes (e.g. clearing on send).
        // Skip when the change originated from user typing — the hidden input already
        // has the correct value and overwriting it would race with ongoing keystrokes.
        if (!c._valueFromUserInput && c.focusedNode?.type === 'textinput' && c.hiddenInput) {
          const newVal = (c.focusedNode.props['value'] as string) ?? '';
          if (c.hiddenInput.value !== newVal) {
            c.hiddenInput.value = newVal;
            c.cursorPos = newVal.length;
            c.hiddenInput.setSelectionRange(newVal.length, newVal.length);
          }
        }
        c._valueFromUserInput = false;
      }
    }
  }, [children]);

  return (
    <canvas
      ref={canvasRef}
      width={width * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)}
      height={height * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)}
      style={{ ...style, width, height, touchAction: 'none' }}
      className={className}
    />
  );
}
