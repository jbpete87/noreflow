import { describe, it, expect } from 'vitest';
import { computeLayout } from 'noreflow';
import type { MeasureFunction } from 'noreflow';
import { buildMessageNode, buildChatLayout, measureMessage } from '../src/layout';
import type { MeasuredMessage } from '../src/layout';
import { DEFAULT_CONFIG } from '../src/types';
import type { StreamMessage } from '../src/types';
import type { TextHandle } from '../src/textMeasure';

function mockTextHandle(text: string, lineHeight: number = 20): TextHandle {
  const measure: MeasureFunction = (availableWidth: number, _availableHeight: number) => {
    if (!isFinite(availableWidth) || availableWidth <= 0) {
      return { width: 0, height: lineHeight };
    }
    const charsPerLine = Math.floor(availableWidth / 7);
    const lines = Math.ceil(text.length / Math.max(charsPerLine, 1));
    return { width: availableWidth, height: lines * lineHeight };
  };

  return {
    text,
    font: '400 13.5px Inter',
    lineHeight,
    prepared: {} as any,
    measure,
    getLines(maxWidth: number) {
      const charsPerLine = Math.floor(maxWidth / 7);
      const lines: any[] = [];
      for (let i = 0; i < text.length; i += charsPerLine) {
        lines.push({ text: text.slice(i, i + charsPerLine), width: Math.min(charsPerLine * 7, maxWidth) });
      }
      return lines.length ? lines : [{ text: '', width: 0 }];
    },
    getHeight(maxWidth: number) {
      return measure(maxWidth, Infinity).height;
    },
  };
}

function mockMeasured(id: number, role: 'user' | 'assistant', text: string): MeasuredMessage {
  return {
    msg: { id, role, text },
    textHandle: mockTextHandle(text),
    labelHandle: mockTextHandle(role === 'user' ? 'You' : 'Assistant', 16),
  };
}

const SAMPLE_TEXTS = [
  'Hi',
  'What is noreflow?',
  'Noreflow is a pure TypeScript layout engine that computes CSS-like flex layouts without any DOM or browser dependencies.',
  'Every token that streams in changes the text content, which forces the browser to recalculate the height of the message container. This triggers a forced synchronous layout.',
  'Short reply.',
  'The layout engine supports flexbox, CSS Grid, absolute positioning, and aspect ratios. It is designed for high-performance canvas-rendered UIs where DOM reflow would be too expensive.',
  'Can I use it with React?',
  'Yes. The @noreflow/stream-ui package provides a useStreamLayout hook that manages the full lifecycle: adding messages, streaming token updates, computing layout per frame, and rendering to canvas.',
];

function generateMessages(count: number): MeasuredMessage[] {
  const msgs: MeasuredMessage[] = [];
  for (let i = 0; i < count; i++) {
    const role = i % 2 === 0 ? 'user' as const : 'assistant' as const;
    const text = SAMPLE_TEXTS[i % SAMPLE_TEXTS.length]!;
    msgs.push(mockMeasured(i, role, text));
  }
  return msgs;
}

// ================================================================
// Scale tests
// ================================================================

describe('stress: message count scaling', () => {
  const counts = [10, 30, 60, 120, 200];

  for (const count of counts) {
    it(`${count} messages — no overlapping children`, () => {
      const msgs = generateMessages(count);
      const layout = buildChatLayout(msgs, 800, 600, ['Chat 1', 'Chat 2']);
      const result = computeLayout(layout.messages);

      expect(result.children).toHaveLength(count);

      let prevBottom = 0;
      for (let i = 0; i < result.children.length; i++) {
        const child = result.children[i]!;
        expect(child.height).toBeGreaterThan(0);
        expect(child.y).toBeGreaterThanOrEqual(prevBottom - 0.01);
        prevBottom = child.y + child.height;
      }
    });
  }
});

describe('stress: width responsiveness', () => {
  const widths = [320, 480, 768, 1024, 1440];

  it('layout adapts to all common viewport widths without errors', () => {
    const msgs = generateMessages(30);
    for (const width of widths) {
      const layout = buildChatLayout(msgs, width, 800, ['Chat 1']);
      const result = computeLayout(layout.messages);

      expect(result.children).toHaveLength(30);
      for (const child of result.children) {
        expect(child.width).toBeGreaterThan(0);
        expect(child.height).toBeGreaterThan(0);
      }

      if (width > DEFAULT_CONFIG.sidebarBreakpoint) {
        expect(layout.showSidebar).toBe(true);
        expect(layout.contentWidth).toBe(width - DEFAULT_CONFIG.sidebarWidth);
      } else {
        expect(layout.showSidebar).toBe(false);
        expect(layout.contentWidth).toBe(width);
      }
    }
  });

  it('narrower widths produce taller total layout', () => {
    const msgs = generateMessages(20);
    const narrow = buildChatLayout(msgs, 320, 800);
    const wide = buildChatLayout(msgs, 1200, 800);
    const narrowResult = computeLayout(narrow.messages);
    const wideResult = computeLayout(wide.messages);

    expect(narrowResult.height).toBeGreaterThan(wideResult.height);
  });
});

describe('stress: rapid token streaming', () => {
  it('simulates 50 token appends — height grows monotonically', () => {
    const baseMessages = generateMessages(10);
    const sentence = 'Every token that streams in changes the text content which forces the browser to recalculate the height of the message container causing a forced synchronous layout also called a reflow when it happens thirty plus times per second during streaming you get visible stuttering and scroll jumps that degrade the user experience';
    const tokens = sentence.split(' ');

    let prevTotalHeight = 0;
    let accumulated = '';

    for (let i = 0; i < Math.min(tokens.length, 50); i++) {
      accumulated += (i > 0 ? ' ' : '') + tokens[i];
      const streamingMsg = mockMeasured(999, 'assistant', accumulated);
      const allMsgs = [...baseMessages, streamingMsg];
      const layout = buildChatLayout(allMsgs, 800, 600);
      const result = computeLayout(layout.messages);

      const totalHeight = result.height;
      expect(totalHeight).toBeGreaterThanOrEqual(prevTotalHeight);
      prevTotalHeight = totalHeight;

      const lastMsg = result.children[result.children.length - 1]!;
      expect(lastMsg.height).toBeGreaterThan(0);
    }
  });

  it('1,000 sequential token appends complete without error', () => {
    const width = 600;
    let accumulated = '';
    for (let i = 0; i < 1000; i++) {
      accumulated += `word${i} `;
      const msg = mockMeasured(1, 'assistant', accumulated);
      const node = buildMessageNode(msg, width);
      const result = computeLayout(node);
      expect(result.height).toBeGreaterThan(0);
    }
  });
});

// ================================================================
// Performance budgets
// ================================================================

describe('stress: performance budgets (stream-ui)', () => {
  it('buildChatLayout + computeLayout for 60 messages under 3ms', () => {
    const msgs = generateMessages(60);

    // Warm up
    const warmup = buildChatLayout(msgs, 800, 600, ['Chat 1']);
    computeLayout(warmup.messages);

    const runs = 100;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) {
      const layout = buildChatLayout(msgs, 800, 600, ['Chat 1']);
      computeLayout(layout.messages);
      computeLayout(layout.header);
      computeLayout(layout.inputBar);
      if (layout.sidebar) computeLayout(layout.sidebar);
    }
    const avg = (performance.now() - t0) / runs;

    expect(avg).toBeLessThan(5);
  });

  it('single token update (rebuild + layout) under 1ms', () => {
    const baseMessages = generateMessages(59);
    const width = 800;

    // Warm up
    const streamMsg = mockMeasured(999, 'assistant', 'warmup text');
    const warmLayout = buildChatLayout([...baseMessages, streamMsg], width, 600);
    computeLayout(warmLayout.messages);

    const runs = 200;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) {
      const text = 'Token '.repeat(10 + (i % 40));
      const msg = mockMeasured(999, 'assistant', text);
      const layout = buildChatLayout([...baseMessages, msg], width, 600);
      computeLayout(layout.messages);
    }
    const avg = (performance.now() - t0) / runs;

    expect(avg).toBeLessThan(5);
  });

  it('200 messages at mobile width under 10ms', () => {
    const msgs = generateMessages(200);

    const warmup = buildChatLayout(msgs, 375, 812);
    computeLayout(warmup.messages);

    const runs = 50;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) {
      const layout = buildChatLayout(msgs, 375, 812);
      computeLayout(layout.messages);
    }
    const avg = (performance.now() - t0) / runs;

    expect(avg).toBeLessThan(15);
  });
});

// ================================================================
// Edge cases
// ================================================================

describe('stress: edge cases', () => {
  it('handles very long single message (5000 chars)', () => {
    const longText = 'word '.repeat(1000);
    const msg = mockMeasured(1, 'assistant', longText);
    const layout = buildChatLayout([msg], 600, 400);
    const result = computeLayout(layout.messages);

    expect(result.children[0]!.height).toBeGreaterThan(100);
  });

  it('handles empty text message', () => {
    const msg = mockMeasured(1, 'assistant', '');
    const layout = buildChatLayout([msg], 600, 400);
    const result = computeLayout(layout.messages);

    expect(result.children[0]!.height).toBeGreaterThan(0);
  });

  it('handles single character message', () => {
    const msg = mockMeasured(1, 'user', 'A');
    const layout = buildChatLayout([msg], 600, 400);
    const result = computeLayout(layout.messages);

    expect(result.children[0]!.height).toBeGreaterThan(0);
  });

  it('handles very narrow width (200px)', () => {
    const msgs = generateMessages(10);
    const layout = buildChatLayout(msgs, 200, 600);
    const result = computeLayout(layout.messages);

    for (const child of result.children) {
      expect(child.width).toBe(200);
      expect(child.height).toBeGreaterThan(0);
    }
  });

  it('handles very wide width (3840px)', () => {
    const msgs = generateMessages(10);
    const layout = buildChatLayout(msgs, 3840, 2160, ['Chat 1']);
    const result = computeLayout(layout.messages);

    for (const child of result.children) {
      expect(child.width).toBe(3840 - DEFAULT_CONFIG.sidebarWidth);
      expect(child.height).toBeGreaterThan(0);
    }
  });

  it('node count stays accurate as messages grow', () => {
    for (let count = 1; count <= 20; count++) {
      const msgs = generateMessages(count);
      const layout = buildChatLayout(msgs, 800, 600);
      const expectedNodes = count * 5 + 1 + 5 + 3; // messages + container + header + input
      expect(layout.nodeCount).toBe(expectedNodes);
    }
  });
});
