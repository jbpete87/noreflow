import type { FlexNode, FlexStyle, MeasureFunction } from 'noreflow';
import type { ViewStyle, TextMeta } from './types.js';

export type NodeType = 'view' | 'text' | 'scroll' | 'pressable' | 'textinput' | '_root' | '_rawtext';

export class HostNode {
  type: NodeType;
  props: Record<string, unknown>;
  style: Partial<FlexStyle>;
  visualStyle: {
    backgroundColor?: string;
    borderColor?: string;
    borderRadius?: number;
    opacity?: number;
  };
  children: HostNode[] = [];
  parent: HostNode | null = null;
  measure?: MeasureFunction;
  textMeta?: TextMeta;
  rawText?: string;

  constructor(type: NodeType, props: Record<string, unknown> = {}) {
    this.type = type;
    this.props = props;
    const s = (props['style'] as ViewStyle | undefined) ?? {};
    this.visualStyle = {
      backgroundColor: s.backgroundColor,
      borderColor: s.borderColor,
      borderRadius: s.borderRadius,
      opacity: s.opacity,
    };
    this.style = extractFlexStyle(s);
  }

  appendChild(child: HostNode): void {
    child.parent?.removeChild(child);
    child.parent = this;
    this.children.push(child);
  }

  removeChild(child: HostNode): void {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parent = null;
    }
  }

  insertBefore(child: HostNode, before: HostNode): void {
    child.parent?.removeChild(child);
    const idx = this.children.indexOf(before);
    if (idx !== -1) {
      this.children.splice(idx, 0, child);
    } else {
      this.children.push(child);
    }
    child.parent = this;
  }

  updateProps(newProps: Record<string, unknown>): void {
    this.props = newProps;
    const s = (newProps['style'] as ViewStyle | undefined) ?? {};
    this.visualStyle = {
      backgroundColor: s.backgroundColor,
      borderColor: s.borderColor,
      borderRadius: s.borderRadius,
      opacity: s.opacity,
    };
    this.style = extractFlexStyle(s);
  }

  collectText(): string {
    if (this.rawText != null) return this.rawText;
    if (typeof this.props['children'] === 'string') return this.props['children'] as string;
    let result = '';
    for (const child of this.children) {
      result += child.collectText();
    }
    return result;
  }

  toFlexNode(): FlexNode {
    if (this.type === '_rawtext') {
      return { style: { display: 'none' } };
    }

    const node: FlexNode = {};

    if (Object.keys(this.style).length > 0) {
      node.style = this.style as FlexStyle;
    }

    if (this.type === 'scroll') {
      // Scroll containers consume available space from the parent layout but
      // their content is laid out separately with unconstrained height.
      node.measure = (availableWidth: number, availableHeight: number) => ({
        width: availableWidth,
        height: isFinite(availableHeight) ? availableHeight : 0,
      });
    } else if (this.measure) {
      node.measure = this.measure;
    } else if (this.children.length > 0) {
      node.children = this.children.map(c => c.toFlexNode());
    }

    return node;
  }

  /** Build FlexNodes for scroll content (children with flexShrink:0). */
  scrollContentFlexNodes(): FlexNode[] {
    return this.children.map(c => {
      const child = c.toFlexNode();
      child.style = { ...child.style, flexShrink: 0 };
      return child;
    });
  }
}

const VISUAL_KEYS = new Set(['backgroundColor', 'borderColor', 'borderRadius', 'opacity']);

function extractFlexStyle(style: ViewStyle): Partial<FlexStyle> {
  const flex: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(style)) {
    if (!VISUAL_KEYS.has(key) && value !== undefined) {
      flex[key] = value;
    }
  }
  return flex as Partial<FlexStyle>;
}
