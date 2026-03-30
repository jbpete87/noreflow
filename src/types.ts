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

export type Display = 'flex' | 'grid' | 'none';

export type Position = 'static' | 'relative' | 'absolute';

export type BoxSizing = 'content-box' | 'border-box';

/**
 * Inset value for top/right/bottom/left: pixels, percentage, or "auto".
 */
export type InsetValue = number | `${number}%` | 'auto';

// ---------------------------------------------------------------------------
// Grid types
// ---------------------------------------------------------------------------

/**
 * A single track size definition.
 * - number: fixed pixels
 * - `${number}%`: percentage of the container's content size
 * - `${number}fr`: flexible fraction of remaining space
 * - 'auto': sized to content (min-content to max-content)
 */
export type TrackSize = number | `${number}%` | `${number}fr` | 'auto';

export type GridAutoFlow = 'row' | 'column';

/**
 * Grid item placement value: a 1-based line number or 'auto'.
 */
export type GridLine = number | 'auto';

export type JustifyItems = 'start' | 'end' | 'center' | 'stretch';

export type JustifySelf = 'auto' | JustifyItems;

/**
 * Style properties for a layout node (flex or grid container, or child item).
 * All properties are optional and default to CSS spec initial values.
 */
export interface FlexStyle {
  display?: Display;
  position?: Position;

  flexDirection?: FlexDirection;
  flexWrap?: FlexWrap;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  alignSelf?: AlignSelf;
  alignContent?: AlignContent;
  justifyItems?: JustifyItems;
  justifySelf?: JustifySelf;

  // Grid container properties
  gridTemplateColumns?: TrackSize[];
  gridTemplateRows?: TrackSize[];
  gridAutoColumns?: TrackSize;
  gridAutoRows?: TrackSize;
  gridAutoFlow?: GridAutoFlow;

  // Grid item placement
  gridColumnStart?: GridLine;
  gridColumnEnd?: GridLine;
  gridRowStart?: GridLine;
  gridRowEnd?: GridLine;

  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | 'auto';

  width?: SizeValue;
  height?: SizeValue;
  minWidth?: DimensionValue;
  minHeight?: DimensionValue;
  maxWidth?: DimensionValue;
  maxHeight?: DimensionValue;

  top?: InsetValue;
  right?: InsetValue;
  bottom?: InsetValue;
  left?: InsetValue;

  zIndex?: number;

  aspectRatio?: number;

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
  position: Position;

  flexDirection: FlexDirection;
  flexWrap: FlexWrap;
  justifyContent: JustifyContent;
  alignItems: AlignItems;
  alignSelf: AlignSelf;
  alignContent: AlignContent;
  justifyItems: JustifyItems;
  justifySelf: JustifySelf;

  gridTemplateColumns: TrackSize[];
  gridTemplateRows: TrackSize[];
  gridAutoColumns: TrackSize;
  gridAutoRows: TrackSize;
  gridAutoFlow: GridAutoFlow;

  gridColumnStart: GridLine;
  gridColumnEnd: GridLine;
  gridRowStart: GridLine;
  gridRowEnd: GridLine;

  flexGrow: number;
  flexShrink: number;
  flexBasis: number | 'auto';

  width: SizeValue;
  height: SizeValue;
  minWidth: DimensionValue;
  minHeight: DimensionValue;
  maxWidth: DimensionValue;
  maxHeight: DimensionValue;

  top: InsetValue;
  right: InsetValue;
  bottom: InsetValue;
  left: InsetValue;

  zIndex: number;

  aspectRatio: number | undefined;

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
