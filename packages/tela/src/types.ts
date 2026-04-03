import type { FlexStyle, LayoutResult } from 'noreflow';
import type { SceneNode, PointerSession, ScrollState } from 'nopointer';
import type { PreparedTextWithSegments } from '@chenglou/pretext';

export interface ViewStyle extends Partial<FlexStyle> {
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  opacity?: number;
}

export interface ViewProps {
  style?: ViewStyle;
  children?: React.ReactNode;
}

export interface TextProps {
  font?: string;
  lineHeight?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  whiteSpace?: 'normal' | 'pre-wrap';
  style?: ViewStyle;
  children?: string;
}

export interface ScrollViewProps {
  style?: ViewStyle;
  scrollDirection?: 'y' | 'x' | 'both';
  children?: React.ReactNode;
}

export interface PressableProps {
  style?: ViewStyle;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  children?: React.ReactNode;
}

export interface TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  placeholderColor?: string;
  font?: string;
  lineHeight?: number;
  color?: string;
  style?: ViewStyle;
  autoFocus?: boolean;
}

export interface CanvasProps {
  width: number;
  height: number;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

export interface TContainer {
  rootNode: import('./hostNode.js').HostNode;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  scene: SceneNode | null;
  layoutResult: LayoutResult | null;
  pointerSession: PointerSession | null;
  scrollStates: Map<import('./hostNode.js').HostNode, ScrollState>;
  scrollContentLayouts: Map<import('./hostNode.js').HostNode, LayoutResult>;
  focusedNode: import('./hostNode.js').HostNode | null;
  cursorPos: number;
  cursorVisible: boolean;
  hiddenInput: HTMLInputElement | null;
  _valueFromUserInput: boolean;
  dirty: boolean;
  onCommit: (() => void) | null;
}

export interface TextMeta {
  prepared: PreparedTextWithSegments;
  font: string;
  lineHeight: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
}
