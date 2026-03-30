import { describe, it, expect } from 'vitest';
import { computeLayout } from 'noreflow';
import type { MeasureFunction } from 'noreflow';
import { buildMessageNode, buildChatLayout } from '../src/layout';
import type { MeasuredMessage } from '../src/layout';
import { DEFAULT_CONFIG } from '../src/types';
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

function mockMeasuredMessage(id: number, role: 'user' | 'assistant', text: string): MeasuredMessage {
  return {
    msg: { id, role, text },
    textHandle: mockTextHandle(text),
    labelHandle: mockTextHandle(role === 'user' ? 'You' : 'Assistant', 16),
  };
}

describe('buildMessageNode', () => {
  it('creates a valid FlexNode with avatar and content column', () => {
    const mm = mockMeasuredMessage(1, 'user', 'Hello world');
    const node = buildMessageNode(mm, 400);

    expect(node.style?.width).toBe(400);
    expect(node.style?.flexDirection).toBe('row');
    expect(node.style?.boxSizing).toBe('border-box');
    expect(node.children).toHaveLength(2);

    const avatar = node.children![0]!;
    expect(avatar.style?.width).toBe(DEFAULT_CONFIG.avatarSize);
    expect(avatar.style?.height).toBe(DEFAULT_CONFIG.avatarSize);

    const contentCol = node.children![1]!;
    expect(contentCol.style?.flexGrow).toBe(1);
    expect(contentCol.style?.flexDirection).toBe('column');
    expect(contentCol.children).toHaveLength(2);
    expect(contentCol.children![0]!.measure).toBeDefined();
    expect(contentCol.children![1]!.measure).toBeDefined();
  });

  it('produces valid layout when computed', () => {
    const mm = mockMeasuredMessage(1, 'assistant', 'This is a longer AI response that should wrap across multiple lines in the layout');
    const node = buildMessageNode(mm, 400);
    const layout = computeLayout(node);

    expect(layout.width).toBe(400);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.children).toHaveLength(2);

    const avatarLayout = layout.children[0]!;
    expect(avatarLayout.width).toBe(DEFAULT_CONFIG.avatarSize);

    const contentLayout = layout.children[1]!;
    expect(contentLayout.width).toBeGreaterThan(0);
    expect(contentLayout.children).toHaveLength(2);
    expect(contentLayout.children[1]!.height).toBeGreaterThan(0);
  });
});

describe('buildChatLayout', () => {
  it('creates layout with header, messages, input bar, and no sidebar at narrow width', () => {
    const msgs = [
      mockMeasuredMessage(1, 'user', 'Hello'),
      mockMeasuredMessage(2, 'assistant', 'Hi there! How can I help you today?'),
    ];
    const layout = buildChatLayout(msgs, 500, 600);

    expect(layout.showSidebar).toBe(false);
    expect(layout.sidebar).toBeNull();
    expect(layout.contentWidth).toBe(500);
    expect(layout.header.style?.width).toBe(500);
    expect(layout.inputBar.style?.width).toBe(500);
    expect(layout.messages.children).toHaveLength(2);
    expect(layout.nodeCount).toBeGreaterThan(0);
  });

  it('shows sidebar at wide widths', () => {
    const msgs = [mockMeasuredMessage(1, 'user', 'Test')];
    const sidebarItems = ['Chat 1', 'Chat 2', 'Chat 3'];
    const layout = buildChatLayout(msgs, 1200, 800, sidebarItems);

    expect(layout.showSidebar).toBe(true);
    expect(layout.sidebar).not.toBeNull();
    expect(layout.contentWidth).toBe(1200 - DEFAULT_CONFIG.sidebarWidth);
    expect(layout.sidebar!.children).toHaveLength(1 + sidebarItems.length);
  });

  it('computes full layout without errors', () => {
    const msgs = [
      mockMeasuredMessage(1, 'user', 'What causes jank?'),
      mockMeasuredMessage(2, 'assistant', 'Every time a token arrives, the browser recalculates layout. This is called a forced reflow.'),
      mockMeasuredMessage(3, 'user', 'How does noreflow fix it?'),
      mockMeasuredMessage(4, 'assistant', 'Noreflow computes layout as pure math — no DOM needed.'),
    ];
    const chatLayout = buildChatLayout(msgs, 800, 600, ['Chat 1']);

    const msgsResult = computeLayout(chatLayout.messages);
    const headerResult = computeLayout(chatLayout.header);
    const inputResult = computeLayout(chatLayout.inputBar);

    expect(msgsResult.children).toHaveLength(4);
    expect(headerResult.width).toBe(chatLayout.contentWidth);
    expect(inputResult.height).toBe(DEFAULT_CONFIG.inputHeight);

    for (const msgLayout of msgsResult.children) {
      expect(msgLayout.width).toBe(chatLayout.contentWidth);
      expect(msgLayout.height).toBeGreaterThan(0);
    }
  });

  it('handles empty message list', () => {
    const layout = buildChatLayout([], 600, 400);
    expect(layout.messages.children).toHaveLength(0);

    const result = computeLayout(layout.messages);
    expect(result.children).toHaveLength(0);
    expect(result.height).toBe(0);
  });

  it('message heights increase with longer text', () => {
    const short = mockMeasuredMessage(1, 'assistant', 'Hi');
    const long = mockMeasuredMessage(2, 'assistant', 'This is a much longer message that should definitely wrap to multiple lines when rendered in a chat message bubble at typical widths');

    const shortNode = buildMessageNode(short, 400);
    const longNode = buildMessageNode(long, 400);

    const shortLayout = computeLayout(shortNode);
    const longLayout = computeLayout(longNode);

    expect(longLayout.height).toBeGreaterThan(shortLayout.height);
  });

  it('tracks node count correctly', () => {
    const msgs = [
      mockMeasuredMessage(1, 'user', 'Hello'),
      mockMeasuredMessage(2, 'assistant', 'World'),
    ];
    const layout = buildChatLayout(msgs, 500, 600);

    // 2 messages * 5 nodes each + 1 container + 5 header + 3 input = 19
    expect(layout.nodeCount).toBe(19);
  });
});
