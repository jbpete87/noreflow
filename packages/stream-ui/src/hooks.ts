import { useRef, useCallback, useEffect, useState } from 'react';
import { computeLayout } from 'noreflow';
import { createPointerSession, createScrollState } from 'nopointer';
import type { PointerSession, ScrollState, NoPointerEvent } from 'nopointer';
import type { StreamMessage, StreamChatConfig, StreamTheme } from './types';
import { DEFAULT_CONFIG, DEFAULT_THEME } from './types';
import { measureMessage, buildChatLayout, type MeasuredMessage } from './layout';
import { createTextHandle } from './textMeasure';
import { drawChat } from './renderer';
import { buildChatScene } from './scene';

export interface UseStreamLayoutResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  addMessage: (msg: StreamMessage) => void;
  updateMessage: (id: string | number, text: string) => void;
  clearMessages: () => void;
  setStreamingIdx: (idx: number) => void;
  nodeCount: number;
}

export interface UseStreamLayoutOpts {
  config?: StreamChatConfig;
  theme?: StreamTheme;
  sidebarItems?: string[];
  title?: string;
  subtitle?: string;
  placeholder?: string;
  onFrame?: (stats: { nodeCount: number; layoutMs: number }) => void;
  onSidebarItemClick?: (index: number) => void;
  onSendClick?: () => void;
}

export function useStreamLayout(opts: UseStreamLayoutOpts): UseStreamLayoutResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const messagesRef = useRef<MeasuredMessage[]>([]);
  const streamingIdxRef = useRef(-1);
  const rafRef = useRef(0);
  const [nodeCount, setNodeCount] = useState(0);

  const optsRef = useRef(opts);
  optsRef.current = opts;

  const configRef = useRef<Required<StreamChatConfig>>(
    { ...DEFAULT_CONFIG, ...(opts.config ?? {}) } as Required<StreamChatConfig>,
  );
  configRef.current = { ...DEFAULT_CONFIG, ...(opts.config ?? {}) } as Required<StreamChatConfig>;

  const themeRef = useRef<StreamTheme>({ ...DEFAULT_THEME, ...(opts.theme ?? {}) });
  themeRef.current = { ...DEFAULT_THEME, ...(opts.theme ?? {}) };

  // nopointer state
  const sessionRef = useRef<PointerSession>(createPointerSession());
  const scrollRef = useRef<ScrollState>(createScrollState({ friction: 0.994 }));
  const hoveredItemRef = useRef(-1);
  const lastFrameTimeRef = useRef(0);
  // Track whether user has manually scrolled away from bottom
  const userScrolledRef = useRef(false);

  const handleEvents = useCallback((events: NoPointerEvent[]) => {
    const o = optsRef.current;
    for (const evt of events) {
      if (evt.type === 'wheel') {
        scrollRef.current.scrollBy(evt.deltaY);
        userScrolledRef.current = true;
      }
      if (evt.type === 'scroll') {
        scrollRef.current.scrollBy(-evt.deltaY);
        userScrolledRef.current = true;
      }
      if (evt.type === 'scrollend') {
        // Fling: use the last delta as an impulse
        scrollRef.current.impulse(-evt.deltaY * 0.02);
      }
      if (evt.type === 'pointerenter' || evt.type === 'pointerleave') {
        const data = evt.target.data as Record<string, unknown> | undefined;
        if (data?.role === 'sidebarItem') {
          hoveredItemRef.current = evt.type === 'pointerenter'
            ? (data.index as number)
            : -1;
        }
      }
      if (evt.type === 'tap') {
        const data = evt.target.data as Record<string, unknown> | undefined;
        if (data?.role === 'sidebarItem' && o.onSidebarItemClick) {
          o.onSidebarItemClick(data.index as number);
        }
        if (data?.role === 'sendBtn' && o.onSendClick) {
          o.onSendClick();
        }
      }
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const o = optsRef.current;
    const config = configRef.current;
    const theme = themeRef.current;
    const scroll = scrollRef.current;

    const now = performance.now();
    const dt = lastFrameTimeRef.current > 0 ? now - lastFrameTimeRef.current : 16;
    lastFrameTimeRef.current = now;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const measured = messagesRef.current;

    const t0 = performance.now();
    const chatLayout = buildChatLayout(
      measured, W, H, o.sidebarItems ?? [], config,
    );
    const msgsLayout = computeLayout(chatLayout.messages);
    const headerLayout = computeLayout(chatLayout.header);
    const inputLayout = computeLayout(chatLayout.inputBar);
    const sidebarLayout = chatLayout.sidebar ? computeLayout(chatLayout.sidebar) : null;
    const layoutMs = performance.now() - t0;

    setNodeCount(chatLayout.nodeCount);
    o.onFrame?.({ nodeCount: chatLayout.nodeCount, layoutMs });

    // Update scroll bounds based on content height
    const visibleHeight = H - config.headerHeight - config.inputHeight;
    const maxScroll = Math.max(0, msgsLayout.height - visibleHeight);
    scroll.setBounds(0, maxScroll);

    // Auto-scroll to bottom during streaming (unless user manually scrolled up)
    const sIdx = streamingIdxRef.current;
    if (sIdx >= 0 && !userScrolledRef.current) {
      scroll.scrollTo(maxScroll);
    }

    // Snap back to auto-scroll if user scrolls near the bottom
    if (userScrolledRef.current && scroll.offset >= maxScroll - 5) {
      userScrolledRef.current = false;
    }

    // Tick scroll momentum
    scroll.tick(dt);

    let streamingHeight = 0;
    let streamingLines = 0;
    if (sIdx >= 0 && sIdx < msgsLayout.children.length) {
      const ml = msgsLayout.children[sIdx]!;
      const contentCol = ml.children[1];
      if (contentCol) {
        const textNode = contentCol.children[1];
        if (textNode) {
          streamingHeight = textNode.height;
          const mm = measured[sIdx];
          if (mm) {
            streamingLines = mm.textHandle.getLines(textNode.width).length;
          }
        }
      }
    }

    // Build scene for hit-testing (stored in ref for event handlers)
    sceneRef.current = buildChatScene(
      msgsLayout, headerLayout, inputLayout, sidebarLayout,
      chatLayout.showSidebar, chatLayout.contentWidth,
      W, H, config,
    );

    drawChat(ctx, {
      msgsLayout, headerLayout, inputLayout, sidebarLayout,
      messages: measured,
      canvasW: W, canvasH: H,
      showSidebar: chatLayout.showSidebar,
      contentWidth: chatLayout.contentWidth,
      streamingIdx: sIdx,
      streamingHeight,
      streamingLines,
      sidebarItems: o.sidebarItems,
      title: o.title,
      subtitle: o.subtitle,
      placeholder: o.placeholder,
      theme,
      config,
      scrollOffset: scroll.offset,
      hoveredItemIdx: hoveredItemRef.current,
    });

    // Cursor management
    const session = sessionRef.current;
    const hovered = session.hoveredNode;
    if (hovered?.cursor) {
      canvas.style.cursor = hovered.cursor;
    } else {
      canvas.style.cursor = 'default';
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  const sceneRef = useRef<ReturnType<typeof buildChatScene> | null>(null);

  // Attach pointer/wheel event listeners to the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const session = sessionRef.current;

    function getCanvasCoords(e: PointerEvent | WheelEvent): [number, number] {
      const rect = canvas!.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    }

    function onPointerDown(e: PointerEvent): void {
      if (!sceneRef.current) return;
      const [x, y] = getCanvasCoords(e);
      const events = session.down(x, y, sceneRef.current.root, e.timeStamp);
      handleEvents(events);
    }

    function onPointerMove(e: PointerEvent): void {
      if (!sceneRef.current) return;
      const [x, y] = getCanvasCoords(e);
      const events = session.move(x, y, sceneRef.current.root, e.timeStamp);
      handleEvents(events);
    }

    function onPointerUp(e: PointerEvent): void {
      if (!sceneRef.current) return;
      const [x, y] = getCanvasCoords(e);
      const events = session.up(x, y, sceneRef.current.root, e.timeStamp);
      handleEvents(events);
    }

    function onWheel(e: WheelEvent): void {
      if (!sceneRef.current) return;
      e.preventDefault();
      const [x, y] = getCanvasCoords(e);
      const events = session.wheel(x, y, e.deltaX, e.deltaY, sceneRef.current.root, e.timeStamp);
      handleEvents(events);
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [handleEvents]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const addMessage = useCallback((msg: StreamMessage) => {
    const config = configRef.current;
    const mm = measureMessage(msg, config);
    messagesRef.current = [...messagesRef.current, mm];
    if (messagesRef.current.length > config.maxMessages) {
      messagesRef.current = messagesRef.current.slice(-config.maxMessages);
    }
  }, []);

  const updateMessage = useCallback((id: string | number, text: string) => {
    const config = configRef.current;
    const idx = messagesRef.current.findIndex(m => m.msg.id === id);
    if (idx === -1) return;
    const existing = messagesRef.current[idx]!;
    const font = `400 ${config.fontSize}px Inter, system-ui, sans-serif`;
    const updated: MeasuredMessage = {
      ...existing,
      msg: { ...existing.msg, text },
      textHandle: createTextHandle(text, font, config.lineHeight),
    };
    messagesRef.current = [...messagesRef.current];
    messagesRef.current[idx] = updated;
  }, []);

  const clearMessages = useCallback(() => {
    messagesRef.current = [];
    streamingIdxRef.current = -1;
    scrollRef.current.scrollTo(0);
    userScrolledRef.current = false;
  }, []);

  const setStreamingIdx = useCallback((idx: number) => {
    streamingIdxRef.current = idx;
  }, []);

  return { canvasRef, addMessage, updateMessage, clearMessages, setStreamingIdx, nodeCount };
}
