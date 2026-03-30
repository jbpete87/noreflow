import { useRef, useCallback, useEffect, useState } from 'react';
import { computeLayout } from 'noreflow';
import type { StreamMessage, StreamChatConfig, StreamTheme } from './types';
import { DEFAULT_CONFIG, DEFAULT_THEME } from './types';
import { measureMessage, buildChatLayout, type MeasuredMessage } from './layout';
import { createTextHandle } from './textMeasure';
import { drawChat } from './renderer';

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
}

export function useStreamLayout(opts: UseStreamLayoutOpts): UseStreamLayoutResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const messagesRef = useRef<MeasuredMessage[]>([]);
  const streamingIdxRef = useRef(-1);
  const rafRef = useRef(0);
  const [nodeCount, setNodeCount] = useState(0);

  // Keep latest opts in a ref so callbacks never go stale and never change identity
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const configRef = useRef<Required<StreamChatConfig>>(
    { ...DEFAULT_CONFIG, ...(opts.config ?? {}) } as Required<StreamChatConfig>,
  );
  configRef.current = { ...DEFAULT_CONFIG, ...(opts.config ?? {}) } as Required<StreamChatConfig>;

  const themeRef = useRef<StreamTheme>({ ...DEFAULT_THEME, ...(opts.theme ?? {}) });
  themeRef.current = { ...DEFAULT_THEME, ...(opts.theme ?? {}) };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const o = optsRef.current;
    const config = configRef.current;
    const theme = themeRef.current;

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

    let streamingHeight = 0;
    let streamingLines = 0;
    const sIdx = streamingIdxRef.current;
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
    });

    rafRef.current = requestAnimationFrame(draw);
  }, []); // stable — reads everything from refs

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
  }, []); // stable

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
  }, []); // stable

  const clearMessages = useCallback(() => {
    messagesRef.current = [];
    streamingIdxRef.current = -1;
  }, []);

  const setStreamingIdx = useCallback((idx: number) => {
    streamingIdxRef.current = idx;
  }, []);

  return { canvasRef, addMessage, updateMessage, clearMessages, setStreamingIdx, nodeCount };
}
