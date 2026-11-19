import { type KeyboardEvent, useCallback, useContext, useRef } from 'react'
import { useAppSelector } from '../app/store'
import { type MenuRef, MenuRefContext } from '../contexts/menu-ref-context'
import { KEY } from '../lib/ui/navigation-keys'

// Every item of a menu
const MENU_ITEM_SELECTOR = '[data-menu-item="true"]'
// The wrapper of an expandable item whose submenu is the item's sibling rather than its child
const MENU_ITEM_WRAPPER_SELECTOR = '[data-menu-item-wrapper="true"]'

interface MenuNavigationOptions {
  /** How deep the menu is nested; 1 is a top-level menu. */
  depth?: number
  /** The item focused when the menu opens. */
  defaultIndexOnOpen?: number
  /** Which way the arrow keys open and close submenus; the editor's language decides by default. */
  isRtl?: boolean
}

/**
 * Keyboard navigation and focus for a menu, opened and closed in step with the other menus under `MenuRefProvider`.
 *
 * The element that opens the menu takes `menuRef`, `onClick={handleOnOpen}`, `onKeyDown={handleKeyDown}` and
 * `aria-expanded={isExpanded()}`, and must be focusable; the menu's items take `onKeyDown={handleKeyDownOpenMenu}`.
 * Items are found by `data-menu-item`, either on the item itself or on the item inside a `data-menu-item-wrapper`
 * (see the settings menu's language and preference menus).
 * @param options - The menu's depth, the item to focus on opening, and its direction.
 * @returns The ref for the menu's opener, whether the menu is open, and its handlers.
 */
export const useMenuNavigation = (options: MenuNavigationOptions = {}) => {
  const { depth = 1, defaultIndexOnOpen = 0, isRtl: isRtlOption } = options
  const menuRef = useRef<HTMLElement>(null)
  const isRtlFromStore = useAppSelector((state) => state.locales.isRtl)
  const menuContext = useContext(MenuRefContext)
  if (!menuContext) throw new Error('useMenuNavigation: the menu is not inside a MenuRefProvider')

  const isRtl = isRtlOption ?? isRtlFromStore
  const OPEN_KEY = isRtl ? KEY.ARROW_LEFT : KEY.ARROW_RIGHT
  const CLOSE_KEY = isRtl ? KEY.ARROW_RIGHT : KEY.ARROW_LEFT

  // Breadth-first search for the menu's own items, each as the element that takes focus and the one that is clicked
  const findDirectSubitems = useCallback(() => {
    const root = menuRef.current
    if (!root) return []
    const directSubitems: [HTMLElement, HTMLElement][] = []
    const queue = [...root.children] as HTMLElement[]

    for (const element of queue) {
      if (element.matches(MENU_ITEM_SELECTOR)) {
        // A wrapper's own item opens this menu, so it is not one of its items
        if (!(root.matches(MENU_ITEM_WRAPPER_SELECTOR) && Array.from(root.children).includes(element))) {
          directSubitems.push([element, element])
        }
        continue
      }
      if (element.matches(MENU_ITEM_WRAPPER_SELECTOR)) {
        for (const child of element.children) {
          if (child.matches(MENU_ITEM_SELECTOR)) directSubitems.push([element, child as HTMLElement])
        }
      } else {
        queue.push(...(element.children as HTMLCollectionOf<HTMLElement>))
      }
    }

    return directSubitems
  }, [])

  const findDirectSubitemsFocusable = useCallback(
    () => findDirectSubitems().map(([wrapper]) => wrapper),
    [findDirectSubitems],
  )

  const isExpanded = useCallback(() => menuContext.isOpenMenu(menuRef), [menuContext])

  const handleOnOpen = useCallback(() => {
    if (menuContext.isOpenMenu(menuRef)) return

    menuContext.openInnerMenu(menuRef, depth)

    // The menu's items render after this
    requestAnimationFrame(() => {
      const focusableItems = findDirectSubitemsFocusable()
      ;(focusableItems.at(defaultIndexOnOpen) ?? focusableItems.at(0))?.focus()
    })
  }, [menuContext, depth, defaultIndexOnOpen, findDirectSubitemsFocusable])

  /**
   * Closes a menu and focuses its opener, so keyboard users are back where they opened it.
   * @param menuRefToClose - Which menu; this one when left out.
   */
  const handleOnClose = useCallback(
    (menuRefToClose?: MenuRef | null) => {
      const ref = menuRefToClose ?? menuRef
      menuContext.closeMenuByRef(ref)
      ref.current?.focus()
    },
    [menuContext],
  )

  const handleOnCloseAllMenus = useCallback(() => {
    handleOnClose(menuContext.outermostMenu)
    menuContext.closeAllMenus()
  }, [handleOnClose, menuContext])

  const handleMove = useCallback(
    (direction: number) => {
      const items = findDirectSubitemsFocusable()
      if (!items.length) return

      const currentIndex = items.indexOf(document.activeElement as HTMLElement)
      const nextIndex = (currentIndex + direction + items.length) % items.length
      items[nextIndex].focus()
    },
    [findDirectSubitemsFocusable],
  )

  // Keys for a vertical menu that is open
  const handleKeyDownOpenMenu = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case KEY.ARROW_DOWN:
          e.preventDefault()
          e.stopPropagation()
          handleMove(1)
          break
        case KEY.ARROW_UP:
          e.preventDefault()
          e.stopPropagation()
          handleMove(-1)
          break
        case KEY.ESCAPE:
          e.preventDefault()
          e.stopPropagation()
          handleOnClose()
          // Leaving the outermost menu leaves the menus altogether
          if (menuContext.isOutermostMenu(menuRef)) menuRef.current?.blur()
          break
        case CLOSE_KEY:
          e.preventDefault()
          e.stopPropagation()
          handleOnClose()
          break
        case KEY.ENTER: {
          e.preventDefault()
          e.stopPropagation()
          const items = findDirectSubitems()
          items.find(([focusable]) => focusable === document.activeElement)?.[1].click()
          break
        }
        case KEY.TAB:
          handleOnCloseAllMenus()
          break
      }
    },
    [CLOSE_KEY, findDirectSubitems, handleMove, handleOnClose, handleOnCloseAllMenus, menuContext],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isExpanded() && e.key === KEY.ESCAPE) {
        menuRef.current?.blur()
        return
      }
      if (isExpanded() && e.key === KEY.TAB) {
        handleOnCloseAllMenus()
        return
      }

      if (menuContext.isInnermostMenu(menuRef)) {
        handleKeyDownOpenMenu(e)
      } else if (
        !isExpanded() &&
        (e.key === KEY.ENTER || e.key === KEY.SPACE || (e.key === OPEN_KEY && depth !== 1))
      ) {
        e.preventDefault()
        handleOnOpen()
      }
    },
    [OPEN_KEY, depth, menuContext, isExpanded, handleKeyDownOpenMenu, handleOnOpen, handleOnCloseAllMenus],
  )

  return {
    menuRef,
    isExpanded,
    handleKeyDown,
    handleKeyDownOpenMenu,
    handleOnOpen,
    handleOnClose,
  }
}
