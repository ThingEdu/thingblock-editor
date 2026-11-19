import classNames from 'classnames'
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react'
import ReactTooltip from 'react-tooltip'
import { KEY } from '../../lib/ui/navigation-keys'
import styles from './fab.module.css'

// How long the menu stays open after the pointer leaves it, and how long it takes to open
const CLOSE_DELAY = 300 // ms

/** One of the buttons the FAB fans out. */
export interface FabItem {
  img: string
  title: string
  /** What the button does; without it, the button shows as coming soon. */
  onClick?: () => void
}

interface FabProps {
  className?: string
  img: string
  /** The main button's label and tooltip. */
  title: string
  items: FabItem[]
  onClick?: () => void
}

/**
 * A floating action button that fans out more buttons while the pointer or the focus is on it. The arrow keys move
 * through the buttons, Escape goes back to the main button, and Tab leaves.
 * @param props - The main button's icon, label and click handler, and the buttons it fans out.
 * @returns The main button, with the buttons above it.
 */
const Fab = (props: FabProps) => {
  const { className, img, items, onClick, title } = props
  const [isExpanded, setIsExpanded] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mainTooltipId = `tooltip-${useId()}`
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const refocusActiveElement = useCallback(() => {
    // Rerenders can lose the focus, and with it the tooltip; focusing again once they settle shows it again
    setTimeout(() => {
      const focused = document.activeElement
      if (!(focused instanceof HTMLElement)) return
      focused.blur()
      focused.focus()
    }, 500)
  }, [])

  // Restores the focus after expanding, as when coming back from a modal
  useEffect(() => {
    if (isExpanded) refocusActiveElement()
  }, [isExpanded, refocusActiveElement])

  const handleOpen = useCallback(() => {
    // The pointer coming back before the menu closed keeps it open
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    } else if (!isExpanded) {
      setIsExpanded(true)
    }
  }, [isExpanded])

  // The first tap on a touch screen opens the menu instead of clicking the main button. React's touch handlers are
  // passive, so a native listener is needed to prevent the click.
  useEffect(() => {
    const button = buttonRef.current
    if (!button) return
    const handleTouchStart = (e: TouchEvent) => {
      if (isExpanded) return
      e.preventDefault()
      handleOpen()
    }
    button.addEventListener('touchstart', handleTouchStart)
    return () => {
      button.removeEventListener('touchstart', handleTouchStart)
    }
  }, [isExpanded, handleOpen])

  useEffect(() => {
    // The Blockly workspace suppresses mousedown and click events, so a click outside is a pointerup
    const handlePointerUpOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false)
        ReactTooltip.hide()
      }
    }
    document.addEventListener('pointerup', handlePointerUpOutside)
    return () => {
      document.removeEventListener('pointerup', handlePointerUpOutside)
    }
  }, [])

  const handleMove = (direction: 1 | -1) => {
    const buttons = itemRefs.current.filter((button) => button !== null)
    if (buttons.length === 0) return
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (current === -1) {
      buttons[direction === 1 ? 0 : buttons.length - 1].focus()
      return
    }
    buttons[(current + direction + buttons.length) % buttons.length].focus()
  }

  const handleClose = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false)
      closeTimeoutRef.current = null
    }, CLOSE_DELAY)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === KEY.ARROW_DOWN || e.key === KEY.ARROW_UP) {
      const direction = e.key === KEY.ARROW_UP ? -1 : 1
      e.preventDefault()
      if (isExpanded) {
        handleMove(direction)
      } else {
        setIsExpanded(true)
        // The buttons take focus once the menu has opened
        setTimeout(() => {
          handleMove(direction)
        }, CLOSE_DELAY)
      }
    } else if (e.key === KEY.TAB) {
      setIsExpanded(false)
      buttonRef.current?.focus()
    } else if (e.key === KEY.ESCAPE) {
      if (document.activeElement === buttonRef.current) {
        setIsExpanded(false)
        buttonRef.current?.blur()
      } else {
        buttonRef.current?.focus()
      }
    }
  }

  // The hovered button takes the focus, so the pointer and the keyboard never highlight two buttons at once
  const handleItemMouseEnter = (index: number) => () => {
    const buttons = itemRefs.current
    const focused = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (focused === index) return
    buttons[focused]?.blur()
    const target = index === -1 ? buttonRef.current : buttons[index]
    target?.focus()
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- opens on hover or focus anywhere in it, for the buttons inside
    <div
      ref={containerRef}
      className={classNames(styles.menuContainer, className, { [styles.expanded]: isExpanded })}
      onFocus={handleOpen}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <button
        ref={buttonRef}
        aria-label={title}
        className={classNames(styles.button, styles.mainButton)}
        data-for={mainTooltipId}
        data-tip={title}
        type="button"
        onClick={onClick}
        onMouseEnter={handleItemMouseEnter(-1)}
      >
        <img alt="" className={styles.mainIcon} draggable={false} src={img} />
      </button>
      <ReactTooltip
        arrowColor="var(--tooltip-arrow-color)"
        className={styles.tooltip}
        effect="solid"
        id={mainTooltipId}
        place="left"
      />
      <div className={styles.moreButtonsOuter}>
        <ul className={styles.moreButtons}>
          {items.map((item, index) => {
            const comingSoon = !item.onClick
            const tooltipId = `${mainTooltipId}-${index}`
            return (
              <li key={item.title}>
                <button
                  ref={(button) => {
                    itemRefs.current[index] = button
                  }}
                  aria-label={item.title}
                  className={classNames(styles.button, styles.moreButton, { [styles.comingSoon]: comingSoon })}
                  data-for={tooltipId}
                  data-tip={item.title}
                  tabIndex={-1}
                  type="button"
                  onClick={() => {
                    item.onClick?.()
                    refocusActiveElement()
                  }}
                  onMouseEnter={handleItemMouseEnter(index)}
                >
                  <img alt="" className={styles.moreIcon} draggable={false} src={item.img} />
                </button>
                <ReactTooltip
                  arrowColor="var(--tooltip-arrow-color)"
                  className={classNames(styles.tooltip, { [styles.comingSoonTooltip]: comingSoon })}
                  effect="solid"
                  id={tooltipId}
                  place="left"
                />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default Fab
