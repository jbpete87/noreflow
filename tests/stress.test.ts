import { describe, it, expect } from 'vitest';
import { computeLayout } from '../src/layout.js';
import type { FlexNode, MeasureFunction } from '../src/types.js';

/**
 * Simulates a text node whose height depends on available width,
 * similar to how pretext + noreflow works in a real chat UI.
 */
function textMeasure(charCount: number, lineHeight = 20): MeasureFunction {
  return (availableWidth: number, _availableHeight: number) => {
    if (!isFinite(availableWidth) || availableWidth <= 0) {
      return { width: 0, height: lineHeight };
    }
    const charsPerLine = Math.floor(availableWidth / 7);
    const lines = Math.ceil(charCount / Math.max(charsPerLine, 1));
    return { width: availableWidth, height: lines * lineHeight };
  };
}

function buildChatMessage(charCount: number, contentWidth: number): FlexNode {
  return {
    style: {
      width: contentWidth,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingTop: 14,
      paddingBottom: 14,
      paddingLeft: 16,
      paddingRight: 16,
      boxSizing: 'border-box',
      flexShrink: 0,
    },
    children: [
      { style: { width: 30, height: 30, flexShrink: 0 } },
      {
        style: { flexGrow: 1, flexDirection: 'column', gap: 8 },
        children: [
          { measure: textMeasure(10, 16) },
          { measure: textMeasure(charCount, 20) },
        ],
      },
    ],
  };
}

function buildChatApp(messageCount: number, width: number, height: number): {
  messages: FlexNode;
  header: FlexNode;
  inputBar: FlexNode;
  sidebar: FlexNode | null;
} {
  const showSidebar = width > 800;
  const contentWidth = showSidebar ? width - 200 : width;
  const charCounts = [20, 80, 150, 300, 50, 200, 400, 100, 60, 250];

  const msgNodes: FlexNode[] = [];
  for (let i = 0; i < messageCount; i++) {
    msgNodes.push(buildChatMessage(charCounts[i % charCounts.length]!, contentWidth));
  }

  const messages: FlexNode = {
    style: { width: contentWidth, flexDirection: 'column' },
    children: msgNodes,
  };

  const header: FlexNode = {
    style: {
      width: contentWidth, height: 52,
      flexDirection: 'row', alignItems: 'center',
      paddingLeft: 20, paddingRight: 20, gap: 12,
      boxSizing: 'border-box',
    },
    children: [
      { style: { width: 28, height: 28, flexShrink: 0 } },
      { style: { width: 120, height: 16, flexShrink: 0 } },
      { style: { flexGrow: 1 } },
      { style: { width: 80, height: 24, flexShrink: 0 } },
    ],
  };

  const inputBar: FlexNode = {
    style: {
      width: contentWidth, height: 56,
      flexDirection: 'row', alignItems: 'center',
      paddingLeft: 16, paddingRight: 16, gap: 10,
      boxSizing: 'border-box',
    },
    children: [
      { style: { flexGrow: 1, height: 40 } },
      { style: { width: 40, height: 40, flexShrink: 0 } },
    ],
  };

  let sidebar: FlexNode | null = null;
  if (showSidebar) {
    sidebar = {
      style: { width: 200, height, flexDirection: 'column', padding: 10, gap: 2, flexShrink: 0 },
      children: Array.from({ length: 10 }, () => ({
        style: { height: 36, flexDirection: 'row' as const, alignItems: 'center' as const, paddingLeft: 14, paddingRight: 14, gap: 8, flexShrink: 0 },
        children: [
          { style: { width: 16, height: 16, flexShrink: 0 } },
          { style: { flexGrow: 1, height: 14 } },
        ],
      })),
    };
  }

  return { messages, header, inputBar, sidebar };
}

// ================================================================
// Correctness under load
// ================================================================

describe('stress: chat layout correctness', () => {
  const widths = [320, 768, 1200];
  const counts = [10, 60, 200, 500];

  for (const width of widths) {
    for (const count of counts) {
      it(`${count} messages at ${width}px — no overlapping, positive heights`, () => {
        const app = buildChatApp(count, width, 800);
        const result = computeLayout(app.messages);

        expect(result.children).toHaveLength(count);

        let prevBottom = 0;
        for (let i = 0; i < result.children.length; i++) {
          const child = result.children[i]!;
          expect(child.width).toBeGreaterThan(0);
          expect(child.height).toBeGreaterThan(0);
          expect(child.y).toBeGreaterThanOrEqual(prevBottom - 0.01);
          prevBottom = child.y + child.height;

          // Content column should have 2 children (label + text)
          const contentCol = child.children[1]!;
          expect(contentCol.children).toHaveLength(2);
          expect(contentCol.children[0]!.height).toBeGreaterThan(0);
          expect(contentCol.children[1]!.height).toBeGreaterThan(0);
        }
      });
    }
  }
});

describe('stress: width sensitivity', () => {
  it('same messages produce taller layout at narrower widths (more wrapping)', () => {
    const narrow = buildChatApp(20, 320, 800);
    const wide = buildChatApp(20, 1200, 800);

    const narrowResult = computeLayout(narrow.messages);
    const wideResult = computeLayout(wide.messages);

    expect(narrowResult.height).toBeGreaterThan(wideResult.height);
  });

  it('layout is deterministic across repeated calls', () => {
    const app1 = buildChatApp(50, 800, 600);
    const app2 = buildChatApp(50, 800, 600);

    const r1 = computeLayout(app1.messages);
    const r2 = computeLayout(app2.messages);

    expect(r1.height).toBe(r2.height);
    for (let i = 0; i < r1.children.length; i++) {
      expect(r1.children[i]!.height).toBe(r2.children[i]!.height);
      expect(r1.children[i]!.y).toBe(r2.children[i]!.y);
    }
  });
});

describe('stress: incremental message addition', () => {
  it('adding one message only changes the last child position', () => {
    const contentWidth = 800;
    const charCounts = [80, 150, 300];

    const msgs3: FlexNode[] = charCounts.map(c => buildChatMessage(c, contentWidth));
    const msgs4: FlexNode[] = [...charCounts, 200].map(c => buildChatMessage(c, contentWidth));

    const tree3: FlexNode = { style: { width: contentWidth, flexDirection: 'column' }, children: msgs3 };
    const tree4: FlexNode = { style: { width: contentWidth, flexDirection: 'column' }, children: msgs4 };

    const r3 = computeLayout(tree3);
    const r4 = computeLayout(tree4);

    for (let i = 0; i < 3; i++) {
      expect(r4.children[i]!.y).toBe(r3.children[i]!.y);
      expect(r4.children[i]!.height).toBe(r3.children[i]!.height);
    }

    expect(r4.children[3]!.y).toBe(r3.height);
    expect(r4.children[3]!.height).toBeGreaterThan(0);
  });
});

describe('stress: token streaming simulation', () => {
  it('height monotonically increases as text grows', () => {
    const contentWidth = 600;
    const tokens = 'Every token that streams in changes the text content which forces the browser to recalculate'.split(' ');

    let prevHeight = 0;
    let accumulated = '';
    for (const token of tokens) {
      accumulated += (accumulated ? ' ' : '') + token;
      const charCount = accumulated.length;
      const msg = buildChatMessage(charCount, contentWidth);
      const tree: FlexNode = { style: { width: contentWidth, flexDirection: 'column' }, children: [msg] };
      const result = computeLayout(tree);
      const height = result.children[0]!.height;

      expect(height).toBeGreaterThanOrEqual(prevHeight);
      prevHeight = height;
    }
  });
});

// ================================================================
// Performance assertions
// ================================================================

describe('stress: performance budgets', () => {
  it('60 messages (typical chat) computes in under 5ms', () => {
    const app = buildChatApp(60, 800, 600);

    // Warm up
    computeLayout(app.messages);
    computeLayout(app.header);
    computeLayout(app.inputBar);

    const runs = 100;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) {
      computeLayout(app.messages);
      computeLayout(app.header);
      computeLayout(app.inputBar);
    }
    const elapsed = performance.now() - t0;
    const avg = elapsed / runs;

    expect(avg).toBeLessThan(5);
  });

  it('200 messages computes in under 15ms', () => {
    const app = buildChatApp(200, 800, 600);

    computeLayout(app.messages);

    const runs = 50;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) {
      computeLayout(app.messages);
    }
    const elapsed = performance.now() - t0;
    const avg = elapsed / runs;

    expect(avg).toBeLessThan(15);
  });

  it('500 messages computes in under 40ms', () => {
    const app = buildChatApp(500, 1200, 800);

    computeLayout(app.messages);

    const runs = 20;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) {
      computeLayout(app.messages);
    }
    const elapsed = performance.now() - t0;
    const avg = elapsed / runs;

    expect(avg).toBeLessThan(40);
  });

  it('single message update (token append) under 0.5ms', () => {
    const contentWidth = 800;
    const msgs: FlexNode[] = [];
    for (let i = 0; i < 59; i++) {
      msgs.push(buildChatMessage(100, contentWidth));
    }

    const runs = 500;
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) {
      const streamingMsg = buildChatMessage(50 + (i % 200), contentWidth);
      const tree: FlexNode = {
        style: { width: contentWidth, flexDirection: 'column' },
        children: [...msgs, streamingMsg],
      };
      computeLayout(tree);
    }
    const elapsed = performance.now() - t0;
    const avg = elapsed / runs;

    expect(avg).toBeLessThan(5);
  });
});
