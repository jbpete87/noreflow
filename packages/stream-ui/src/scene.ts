import type { LayoutResult } from 'noreflow';
import type { SceneNode } from 'nopointer';
import type { StreamChatConfig } from './types';
import { DEFAULT_CONFIG } from './types';

export interface ChatScene {
  root: SceneNode;
  msgsArea: SceneNode;
  sidebarItems: SceneNode[];
  sendBtn: SceneNode | null;
  inputField: SceneNode | null;
}

/**
 * Build a SceneNode tree from the computed chat layout results.
 * Annotates interactive regions: scrollable message area, clickable sidebar
 * items and send button, text cursor on input field.
 */
export function buildChatScene(
  msgsLayout: LayoutResult,
  headerLayout: LayoutResult,
  inputLayout: LayoutResult,
  sidebarLayout: LayoutResult | null,
  showSidebar: boolean,
  contentWidth: number,
  canvasW: number,
  canvasH: number,
  config: Required<StreamChatConfig> = DEFAULT_CONFIG,
): ChatScene {
  const chatX = showSidebar ? config.sidebarWidth : 0;
  const visibleHeight = canvasH - config.headerHeight - config.inputHeight;

  // Message area — scrollable, clipped
  const msgsArea: SceneNode = {
    layout: {
      x: chatX,
      y: config.headerHeight,
      width: contentWidth,
      height: visibleHeight,
      children: [],
    },
    scrollable: 'y',
    clip: true,
    data: { role: 'messages' },
  };

  // Header
  const headerScene: SceneNode = {
    layout: {
      x: chatX,
      y: 0,
      width: contentWidth,
      height: config.headerHeight,
      children: [],
    },
    data: { role: 'header' },
  };

  // Input bar
  let sendBtn: SceneNode | null = null;
  let inputField: SceneNode | null = null;
  const ibY = canvasH - config.inputHeight;

  const inputChildren: SceneNode[] = [];
  if (inputLayout.children[0]) {
    const tf = inputLayout.children[0];
    inputField = {
      layout: {
        x: tf.x,
        y: tf.y,
        width: tf.width,
        height: tf.height,
        children: [],
      },
      cursor: 'text',
      data: { role: 'inputField' },
    };
    inputChildren.push(inputField);
  }
  if (inputLayout.children[1]) {
    const sb = inputLayout.children[1];
    sendBtn = {
      layout: {
        x: sb.x,
        y: sb.y,
        width: sb.width,
        height: sb.height,
        children: [],
      },
      cursor: 'pointer',
      data: { role: 'sendBtn' },
    };
    inputChildren.push(sendBtn);
  }

  const inputScene: SceneNode = {
    layout: {
      x: chatX,
      y: ibY,
      width: contentWidth,
      height: config.inputHeight,
      children: [],
    },
    children: inputChildren,
    data: { role: 'inputBar' },
  };

  // Sidebar items
  const sidebarItemNodes: SceneNode[] = [];
  let sidebarScene: SceneNode | null = null;

  if (showSidebar && sidebarLayout) {
    const itemNodes: SceneNode[] = [];
    // Skip index 0 (the title spacer)
    for (let i = 1; i < sidebarLayout.children.length; i++) {
      const item = sidebarLayout.children[i]!;
      const itemScene: SceneNode = {
        layout: {
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          children: [],
        },
        cursor: 'pointer',
        data: { role: 'sidebarItem', index: i - 1 },
      };
      itemNodes.push(itemScene);
      sidebarItemNodes.push(itemScene);
    }

    sidebarScene = {
      layout: {
        x: 0,
        y: 0,
        width: config.sidebarWidth,
        height: canvasH,
        children: [],
      },
      children: itemNodes,
      clip: true,
      data: { role: 'sidebar' },
    };
  }

  // Root
  const rootChildren: SceneNode[] = [];
  if (sidebarScene) rootChildren.push(sidebarScene);
  rootChildren.push(msgsArea, headerScene, inputScene);

  const root: SceneNode = {
    layout: {
      x: 0,
      y: 0,
      width: canvasW,
      height: canvasH,
      children: [],
    },
    children: rootChildren,
  };

  return {
    root,
    msgsArea,
    sidebarItems: sidebarItemNodes,
    sendBtn,
    inputField,
  };
}
