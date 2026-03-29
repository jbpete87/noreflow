import type { FlexStyle, ResolvedStyle } from './types.js';

/**
 * CSS spec initial values for all flexbox-related properties.
 * See: https://www.w3.org/TR/css-flexbox-1/
 */
const DEFAULTS: ResolvedStyle = {
  display: 'flex',

  flexDirection: 'row',
  flexWrap: 'nowrap',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  alignSelf: 'auto',
  alignContent: 'stretch',

  flexGrow: 0,
  flexShrink: 1,
  flexBasis: 'auto',

  width: 'auto',
  height: 'auto',
  minWidth: 0,
  minHeight: 0,
  maxWidth: '100000000%',
  maxHeight: '100000000%',

  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  borderTop: 0,
  borderRight: 0,
  borderBottom: 0,
  borderLeft: 0,

  rowGap: 0,
  columnGap: 0,

  boxSizing: 'content-box',
};

/**
 * Merge a partial FlexStyle with defaults to produce a fully resolved style.
 * Shorthand properties (padding, margin, border, gap) expand to their
 * individual edge values.
 */
export function resolveStyle(style?: FlexStyle): ResolvedStyle {
  if (!style) return { ...DEFAULTS };

  return {
    display: style.display ?? DEFAULTS.display,

    flexDirection: style.flexDirection ?? DEFAULTS.flexDirection,
    flexWrap: style.flexWrap ?? DEFAULTS.flexWrap,
    justifyContent: style.justifyContent ?? DEFAULTS.justifyContent,
    alignItems: style.alignItems ?? DEFAULTS.alignItems,
    alignSelf: style.alignSelf ?? DEFAULTS.alignSelf,
    alignContent: style.alignContent ?? DEFAULTS.alignContent,

    flexGrow: style.flexGrow ?? DEFAULTS.flexGrow,
    flexShrink: style.flexShrink ?? DEFAULTS.flexShrink,
    flexBasis: style.flexBasis ?? DEFAULTS.flexBasis,

    width: style.width ?? DEFAULTS.width,
    height: style.height ?? DEFAULTS.height,
    minWidth: style.minWidth ?? DEFAULTS.minWidth,
    minHeight: style.minHeight ?? DEFAULTS.minHeight,
    maxWidth: style.maxWidth ?? DEFAULTS.maxWidth,
    maxHeight: style.maxHeight ?? DEFAULTS.maxHeight,

    paddingTop: style.paddingTop ?? style.padding ?? DEFAULTS.paddingTop,
    paddingRight: style.paddingRight ?? style.padding ?? DEFAULTS.paddingRight,
    paddingBottom: style.paddingBottom ?? style.padding ?? DEFAULTS.paddingBottom,
    paddingLeft: style.paddingLeft ?? style.padding ?? DEFAULTS.paddingLeft,

    marginTop: style.marginTop ?? style.margin ?? DEFAULTS.marginTop,
    marginRight: style.marginRight ?? style.margin ?? DEFAULTS.marginRight,
    marginBottom: style.marginBottom ?? style.margin ?? DEFAULTS.marginBottom,
    marginLeft: style.marginLeft ?? style.margin ?? DEFAULTS.marginLeft,

    borderTop: style.borderTop ?? style.border ?? DEFAULTS.borderTop,
    borderRight: style.borderRight ?? style.border ?? DEFAULTS.borderRight,
    borderBottom: style.borderBottom ?? style.border ?? DEFAULTS.borderBottom,
    borderLeft: style.borderLeft ?? style.border ?? DEFAULTS.borderLeft,

    rowGap: style.rowGap ?? style.gap ?? DEFAULTS.rowGap,
    columnGap: style.columnGap ?? style.gap ?? DEFAULTS.columnGap,

    boxSizing: style.boxSizing ?? DEFAULTS.boxSizing,
  };
}
