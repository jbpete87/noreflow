/**
 * Size value: a pixel number, a percentage string like "50%", or "auto".
 */
export type SizeValue = number | `${number}%` | 'auto';

/**
 * Size value that excludes "auto" (for min/max constraints).
 */
export type DimensionValue = number | `${number}%`;

/**
 * Margin value: pixels, percentage, or "auto" for auto margins.
 */
export type MarginValue = number | `${number}%` | 'auto';

export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';

export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

export type JustifyContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch';

export type AlignSelf = 'auto' | AlignItems;

export type AlignContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'stretch'
  | 'space-between'
  | 'space-around';

export type Display = 'flex' | 'none';

export type BoxSizing = 'content-box' | 'border-box';

/**
 * Style properties for a flex container or flex item.
 * All properties are optional and default to CSS spec initial values.
 */
export interface FlexStyle {
  display?: Display;

  flexDirection?: FlexDirection;
  flexWrap?: FlexWrap;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  alignSelf?: AlignSelf;
  alignContent?: AlignContent;

  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | 'auto';

  width?: SizeValue;
  height?: SizeValue;
  minWidth?: DimensionValue;
  minHeight?: DimensionValue;
  maxWidth?: DimensionValue;
  maxHeight?: DimensionValue;

  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  margin?: MarginValue;
  marginTop?: MarginValue;
  marginRight?: MarginValue;
  marginBottom?: MarginValue;
  marginLeft?: MarginValue;

  border?: number;
  borderTop?: number;
  borderRight?: number;
  borderBottom?: number;
  borderLeft?: number;

  gap?: number;
  rowGap?: number;
  columnGap?: number;

  boxSizing?: BoxSizing;
}

/**
 * Callback to measure leaf node content (e.g. text, images).
 * Called by the layout engine when it needs to know the intrinsic
 * size of a node that has no children.
 *
 * @param availableWidth - The width available for the content (may be Infinity)
 * @param availableHeight - The height available for the content (may be Infinity)
 * @returns The measured size of the content
 */
export type MeasureFunction = (
  availableWidth: number,
  availableHeight: number,
) => { width: number; height: number };

/**
 * A node in the layout tree. This is the input to computeLayout().
 */
export interface FlexNode {
  style?: FlexStyle;
  children?: FlexNode[];
  measure?: MeasureFunction;
}

/**
 * The computed layout for a single node. This is the output of computeLayout().
 * Coordinates are relative to the node's parent.
 */
export interface LayoutResult {
  x: number;
  y: number;
  width: number;
  height: number;
  children: LayoutResult[];
}

// ---------------------------------------------------------------------------
// Internal types used during layout computation
// ---------------------------------------------------------------------------

/**
 * Resolved edge sizes in pixels (margin, padding, or border).
 */
export interface EdgeSizes {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Fully resolved style with no optional values — every property has
 * a concrete value. Created from FlexStyle + defaults.
 */
export interface ResolvedStyle {
  display: Display;

  flexDirection: FlexDirection;
  flexWrap: FlexWrap;
  justifyContent: JustifyContent;
  alignItems: AlignItems;
  alignSelf: AlignSelf;
  alignContent: AlignContent;

  flexGrow: number;
  flexShrink: number;
  flexBasis: number | 'auto';

  width: SizeValue;
  height: SizeValue;
  minWidth: DimensionValue;
  minHeight: DimensionValue;
  maxWidth: DimensionValue;
  maxHeight: DimensionValue;

  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;

  marginTop: MarginValue;
  marginRight: MarginValue;
  marginBottom: MarginValue;
  marginLeft: MarginValue;

  borderTop: number;
  borderRight: number;
  borderBottom: number;
  borderLeft: number;

  rowGap: number;
  columnGap: number;

  boxSizing: BoxSizing;
}
