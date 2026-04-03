import { createElement } from 'react';
import type { ViewProps, TextProps, ScrollViewProps, PressableProps, TextInputProps } from './types.js';

export function View(props: ViewProps) {
  return createElement('view' as any, props);
}

export function Text(props: TextProps) {
  return createElement('text' as any, props);
}

export function ScrollView(props: ScrollViewProps) {
  return createElement('scroll' as any, props);
}

export function Pressable(props: PressableProps) {
  return createElement('pressable' as any, props);
}

export function TextInput(props: TextInputProps) {
  return createElement('textinput' as any, props);
}
