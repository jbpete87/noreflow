export interface StreamMessage {
  id: string | number;
  role: 'user' | 'assistant';
  text: string;
  timestamp?: number;
}

export interface StreamTheme {
  background: string;
  surface: string;
  headerBg: string;
  sidebarBg: string;
  divider: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  accentGlow: string;
  userAvatar: string;
  aiAvatar: string;
  aiAvatarGradientStart: string;
  aiAvatarGradientEnd: string;
  streamingBg: string;
  cursorColor: string;
  font: string;
  monoFont: string;
}

export interface StreamChatConfig {
  headerHeight?: number;
  inputHeight?: number;
  messagePadding?: number;
  messageGap?: number;
  avatarSize?: number;
  sidebarWidth?: number;
  sidebarBreakpoint?: number;
  maxMessages?: number;
  fontSize?: number;
  lineHeight?: number;
  labelFontSize?: number;
  labelLineHeight?: number;
}

export const DEFAULT_THEME: StreamTheme = {
  background: '#111117',
  surface: '#111117',
  headerBg: '#111117',
  sidebarBg: '#0c0c10',
  divider: 'rgba(255,255,255,0.04)',
  text: 'rgba(255,255,255,0.88)',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.35)',
  accent: '#6366f1',
  accentLight: '#a5b4fc',
  accentGlow: 'rgba(99,102,241,0.12)',
  userAvatar: '#2563eb',
  aiAvatar: '#6366f1',
  aiAvatarGradientStart: '#818cf8',
  aiAvatarGradientEnd: '#6366f1',
  streamingBg: 'rgba(99,102,241,0.06)',
  cursorColor: '#818cf8',
  font: 'Inter, system-ui, sans-serif',
  monoFont: '"JetBrains Mono", monospace',
};

export const DEFAULT_CONFIG: Required<StreamChatConfig> = {
  headerHeight: 52,
  inputHeight: 56,
  messagePadding: 16,
  messageGap: 8,
  avatarSize: 30,
  sidebarWidth: 200,
  sidebarBreakpoint: 800,
  maxMessages: 60,
  fontSize: 13.5,
  lineHeight: 20,
  labelFontSize: 11.5,
  labelLineHeight: 16,
};
