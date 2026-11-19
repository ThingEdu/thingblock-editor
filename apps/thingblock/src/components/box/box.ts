import { type CSSProperties, createElement, type HTMLAttributes, type Ref } from 'react'

export interface BoxProps extends HTMLAttributes<HTMLElement> {
  alignContent?: CSSProperties['alignContent']
  alignItems?: CSSProperties['alignItems']
  alignSelf?: CSSProperties['alignSelf']
  basis?: CSSProperties['flexBasis']
  componentRef?: Ref<HTMLElement>
  direction?: CSSProperties['flexDirection']
  /** The HTML element to render, `div` by default. */
  element?: string
  grow?: CSSProperties['flexGrow']
  height?: CSSProperties['height']
  justifyContent?: CSSProperties['justifyContent']
  shrink?: CSSProperties['flexShrink']
  width?: CSSProperties['width']
  wrap?: CSSProperties['flexWrap']
}

/**
 * A flex element laid out through its props.
 * @param props - The flex layout, plus the element's own attributes.
 * @returns A `div`, or the element named by `element`.
 */
const Box = (props: BoxProps) => {
  const {
    alignContent,
    alignItems,
    alignSelf,
    basis,
    componentRef,
    direction,
    element = 'div',
    grow,
    height,
    justifyContent,
    shrink,
    style,
    width,
    wrap,
    ...componentProps
  } = props
  return createElement(element, {
    ref: componentRef,
    style: {
      alignContent,
      alignItems,
      alignSelf,
      flexBasis: basis,
      flexDirection: direction,
      flexGrow: grow,
      flexShrink: shrink,
      flexWrap: wrap,
      justifyContent,
      width,
      height,
      ...style,
    },
    ...componentProps,
  })
}

export default Box
