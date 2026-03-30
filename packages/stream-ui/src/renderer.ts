import type { LayoutResult } from 'noreflow';
import type { StreamTheme, StreamChatConfig } from './types';
import { DEFAULT_THEME, DEFAULT_CONFIG } from './types';
import type { MeasuredMessage } from './layout';

export interface DrawOptions {
  msgsLayout: LayoutResult;
  headerLayout: LayoutResult;
  inputLayout: LayoutResult;
  sidebarLayout: LayoutResult | null;
  messages: MeasuredMessage[];
  canvasW: number;
  canvasH: number;
  showSidebar: boolean;
  contentWidth: number;
  streamingIdx: number;
  streamingHeight: number;
  streamingLines: number;
  sidebarItems?: string[];
  activeItemIdx?: number;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  theme?: StreamTheme;
  config?: Required<StreamChatConfig>;
}

export function drawChat(ctx: CanvasRenderingContext2D, opts: DrawOptions) {
  const theme = opts.theme ?? DEFAULT_THEME;
  const config = opts.config ?? DEFAULT_CONFIG;
  const {
    msgsLayout, headerLayout, inputLayout, sidebarLayout,
    messages, canvasW, canvasH, showSidebar, contentWidth,
    streamingIdx, streamingHeight, streamingLines,
    sidebarItems = [], activeItemIdx = 1,
    title = 'AI Chat', subtitle = 'GPT-4 class',
    placeholder = 'Ask anything...',
  } = opts;

  ctx.clearRect(0, 0, canvasW, canvasH);

  // Sidebar
  if (showSidebar && sidebarLayout) {
    ctx.fillStyle = theme.sidebarBg;
    ctx.fillRect(0, 0, config.sidebarWidth, canvasH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, config.sidebarWidth, canvasH);
    ctx.clip();

    const titleNode = sidebarLayout.children[0];
    if (titleNode) {
      ctx.font = `700 10px ${theme.font}`;
      ctx.fillStyle = theme.textMuted;
      ctx.fillText('CONVERSATIONS', 24, titleNode.y + 14);
    }

    for (let i = 1; i < sidebarLayout.children.length; i++) {
      const item = sidebarLayout.children[i]!;
      const isActive = i === activeItemIdx + 1;

      if (isActive) {
        ctx.fillStyle = theme.accentGlow;
        ctx.beginPath();
        ctx.roundRect(10, item.y, config.sidebarWidth - 20, item.height, 8);
        ctx.fill();
      }

      const iconNode = item.children[0];
      if (iconNode) {
        ctx.fillStyle = isActive ? `${theme.accent}99` : 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.roundRect(item.x + iconNode.x, item.y + iconNode.y, iconNode.width, iconNode.height, 3);
        ctx.fill();
      }

      const labelNode = item.children[1];
      if (labelNode && sidebarItems[i - 1]) {
        ctx.font = `${isActive ? '500' : '400'} 11px ${theme.font}`;
        ctx.fillStyle = isActive ? 'rgba(255,255,255,0.8)' : theme.textMuted;
        ctx.fillText(sidebarItems[i - 1]!, item.x + labelNode.x, item.y + labelNode.y + 11);
      }
    }

    ctx.fillStyle = theme.divider;
    ctx.fillRect(config.sidebarWidth - 1, 0, 1, canvasH);
    ctx.restore();
  }

  const chatX = showSidebar ? config.sidebarWidth : 0;

  ctx.fillStyle = theme.background;
  ctx.fillRect(chatX, 0, contentWidth, canvasH);

  // Messages
  const visibleTop = config.headerHeight;
  const visibleHeight = canvasH - config.headerHeight - config.inputHeight;

  ctx.save();
  ctx.beginPath();
  ctx.rect(chatX, visibleTop, contentWidth, visibleHeight);
  ctx.clip();

  const totalH = msgsLayout.height;
  const scrollOff = Math.max(0, totalH - visibleHeight);

  for (let i = 0; i < msgsLayout.children.length; i++) {
    const ml = msgsLayout.children[i]!;
    const mm = messages[i];
    if (!mm) continue;

    const msgY = ml.y - scrollOff;
    if (msgY + ml.height < 0 || msgY > visibleHeight) continue;

    const dy = visibleTop + msgY;
    const dx = chatX + ml.x;
    const isAI = mm.msg.role === 'assistant';
    const isStreaming = i === streamingIdx;

    if (isAI) {
      ctx.fillStyle = isStreaming ? theme.streamingBg : 'rgba(255,255,255,0.02)';
      ctx.fillRect(dx, dy, ml.width, ml.height);
    }

    if (i > 0) {
      ctx.fillStyle = theme.divider;
      ctx.fillRect(dx + config.messagePadding, dy, ml.width - config.messagePadding * 2, 1);
    }

    // Avatar
    const avatarNode = ml.children[0];
    if (avatarNode) {
      const avR = avatarNode.width / 2;
      const cx = dx + avatarNode.x + avR;
      const cy = dy + avatarNode.y + avR;

      if (isAI) {
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, avR);
        gradient.addColorStop(0, theme.aiAvatarGradientStart);
        gradient.addColorStop(1, theme.aiAvatarGradientEnd);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, avR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${Math.max(8, avR * 0.6)}px ${theme.font}`;
        ctx.textAlign = 'center';
        ctx.fillText('AI', cx, cy + avR * 0.22);
        ctx.textAlign = 'start';
      } else {
        ctx.fillStyle = theme.userAvatar;
        ctx.beginPath();
        ctx.arc(cx, cy, avR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `600 ${Math.max(9, avR * 0.75)}px ${theme.font}`;
        ctx.textAlign = 'center';
        ctx.fillText('U', cx, cy + avR * 0.28);
        ctx.textAlign = 'start';
      }
    }

    const contentCol = ml.children[1];
    if (!contentCol) continue;

    const colX = dx + contentCol.x;
    const colY = dy + contentCol.y;

    // Label
    const labelNode = contentCol.children[0];
    if (labelNode) {
      ctx.font = `600 ${config.labelFontSize}px ${theme.font}`;
      ctx.fillStyle = isAI ? theme.accentLight : '#93c5fd';
      ctx.fillText(
        isAI ? 'Assistant' : 'You',
        colX + labelNode.x,
        colY + labelNode.y + 11,
      );
    }

    // Text body
    const textNode = contentCol.children[1];
    if (textNode && textNode.width > 0) {
      const lines = mm.textHandle.getLines(textNode.width);
      ctx.font = `400 ${config.fontSize}px ${theme.font}`;
      ctx.fillStyle = isAI ? theme.text : theme.textSecondary;
      const textX = colX + textNode.x;
      const textY = colY + textNode.y;
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li]!.text, textX, textY + (li + 1) * config.lineHeight - 5);
      }

      if (isStreaming) {
        const lastLine = lines[lines.length - 1];
        if (lastLine) {
          const cursorX = textX + lastLine.width + 2;
          const cursorY = textY + lines.length * config.lineHeight - config.lineHeight + 2;
          const blink = Math.floor(performance.now() / 400) % 2 === 0;
          if (blink) {
            ctx.fillStyle = theme.cursorColor;
            ctx.fillRect(cursorX, cursorY, 2, config.lineHeight - 4);
          }
        }
      }
    }

    // Streaming height annotation
    if (isStreaming && streamingHeight > 0) {
      const badgeText = `↕ ${Math.round(streamingHeight)}px · ${streamingLines} line${streamingLines !== 1 ? 's' : ''}`;
      ctx.font = `600 10px ${theme.font}`;
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
      ctx.fillStyle = theme.accentLight;
      ctx.fillText(badgeText, badgeX + 8, badgeY + 15);

      const barGradient = ctx.createLinearGradient(dx + 3, dy, dx + 3, dy + ml.height);
      barGradient.addColorStop(0, 'rgba(99,102,241,0.5)');
      barGradient.addColorStop(1, 'rgba(129,140,248,0.2)');
      ctx.fillStyle = barGradient;
      ctx.beginPath();
      ctx.roundRect(dx + 3, dy, 3, ml.height, 1.5);
      ctx.fill();
    }
  }

  ctx.restore();

  // Header
  ctx.save();
  ctx.beginPath();
  ctx.rect(chatX, 0, contentWidth, config.headerHeight);
  ctx.clip();

  ctx.fillStyle = theme.headerBg;
  ctx.fillRect(chatX, 0, contentWidth, config.headerHeight);
  ctx.fillStyle = theme.divider;
  ctx.fillRect(chatX, config.headerHeight - 1, contentWidth, 1);

  if (headerLayout) {
    const hMidY = config.headerHeight / 2;

    const logoNode = headerLayout.children[0];
    if (logoNode) {
      const gradient = ctx.createRadialGradient(
        chatX + logoNode.x + 14, hMidY, 0,
        chatX + logoNode.x + 14, hMidY, 14,
      );
      gradient.addColorStop(0, theme.aiAvatarGradientStart);
      gradient.addColorStop(1, theme.aiAvatarGradientEnd);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(chatX + logoNode.x + 14, hMidY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `700 9px ${theme.font}`;
      ctx.textAlign = 'center';
      ctx.fillText('AI', chatX + logoNode.x + 14, hMidY + 3);
      ctx.textAlign = 'start';
    }

    const titleNode = headerLayout.children[1];
    if (titleNode) {
      ctx.font = `600 14px ${theme.font}`;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(title, chatX + titleNode.x, hMidY + 5);
    }

    const modelNode = headerLayout.children[3];
    if (modelNode) {
      ctx.fillStyle = theme.accentGlow;
      ctx.beginPath();
      ctx.roundRect(chatX + modelNode.x, hMidY - 12, modelNode.width, 24, 6);
      ctx.fill();
      ctx.font = `500 10px ${theme.font}`;
      ctx.fillStyle = theme.accentLight;
      ctx.textAlign = 'center';
      ctx.fillText(subtitle, chatX + modelNode.x + modelNode.width / 2, hMidY + 3);
      ctx.textAlign = 'start';
    }
  }

  ctx.restore();

  // Input bar
  const ibY = canvasH - config.inputHeight;
  ctx.save();
  ctx.beginPath();
  ctx.rect(chatX, ibY, contentWidth, config.inputHeight);
  ctx.clip();

  ctx.fillStyle = theme.headerBg;
  ctx.fillRect(chatX, ibY, contentWidth, config.inputHeight);
  ctx.fillStyle = theme.divider;
  ctx.fillRect(chatX, ibY, contentWidth, 1);

  if (inputLayout) {
    const ibMidY = ibY + config.inputHeight / 2;

    const textField = inputLayout.children[0];
    if (textField) {
      ctx.fillStyle = theme.divider;
      ctx.beginPath();
      ctx.roundRect(chatX + textField.x, ibY + textField.y, textField.width, textField.height, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = `400 13px ${theme.font}`;
      ctx.fillStyle = theme.textMuted;
      ctx.fillText(placeholder, chatX + textField.x + 14, ibMidY + 4);
    }

    const sendBtn = inputLayout.children[1];
    if (sendBtn) {
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.roundRect(chatX + sendBtn.x, ibY + sendBtn.y, sendBtn.width, sendBtn.height, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `600 11px ${theme.font}`;
      ctx.textAlign = 'center';
      ctx.fillText('Send', chatX + sendBtn.x + sendBtn.width / 2, ibY + sendBtn.y + sendBtn.height / 2 + 4);
      ctx.textAlign = 'start';
    }
  }

  ctx.restore();
}
