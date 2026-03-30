import type { FlexNode } from 'noreflow';
import type { StreamMessage, StreamChatConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { createTextHandle, type TextHandle } from './textMeasure';

export interface MeasuredMessage {
  msg: StreamMessage;
  textHandle: TextHandle;
  labelHandle: TextHandle;
}

export interface ChatLayout {
  messages: FlexNode;
  header: FlexNode;
  inputBar: FlexNode;
  sidebar: FlexNode | null;
  nodeCount: number;
  showSidebar: boolean;
  contentWidth: number;
}

export function measureMessage(
  msg: StreamMessage,
  config: Required<StreamChatConfig> = DEFAULT_CONFIG,
): MeasuredMessage {
  const font = `400 ${config.fontSize}px Inter, system-ui, sans-serif`;
  const labelFont = `600 ${config.labelFontSize}px Inter, system-ui, sans-serif`;
  const label = msg.role === 'user' ? 'You' : 'Assistant';

  return {
    msg,
    textHandle: createTextHandle(msg.text, font, config.lineHeight),
    labelHandle: createTextHandle(label, labelFont, config.labelLineHeight),
  };
}

export function buildMessageNode(
  measured: MeasuredMessage,
  contentWidth: number,
  config: Required<StreamChatConfig> = DEFAULT_CONFIG,
): FlexNode {
  return {
    style: {
      width: contentWidth,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingTop: 14,
      paddingBottom: 14,
      paddingLeft: config.messagePadding,
      paddingRight: config.messagePadding,
      boxSizing: 'border-box',
      flexShrink: 0,
    },
    children: [
      { style: { width: config.avatarSize, height: config.avatarSize, flexShrink: 0 } },
      {
        style: { flexGrow: 1, flexDirection: 'column', gap: config.messageGap },
        children: [
          { measure: measured.labelHandle.measure },
          { measure: measured.textHandle.measure },
        ],
      },
    ],
  };
}

export function buildChatLayout(
  measured: MeasuredMessage[],
  containerW: number,
  containerH: number,
  sidebarItems: string[] = [],
  config: Required<StreamChatConfig> = DEFAULT_CONFIG,
): ChatLayout {
  const showSidebar = containerW > config.sidebarBreakpoint;
  const contentWidth = showSidebar ? containerW - config.sidebarWidth : containerW;

  const msgNodes = measured.map(m => buildMessageNode(m, contentWidth, config));
  let nodeCount = measured.length * 5;

  const messages: FlexNode = {
    style: { width: contentWidth, flexDirection: 'column' },
    children: msgNodes,
  };
  nodeCount += 1;

  const header: FlexNode = {
    style: {
      width: contentWidth,
      height: config.headerHeight,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 20,
      paddingRight: 20,
      gap: 12,
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
      width: contentWidth,
      height: config.inputHeight,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 16,
      paddingRight: 16,
      gap: 10,
      boxSizing: 'border-box',
    },
    children: [
      { style: { flexGrow: 1, height: 40 } },
      { style: { width: 40, height: 40, flexShrink: 0 } },
    ],
  };
  nodeCount += 3;

  let sidebar: FlexNode | null = null;
  if (showSidebar && sidebarItems.length > 0) {
    const itemNodes: FlexNode[] = [
      { style: { height: 20, flexShrink: 0 } },
    ];
    for (let i = 0; i < sidebarItems.length; i++) {
      itemNodes.push({
        style: {
          height: 36,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 14,
          paddingRight: 14,
          gap: 8,
          flexShrink: 0,
        },
        children: [
          { style: { width: 16, height: 16, flexShrink: 0 } },
          { style: { flexGrow: 1, height: 14 } },
        ],
      });
    }
    sidebar = {
      style: {
        width: config.sidebarWidth,
        height: containerH,
        flexDirection: 'column',
        padding: 10,
        gap: 2,
        flexShrink: 0,
      },
      children: itemNodes,
    };
    nodeCount += 1 + 1 + sidebarItems.length * 3;
  }

  return { messages, header, inputBar, sidebar, nodeCount, showSidebar, contentWidth };
}
