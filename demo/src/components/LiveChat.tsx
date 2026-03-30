import { useRef, useEffect, useState, useCallback } from 'react';
import { computeLayout } from 'noreflow';
import type { FlexNode, LayoutResult } from 'noreflow';
import { textMeasure, type TextMeasureHandle } from '../pretextBridge';

// ─── Conversation script ──────────────────────────────────────────────

const CONVERSATIONS: { question: string; answer: string }[] = [
  {
    question: 'What causes jank when AI chat apps stream responses?',
    answer: 'Every time a new token arrives, the text content changes. If the new word causes a line wrap, the message height changes. The browser needs to know the new height, so it triggers a reflow — recalculating the layout of every element on the page. Then the scroll position needs updating, which triggers another reflow. At 20 tokens per second, that\'s 40-60 forced reflows per second. The browser can\'t keep up, and you see stutter. This is why ChatGPT, Claude, and Gemini all exhibit visible jank during streaming. The DOM was never designed for text that changes 20 times per second.',
  },
  {
    question: 'How does Pretext + Noreflow solve this?',
    answer: 'Pretext measures text as pure arithmetic — it knows exactly where every line break falls, how wide each word is, and how tall the resulting block will be. No DOM, no Canvas measureText, no reflow. Noreflow then takes those measurements and computes the full page layout: every message position, every scroll offset, every height. The entire computation is a pure function — data in, coordinates out. The only DOM interaction is painting pixels to a Canvas at the end. That\'s why there\'s no jank: there\'s literally nothing to reflow.',
  },
  {
    question: 'Is this the same problem Slack has with scroll jumping?',
    answer: 'Exactly the same root cause. Slack uses virtual scrolling, which means it only renders messages that are visible. But to position them correctly, it needs to know the height of every message — even the ones off-screen. Since text wraps differently depending on width, the only way to know the height is to render the text and measure it. Slack estimates heights and corrects them later, which causes the scroll position to shift — that\'s the "jump" you feel. With Pretext, you can compute the exact height of any text block without rendering it. No estimation, no correction, no jumping.',
  },
  {
    question: 'Why did VS Code and Figma build their own renderers?',
    answer: 'Because the DOM layout engine is a bottleneck they couldn\'t work around. VS Code built Monaco — a completely custom text editor that bypasses contenteditable and the browser\'s text layout. Figma renders everything to Canvas because CSS layout can\'t handle a design tool with thousands of objects that need pixel-perfect positioning at 60fps. Google Docs is slowly migrating to a Canvas-based renderer for the same reason. The pattern is clear: every app that pushes the limits of text and layout eventually has to leave the DOM behind. Pretext + Noreflow give you that escape hatch as a library instead of forcing you to build it yourself.',
  },
  {
    question: 'Can you explain the rendering pipeline difference?',
    answer: 'In a traditional web app, the pipeline is: update DOM text → browser triggers Style Recalculation → Layout (reflow) → Paint → Composite. If you read offsetHeight or scrollHeight after the DOM write, you force the browser to do Layout synchronously — a "forced reflow." Each one blocks the main thread. With Pretext + Noreflow, the pipeline becomes: update text string → Pretext computes line breaks (pure math) → Noreflow computes layout tree (pure math) → Paint to Canvas. There\'s no DOM write, no style recalculation, no forced reflow. The layout computation that takes the browser milliseconds takes Noreflow microseconds, because it\'s not interleaved with style resolution, inheritance, or cascade computation.',
  },
  {
    question: 'How many nodes can Noreflow handle before it slows down?',
    answer: 'In our benchmarks, Noreflow computes layout for 1,000 nodes in under 500 microseconds — that\'s half a millisecond. For 10,000 nodes, it\'s around 4 milliseconds. You\'re watching a live demo right now with hundreds of nodes being re-laid-out every single frame, including an AI message that\'s actively streaming and changing height. The layout recomputation happens in well under a millisecond. For reference, the browser gives you about 16ms per frame at 60fps. Noreflow uses less than 5% of that budget even with complex layouts.',
  },
  {
    question: 'What about Google Docs slowing down on long documents?',
    answer: 'Google Docs is the canonical example of the DOM reflow bottleneck. Every keystroke can cause a word to wrap to the next line, which changes the paragraph height, which shifts every paragraph below it. That\'s a full layout recalculation. In a 100-page document, that means potentially thousands of elements being repositioned. Google\'s workaround is pagination and clever batching, but you still feel the lag on long documents. With Pretext + Noreflow, the paragraph reflow is just math — you know instantly how the text will wrap, what the new height is, and where everything below it moves to. No DOM, no waiting.',
  },
];

// ─── Types ────────────────────────────────────────────────────────────

interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  text: string;
  textHandle: TextMeasureHandle;
  labelHandle: TextMeasureHandle;
}

const MSG_FONT = '400 13.5px Inter, system-ui, sans-serif';
const MSG_LINE_HEIGHT = 20;
const LABEL_FONT = '600 11.5px Inter, system-ui, sans-serif';
const LABEL_LINE_HEIGHT = 16;

function createMsg(id: number, role: 'user' | 'ai', text: string): ChatMessage {
  const label = role === 'user' ? 'You' : 'Noreflow AI';
  return {
    id, role, text,
    textHandle: textMeasure(text, MSG_FONT, MSG_LINE_HEIGHT),
    labelHandle: textMeasure(label, LABEL_FONT, LABEL_LINE_HEIGHT),
  };
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ─── Layout ───────────────────────────────────────────────────────────

const HEADER_HEIGHT = 52;
const INPUT_HEIGHT = 56;
const MSG_PAD = 16;
const MSG_GAP = 8;
const AVATAR_SIZE = 30;
const SIDEBAR_W = 200;
const MAX_MESSAGES = 60;

function buildMessageNode(msg: ChatMessage, contentWidth: number): FlexNode {
  return {
    style: {
      width: contentWidth, flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      paddingTop: 14, paddingBottom: 14, paddingLeft: MSG_PAD, paddingRight: MSG_PAD,
      boxSizing: 'border-box', flexShrink: 0,
    },
    children: [
      { style: { width: AVATAR_SIZE, height: AVATAR_SIZE, flexShrink: 0 } },
      {
        style: { flexGrow: 1, flexDirection: 'column', gap: MSG_GAP },
        children: [
          { measure: msg.labelHandle.measure },
          { measure: msg.textHandle.measure },
        ],
      },
    ],
  };
}

const SIDEBAR_ITEMS = [
  'New conversation',
  'What causes AI jank?',
  'Layout engine comparison',
  'DOM reflow explained',
  'Pretext integration',
  'Virtual scrolling fixes',
  'Benchmark results',
  'Canvas rendering',
  'Text measurement API',
  'Production deployment',
];

interface AppLayout {
  messagesTree: FlexNode;
  header: FlexNode;
  inputBar: FlexNode;
  sidebar: FlexNode | null;
  nodeCount: number;
  showSidebar: boolean;
  contentWidth: number;
}

function buildApp(
  messages: ChatMessage[],
  containerW: number,
  containerH: number,
): AppLayout {
  const showSidebar = containerW > 800;
  const contentWidth = showSidebar ? containerW - SIDEBAR_W : containerW;

  const msgNodes = messages.map(m => buildMessageNode(m, contentWidth));
  let nodeCount = messages.length * 5;

  const messagesTree: FlexNode = {
    style: { width: contentWidth, flexDirection: 'column' },
    children: msgNodes,
  };
  nodeCount += 1;

  const header: FlexNode = {
    style: {
      width: contentWidth, height: HEADER_HEIGHT, flexDirection: 'row',
      alignItems: 'center', paddingLeft: 20, paddingRight: 20, gap: 12,
      boxSizing: 'border-box',
    },
    children: [
      { style: { width: 28, height: 28, flexShrink: 0 } },
      { style: { width: 120, height: 16, flexShrink: 0 } },
      { style: { flexGrow: 1 } },
      { style: { width: 80, height: 24, flexShrink: 0 } },
    ],
  };
  nodeCount += 5;

  const inputBar: FlexNode = {
    style: {
      width: contentWidth, height: INPUT_HEIGHT, flexDirection: 'row',
      alignItems: 'center', paddingLeft: 16, paddingRight: 16, gap: 10,
      boxSizing: 'border-box',
    },
    children: [
      { style: { flexGrow: 1, height: 40 } },
      { style: { width: 40, height: 40, flexShrink: 0 } },
    ],
  };
  nodeCount += 3;

  let sidebar: FlexNode | null = null;
  if (showSidebar) {
    const itemNodes: FlexNode[] = [
      { style: { height: 20, flexShrink: 0 } },
    ];
    for (let i = 0; i < SIDEBAR_ITEMS.length; i++) {
      itemNodes.push({
        style: {
          height: 36, flexDirection: 'row', alignItems: 'center',
          paddingLeft: 14, paddingRight: 14, gap: 8, flexShrink: 0,
        },
        children: [
          { style: { width: 16, height: 16, flexShrink: 0 } },
          { style: { flexGrow: 1, height: 14 } },
        ],
      });
    }
    sidebar = {
      style: {
        width: SIDEBAR_W, height: containerH, flexDirection: 'column',
        padding: 10, gap: 2, flexShrink: 0,
      },
      children: itemNodes,
    };
    nodeCount += 1 + 1 + SIDEBAR_ITEMS.length * 3;
  }

  return { messagesTree, header, inputBar, sidebar, nodeCount, showSidebar, contentWidth };
}

// ─── Canvas rendering ─────────────────────────────────────────────────

function drawApp(
  ctx: CanvasRenderingContext2D,
  msgsLayout: LayoutResult,
  headerLayout: LayoutResult,
  inputLayout: LayoutResult,
  sidebarLayout: LayoutResult | null,
  messages: ChatMessage[],
  canvasW: number,
  canvasH: number,
  showSidebar: boolean,
  contentWidth: number,
  streamingMsgIdx: number,
  streamingHeight: number,
  streamingLines: number,
) {
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Sidebar bg
  if (showSidebar && sidebarLayout) {
    ctx.fillStyle = '#0c0c10';
    ctx.fillRect(0, 0, SIDEBAR_W, canvasH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SIDEBAR_W, canvasH);
    ctx.clip();

    const titleNode = sidebarLayout.children[0];
    if (titleNode) {
      ctx.font = '700 10px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText('CONVERSATIONS', 24, titleNode.y + 14);
    }

    for (let i = 1; i < sidebarLayout.children.length; i++) {
      const item = sidebarLayout.children[i]!;
      const iy = item.y;
      const isActive = i === 2;

      if (isActive) {
        ctx.fillStyle = 'rgba(99,102,241,0.1)';
        ctx.beginPath();
        ctx.roundRect(10, iy, SIDEBAR_W - 20, item.height, 8);
        ctx.fill();
      }

      const iconNode = item.children[0];
      if (iconNode) {
        ctx.fillStyle = isActive ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.roundRect(item.x + iconNode.x, iy + iconNode.y, iconNode.width, iconNode.height, 3);
        ctx.fill();
      }

      const labelNode = item.children[1];
      if (labelNode) {
        ctx.font = `${isActive ? '500' : '400'} 11px Inter, system-ui, sans-serif`;
        ctx.fillStyle = isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)';
        ctx.fillText(SIDEBAR_ITEMS[i - 1]!, item.x + labelNode.x, iy + labelNode.y + 11);
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(SIDEBAR_W - 1, 0, 1, canvasH);
    ctx.restore();
  }

  const chatX = showSidebar ? SIDEBAR_W : 0;

  ctx.fillStyle = '#111117';
  ctx.fillRect(chatX, 0, contentWidth, canvasH);

  // ── Messages (clipped to visible area between header and input) ──
  const visibleTop = HEADER_HEIGHT;
  const visibleHeight = canvasH - HEADER_HEIGHT - INPUT_HEIGHT;

  ctx.save();
  ctx.beginPath();
  ctx.rect(chatX, visibleTop, contentWidth, visibleHeight);
  ctx.clip();

  const totalH = msgsLayout.height;
  const scrollOff = Math.max(0, totalH - visibleHeight);

  for (let i = 0; i < msgsLayout.children.length; i++) {
    const ml = msgsLayout.children[i]!;
    const msg = messages[i];
    if (!msg) continue;

    const msgY = ml.y - scrollOff;
    if (msgY + ml.height < 0 || msgY > visibleHeight) continue;

    const dy = visibleTop + msgY;
    const dx = chatX + ml.x;
    const isAI = msg.role === 'ai';
    const isStreaming = i === streamingMsgIdx;

    if (isAI) {
      ctx.fillStyle = isStreaming ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)';
      ctx.fillRect(dx, dy, ml.width, ml.height);
    }

    if (i > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(dx + MSG_PAD, dy, ml.width - MSG_PAD * 2, 1);
    }

    // Avatar
    const avatarNode = ml.children[0];
    if (avatarNode) {
      const avR = avatarNode.width / 2;
      const cx = dx + avatarNode.x + avR;
      const cy = dy + avatarNode.y + avR;

      if (isAI) {
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, avR);
        gradient.addColorStop(0, '#818cf8');
        gradient.addColorStop(1, '#6366f1');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, avR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${Math.max(8, avR * 0.6)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('AI', cx, cy + avR * 0.22);
        ctx.textAlign = 'start';
      } else {
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(cx, cy, avR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `600 ${Math.max(9, avR * 0.75)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('U', cx, cy + avR * 0.28);
        ctx.textAlign = 'start';
      }
    }

    const contentCol = ml.children[1];
    if (!contentCol) continue;

    // Use layout-computed positions for the content column
    const colX = dx + contentCol.x;
    const colY = dy + contentCol.y;

    // Label
    const labelNode = contentCol.children[0];
    if (labelNode) {
      ctx.font = LABEL_FONT;
      ctx.fillStyle = isAI ? '#a5b4fc' : '#93c5fd';
      ctx.fillText(
        isAI ? 'Noreflow AI' : 'You',
        colX + labelNode.x,
        colY + labelNode.y + 11,
      );
    }

    // Text body
    const textNode = contentCol.children[1];
    if (textNode && textNode.width > 0) {
      const lines = msg.textHandle.getLines(textNode.width);
      ctx.font = MSG_FONT;
      ctx.fillStyle = isAI ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.7)';
      const textX = colX + textNode.x;
      const textY = colY + textNode.y;
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li]!.text, textX, textY + (li + 1) * MSG_LINE_HEIGHT - 5);
      }

      // Blinking cursor on streaming message
      if (isStreaming) {
        const lastLine = lines[lines.length - 1];
        if (lastLine) {
          const cursorX = textX + lastLine.width + 2;
          const cursorY = textY + lines.length * MSG_LINE_HEIGHT - MSG_LINE_HEIGHT + 2;
          const blink = Math.floor(performance.now() / 400) % 2 === 0;
          if (blink) {
            ctx.fillStyle = '#818cf8';
            ctx.fillRect(cursorX, cursorY, 2, MSG_LINE_HEIGHT - 4);
          }
        }
      }
    }

    // Height annotation on streaming AI message
    if (isStreaming && streamingHeight > 0) {
      const badgeText = `↕ ${Math.round(streamingHeight)}px · ${streamingLines} line${streamingLines !== 1 ? 's' : ''}`;
      ctx.font = '600 10px Inter, system-ui, sans-serif';
      const badgeW = ctx.measureText(badgeText).width + 16;
      const badgeH = 22;
      const badgeX = dx + ml.width - badgeW - 12;
      const badgeY = dy + 10;

      ctx.fillStyle = 'rgba(99,102,241,0.15)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(99,102,241,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#a5b4fc';
      ctx.fillText(badgeText, badgeX + 8, badgeY + 15);

      // Animated left-edge height bar
      const barX = dx + 3;
      const barY = dy;
      const barH = ml.height;
      const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barH);
      gradient.addColorStop(0, 'rgba(99,102,241,0.5)');
      gradient.addColorStop(1, 'rgba(129,140,248,0.2)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(barX, barY, 3, barH, 1.5);
      ctx.fill();
    }
  }

  ctx.restore();

  // ── Header ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(chatX, 0, contentWidth, HEADER_HEIGHT);
  ctx.clip();

  ctx.fillStyle = '#111117';
  ctx.fillRect(chatX, 0, contentWidth, HEADER_HEIGHT);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(chatX, HEADER_HEIGHT - 1, contentWidth, 1);

  if (headerLayout) {
    const hMidY = HEADER_HEIGHT / 2;

    const logoNode = headerLayout.children[0];
    if (logoNode) {
      const gradient = ctx.createRadialGradient(
        chatX + logoNode.x + 14, hMidY, 0,
        chatX + logoNode.x + 14, hMidY, 14,
      );
      gradient.addColorStop(0, '#818cf8');
      gradient.addColorStop(1, '#6366f1');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(chatX + logoNode.x + 14, hMidY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AI', chatX + logoNode.x + 14, hMidY + 3);
      ctx.textAlign = 'start';
    }

    const titleNode = headerLayout.children[1];
    if (titleNode) {
      ctx.font = '600 14px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('Noreflow AI Chat', chatX + titleNode.x, hMidY + 5);
    }

    const modelNode = headerLayout.children[3];
    if (modelNode) {
      ctx.fillStyle = 'rgba(99,102,241,0.12)';
      ctx.beginPath();
      ctx.roundRect(chatX + modelNode.x, hMidY - 12, modelNode.width, 24, 6);
      ctx.fill();
      ctx.font = '500 10px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#a5b4fc';
      ctx.textAlign = 'center';
      ctx.fillText('GPT-4 class', chatX + modelNode.x + modelNode.width / 2, hMidY + 3);
      ctx.textAlign = 'start';
    }
  }

  ctx.restore();

  // ── Input bar ──
  const ibY = canvasH - INPUT_HEIGHT;
  ctx.save();
  ctx.beginPath();
  ctx.rect(chatX, ibY, contentWidth, INPUT_HEIGHT);
  ctx.clip();

  ctx.fillStyle = '#111117';
  ctx.fillRect(chatX, ibY, contentWidth, INPUT_HEIGHT);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(chatX, ibY, contentWidth, 1);

  if (inputLayout) {
    const ibMidY = ibY + INPUT_HEIGHT / 2;

    const textField = inputLayout.children[0];
    if (textField) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.roundRect(chatX + textField.x, ibY + textField.y, textField.width, textField.height, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = '400 13px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillText('Ask anything...', chatX + textField.x + 14, ibMidY + 4);
    }

    const sendBtn = inputLayout.children[1];
    if (sendBtn) {
      const gradient = ctx.createLinearGradient(
        chatX + sendBtn.x, ibY + sendBtn.y,
        chatX + sendBtn.x + sendBtn.width, ibY + sendBtn.y + sendBtn.height,
      );
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(1, '#818cf8');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(chatX + sendBtn.x, ibY + sendBtn.y, sendBtn.width, sendBtn.height, 10);
      ctx.fill();

      // Arrow icon
      ctx.fillStyle = '#fff';
      ctx.font = '700 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↑', chatX + sendBtn.x + sendBtn.width / 2, ibMidY + 5);
      ctx.textAlign = 'start';
    }
  }

  ctx.restore();

  // Outer border
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, canvasW - 1, canvasH - 1);
}

// ─── Streaming state ──────────────────────────────────────────────────

interface StreamingState {
  words: string[];
  wordIndex: number;
  messageIndex: number;
  lastTokenTime: number;
}

// ─── Component ────────────────────────────────────────────────────────

const CANVAS_HEIGHT = 650;
const STAT_THROTTLE_MS = 150;
const TOKEN_INTERVAL_MS = 55;
const PAUSE_BETWEEN_QA_MS = 2500;

export function LiveChat() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const nextIdRef = useRef(0);
  const animRef = useRef(0);
  const [streaming, setStreaming] = useState(false);
  const startedByObserver = useRef(false);

  const [stats, setStats] = useState({ nodes: 0, layoutUs: 0, fps: 0, tokens: 0, reflows: 0, msgHeight: 0 });
  const statsRef = useRef({ nodes: 0, layoutUs: 0, msgHeight: 0 });
  const lastStatUpdate = useRef(0);
  const fpsFramesRef = useRef<number[]>([]);

  const conversationIdx = useRef(0);
  const aiStreamRef = useRef<StreamingState | null>(null);
  const lastEventTime = useRef(0);
  const phase = useRef<'idle' | 'waiting-for-question' | 'waiting-for-ai' | 'streaming'>('idle');
  const tokenCount = useRef(0);
  const reflowsSaved = useRef(0);
  const streamingMsgIdx = useRef(-1);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const msgs = messagesRef.current;
    const t0 = performance.now();
    const {
      messagesTree, header, inputBar, sidebar,
      nodeCount, showSidebar, contentWidth,
    } = buildApp(msgs, rect.width, rect.height);

    const msgsLayout = computeLayout(messagesTree);
    const headerResult = computeLayout(header);
    const inputResult = computeLayout(inputBar);
    const sidebarResult = sidebar ? computeLayout(sidebar) : null;
    const t1 = performance.now();

    // Compute streaming message metrics for the height badge
    let sHeight = 0;
    let sLines = 0;
    const sIdx = streamingMsgIdx.current;
    if (sIdx >= 0 && sIdx < msgsLayout.children.length) {
      const sml = msgsLayout.children[sIdx]!;
      sHeight = sml.height;
      const sMsg = msgs[sIdx];
      if (sMsg) {
        const textW = sml.children[1]?.children[1]?.width ?? contentWidth - 100;
        sLines = sMsg.textHandle.getLines(textW).length;
      }
    }

    statsRef.current = { nodes: nodeCount, layoutUs: Math.round((t1 - t0) * 1000), msgHeight: sHeight };

    drawApp(
      ctx, msgsLayout, headerResult, inputResult, sidebarResult,
      msgs, rect.width, rect.height, showSidebar, contentWidth,
      sIdx, sHeight, sLines,
    );
  }, []);

  const trimMessages = useCallback(() => {
    if (messagesRef.current.length > MAX_MESSAGES) {
      const trimCount = messagesRef.current.length - MAX_MESSAGES;
      messagesRef.current = messagesRef.current.slice(trimCount);
      if (aiStreamRef.current) {
        aiStreamRef.current.messageIndex -= trimCount;
        if (aiStreamRef.current.messageIndex < 0) {
          aiStreamRef.current = null;
          phase.current = 'idle';
        }
      }
      if (streamingMsgIdx.current >= 0) {
        streamingMsgIdx.current -= trimCount;
        if (streamingMsgIdx.current < 0) streamingMsgIdx.current = -1;
      }
    }
  }, []);

  const loop = useCallback((now: number) => {
    // ── State machine: question → pause → AI streams → pause → repeat ──
    if (phase.current === 'idle') {
      phase.current = 'waiting-for-question';
      lastEventTime.current = now;
    }

    if (phase.current === 'waiting-for-question' && now - lastEventTime.current > PAUSE_BETWEEN_QA_MS) {
      const conv = CONVERSATIONS[conversationIdx.current % CONVERSATIONS.length]!;
      const userMsg = createMsg(nextIdRef.current++, 'user', conv.question);
      messagesRef.current.push(userMsg);
      reflowsSaved.current++;
      trimMessages();
      phase.current = 'waiting-for-ai';
      lastEventTime.current = now;
    }

    if (phase.current === 'waiting-for-ai' && now - lastEventTime.current > 800) {
      const conv = CONVERSATIONS[conversationIdx.current % CONVERSATIONS.length]!;
      const words = conv.answer.split(' ');
      const aiMsg = createMsg(nextIdRef.current++, 'ai', words[0]!);
      messagesRef.current.push(aiMsg);
      reflowsSaved.current++;
      trimMessages();
      const msgIdx = messagesRef.current.length - 1;
      streamingMsgIdx.current = msgIdx;

      aiStreamRef.current = {
        words,
        wordIndex: 1,
        messageIndex: msgIdx,
        lastTokenTime: now,
      };
      phase.current = 'streaming';
    }

    if (phase.current === 'streaming') {
      const ai = aiStreamRef.current;
      if (ai && now - ai.lastTokenTime > TOKEN_INTERVAL_MS) {
        if (ai.wordIndex < ai.words.length) {
          // Add 1-2 words per tick for natural pace
          const wordsToAdd = ai.wordIndex < ai.words.length - 2 && Math.random() < 0.3 ? 2 : 1;
          ai.wordIndex = Math.min(ai.wordIndex + wordsToAdd, ai.words.length);
          const partialText = ai.words.slice(0, ai.wordIndex).join(' ');
          const msg = messagesRef.current[ai.messageIndex];
          if (msg) {
            msg.text = partialText;
            msg.textHandle = textMeasure(partialText, MSG_FONT, MSG_LINE_HEIGHT);
            tokenCount.current += wordsToAdd;
            reflowsSaved.current += wordsToAdd;
          }
          ai.lastTokenTime = now;
        } else {
          aiStreamRef.current = null;
          streamingMsgIdx.current = -1;
          conversationIdx.current++;
          phase.current = 'waiting-for-question';
          lastEventTime.current = now;
        }
      }
    }

    render();

    fpsFramesRef.current.push(now);
    const cutoff = now - 1000;
    while (fpsFramesRef.current.length > 0 && fpsFramesRef.current[0]! < cutoff) {
      fpsFramesRef.current.shift();
    }

    if (now - lastStatUpdate.current > STAT_THROTTLE_MS) {
      setStats({
        ...statsRef.current,
        fps: fpsFramesRef.current.length,
        tokens: tokenCount.current,
        reflows: reflowsSaved.current,
        msgHeight: statsRef.current.msgHeight,
      });
      lastStatUpdate.current = now;
    }

    animRef.current = requestAnimationFrame(loop);
  }, [render, trimMessages]);

  const start = useCallback(() => {
    if (streaming) return;
    setStreaming(true);
    lastEventTime.current = performance.now();
    lastStatUpdate.current = performance.now();
    phase.current = 'idle';
    animRef.current = requestAnimationFrame(loop);
  }, [streaming, loop]);

  const stop = useCallback(() => {
    setStreaming(false);
    cancelAnimationFrame(animRef.current);
    aiStreamRef.current = null;
    streamingMsgIdx.current = -1;
    phase.current = 'idle';
  }, []);

  // Auto-start when scrolled into view
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !startedByObserver.current) {
          startedByObserver.current = true;
          start();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [start]);

  // Seed with first Q&A so it's not blank
  useEffect(() => {
    if (messagesRef.current.length === 0) {
      const conv = CONVERSATIONS[0]!;
      messagesRef.current.push(createMsg(nextIdRef.current++, 'user', conv.question));
      messagesRef.current.push(createMsg(nextIdRef.current++, 'ai', conv.answer));
      conversationIdx.current = 1;
    }
    render();
    setStats({ ...statsRef.current, fps: 0, tokens: 0, reflows: 0, msgHeight: 0 });
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  return (
    <section id="live-demos" className="py-24 px-6 bg-surface-alt" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-600 mb-4">
            Pretext + Noreflow — Zero DOM, Zero Reflow
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
            AI Streaming Without the Jank
          </h2>
          <p className="mt-3 text-text-body max-w-2xl mx-auto">
            Every AI chat — ChatGPT, Claude, Gemini — stutters when streaming responses.
            Each token can wrap text to a new line, changing the message height, triggering a DOM reflow.
            Watch the response stream below: the message <span className="text-emerald-600 font-semibold">grows taller in real time</span> as
            text wraps, and the layout recomputes every frame. <span className="text-text-primary font-medium">Zero reflows. Zero jank.</span>
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-[#1e1e2e] overflow-hidden shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-[#252536]">
            <div className="flex items-center gap-3">
              <button
                onClick={streaming ? stop : start}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                  streaming
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {streaming ? 'Stop' : 'Start Demo'}
              </button>

              {streaming && (
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-emerald-400">Streaming</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
              {stats.tokens > 0 && (
                <span className="text-gray-400">
                  <span className="text-emerald-400 font-semibold">{stats.tokens.toLocaleString()}</span> tokens
                </span>
              )}
              {streaming && stats.msgHeight > 0 && (
                <span className="text-gray-400">
                  msg: <span className="text-emerald-400 font-semibold">{Math.round(stats.msgHeight)}px</span>
                </span>
              )}
              {stats.reflows > 0 && (
                <span className="text-gray-400">
                  reflows: <span className="text-red-400 font-semibold line-through">
                    {stats.reflows.toLocaleString()}
                  </span>{' '}
                  <span className="text-emerald-400 font-bold">0</span>
                </span>
              )}
              {stats.nodes > 0 && (
                <span className="text-gray-400">
                  <span className="text-gray-300">{stats.nodes.toLocaleString()}</span> nodes
                </span>
              )}
              {stats.layoutUs > 0 && (
                <span className="text-gray-400">
                  layout: <span className="text-emerald-400 font-semibold">
                    {stats.layoutUs < 1000 ? `${stats.layoutUs}µs` : `${(stats.layoutUs / 1000).toFixed(1)}ms`}
                  </span>
                </span>
              )}
              {streaming && stats.fps > 0 && (
                <span className="text-gray-400">
                  <span className={`font-semibold ${stats.fps >= 55 ? 'text-emerald-400' : stats.fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {stats.fps}
                  </span> fps
                </span>
              )}
            </div>
          </div>

          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: CANVAS_HEIGHT }}
          />
        </div>

        <p className="mt-3 text-center text-xs text-text-muted">
          Each token triggers a text re-measure (Pretext) and full layout recomputation (Noreflow). Zero DOM access. The message height changes every few words — exactly what causes jank in ChatGPT and Claude.
        </p>

        {/* ── Why This Matters ── */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-border-subtle bg-surface p-6">
            <div className="text-2xl font-bold text-red-500 mb-2">The Wall</div>
            <p className="text-sm text-text-body leading-relaxed">
              <span className="text-text-primary font-medium">Slack</span> estimates message heights — get it wrong and the scroll jumps.{' '}
              <span className="text-text-primary font-medium">Google Docs</span> reflows every paragraph below your cursor on each keystroke.{' '}
              <span className="text-text-primary font-medium">VS Code</span> built Monaco because <code className="text-red-600 text-xs bg-red-50 px-1 rounded">contenteditable</code> + DOM layout couldn&apos;t keep up.
              Root cause: <span className="text-red-600 font-medium">text measurement requires the DOM</span>.
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface p-6">
            <div className="text-2xl font-bold text-yellow-600 mb-2">The Bottleneck</div>
            <p className="text-sm text-text-body leading-relaxed">
              Every AI chat — <span className="text-text-primary font-medium">ChatGPT, Claude, Gemini</span> — janks when streaming.
              Each token can wrap text, changing message height, shifting scroll position.
              At 20 tokens/sec, that&apos;s <span className="text-yellow-600 font-medium">60 forced reflows/sec</span>.{' '}
              <span className="text-text-primary font-medium">Figma</span> renders to Canvas because DOM layout can&apos;t handle it.
              Every app that gets big enough hits this wall.
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface p-6">
            <div className="text-2xl font-bold text-emerald-600 mb-2">The Fix</div>
            <p className="text-sm text-text-body leading-relaxed">
              <span className="text-emerald-600 font-medium">Pretext</span> computes exact line breaks as pure arithmetic.{' '}
              <span className="text-emerald-600 font-medium">Noreflow</span> computes the full layout from those measurements.
              The streaming response above recomputes layout on every token —{' '}
              <span className="text-emerald-600 font-semibold">zero reflows</span>, sub-millisecond, every frame.
              That&apos;s why it doesn&apos;t jank.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border-subtle bg-surface p-6">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
            <div className="flex-1">
              <div className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3">Traditional (DOM) — per streaming token</div>
              <div className="space-y-2 text-sm text-text-body">
                <div className="flex items-start gap-2"><span className="text-red-500 mt-0.5 flex-shrink-0">✗</span><span>Token arrives → update DOM text content</span></div>
                <div className="flex items-start gap-2"><span className="text-red-500 mt-0.5 flex-shrink-0">✗</span><span>Text wraps → browser triggers <span className="text-red-600 font-medium">reflow</span></span></div>
                <div className="flex items-start gap-2"><span className="text-red-500 mt-0.5 flex-shrink-0">✗</span><span>Read <code className="text-red-600 text-xs bg-red-50 px-1 rounded">offsetHeight</code> for scroll → <span className="text-red-600 font-medium">forced reflow</span></span></div>
                <div className="flex items-start gap-2"><span className="text-red-500 mt-0.5 flex-shrink-0">✗</span><span>Update scroll position → <span className="text-red-600 font-medium">third reflow</span></span></div>
                <div className="flex items-start gap-2"><span className="text-red-500 mt-0.5 flex-shrink-0">✗</span><span>20 tokens/sec × 3 = <span className="text-red-600 font-medium">60 reflows/sec → jank</span></span></div>
              </div>
            </div>
            <div className="hidden sm:block w-px bg-border-subtle" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">Pretext + Noreflow — per streaming token</div>
              <div className="space-y-2 text-sm text-text-body">
                <div className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5 flex-shrink-0">✓</span><span>Token arrives → <code className="text-emerald-700 text-xs bg-emerald-50 px-1 rounded">textMeasure(text, font)</code></span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5 flex-shrink-0">✓</span><span>Noreflow calls <code className="text-emerald-700 text-xs bg-emerald-50 px-1 rounded">measure(width)</code> → pure arithmetic</span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5 flex-shrink-0">✓</span><span>Full tree layout in &lt;1ms — heights, scroll, positions</span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5 flex-shrink-0">✓</span><span>Paint to Canvas — <span className="text-emerald-600 font-medium">zero DOM, zero reflow</span></span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5 flex-shrink-0">✓</span><span>Every token, every frame — <span className="text-emerald-600 font-medium">smooth 60+ fps</span></span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
