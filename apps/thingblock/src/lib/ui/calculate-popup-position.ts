import type { RefObject } from 'react'

export const PopupSide = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
} as const

export type PopupSide = (typeof PopupSide)[keyof typeof PopupSide]

export const PopupAlign = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  CENTER: 'center',
} as const

export type PopupAlign = (typeof PopupAlign)[keyof typeof PopupAlign]

interface PopupPositionOptions {
  relativeElementRef: RefObject<HTMLElement | null>
  popupRef: RefObject<HTMLElement | null>
  side: PopupSide
  align?: PopupAlign
  popupWidth: number
  spaceForArrow: number
  arrowHeight: number
  arrowWidth: number
  /** Space between the edge of the target and the edge of the popup aligned with it. */
  counterOffset?: number
  /** How far the arrow is indented into the popup. */
  arrowOffsetFromBottom?: number
}

/**
 * Places a popup and its arrow next to an element, in viewport coordinates.
 * @param options The element, the popup and how to place it.
 * @returns The positions, or an empty object while either element is not mounted.
 */
const calculatePopupPosition = (
  options: PopupPositionOptions,
): { top?: number; left?: number; arrowTop?: number; arrowLeft?: number } => {
  const {
    relativeElementRef,
    popupRef,
    side,
    align = PopupAlign.CENTER,
    popupWidth,
    spaceForArrow,
    arrowHeight,
    arrowWidth,
    counterOffset = 5,
    arrowOffsetFromBottom = 0,
  } = options
  const el = relativeElementRef.current
  const modalEl = popupRef.current
  if (!el || !modalEl) return {}

  const modalHeight = modalEl.getBoundingClientRect().height
  const targetRect = el.getBoundingClientRect()

  let top = 0
  let left = 0
  let arrowTop = 0
  let arrowLeft = 0

  switch (side) {
    case PopupSide.UP:
      top = targetRect.top - modalHeight - spaceForArrow
      break
    case PopupSide.DOWN:
      top = targetRect.bottom + spaceForArrow
      break
    case PopupSide.LEFT:
      left = targetRect.left - popupWidth - spaceForArrow
      break
    case PopupSide.RIGHT:
      left = targetRect.right + spaceForArrow
      break
  }

  switch (side) {
    case PopupSide.UP:
    case PopupSide.DOWN:
      if (align === PopupAlign.LEFT) {
        left = targetRect.left + targetRect.width - popupWidth + counterOffset
      } else if (align === PopupAlign.RIGHT) {
        left = targetRect.left - counterOffset
      } else {
        left = targetRect.left + (targetRect.width - popupWidth) / 2
      }
      break

    case PopupSide.LEFT:
    case PopupSide.RIGHT:
      if (align === PopupAlign.UP) {
        top = targetRect.top + targetRect.height - modalHeight - counterOffset
      } else if (align === PopupAlign.DOWN) {
        top = targetRect.top - counterOffset
      } else {
        top = targetRect.top + (targetRect.height - modalHeight) / 2
      }
      break
  }

  // Arrow positioning
  switch (side) {
    case PopupSide.UP:
      arrowTop = targetRect.top - spaceForArrow - arrowOffsetFromBottom
      arrowLeft = targetRect.left + (targetRect.width - arrowWidth) / 2
      break
    case PopupSide.DOWN:
      arrowTop = targetRect.top + targetRect.height + spaceForArrow - arrowHeight + arrowOffsetFromBottom
      arrowLeft = targetRect.left + (targetRect.width - arrowWidth) / 2
      break
    case PopupSide.LEFT:
      arrowTop = targetRect.top + (targetRect.height - arrowHeight) / 2
      arrowLeft = targetRect.left - spaceForArrow - arrowOffsetFromBottom
      break
    case PopupSide.RIGHT:
      arrowTop = targetRect.top + (targetRect.height - arrowHeight) / 2
      arrowLeft = targetRect.left + targetRect.width + spaceForArrow - arrowWidth + arrowOffsetFromBottom
      break
  }

  return { top, left, arrowTop, arrowLeft }
}

export default calculatePopupPosition
