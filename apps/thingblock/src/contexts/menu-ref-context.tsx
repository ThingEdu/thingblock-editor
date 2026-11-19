import { createContext, type ReactNode, type RefObject, useCallback, useMemo, useState } from 'react'

/** The element that opens a menu, standing for that menu. */
export type MenuRef = RefObject<HTMLElement>

interface MenuRefContextValue {
  /** Opens a menu at the given depth (1 for a top-level menu), closing the open menus at that depth and deeper. */
  openInnerMenu: (ref: MenuRef, depth: number) => void
  /** Closes a menu and the menus open inside it. */
  closeMenuByRef: (ref: MenuRef) => void
  closeAllMenus: () => void
  isInnermostMenu: (ref: MenuRef) => boolean
  isOutermostMenu: (ref: MenuRef) => boolean
  isOpenMenu: (ref: MenuRef) => boolean
  outermostMenu: MenuRef | null
}

export const MenuRefContext = createContext<MenuRefContextValue | null>(null)

/**
 * Keeps the stack of open menus, outermost first, so nested menus open and close together.
 * @param props React props.
 * @param props.children - The menus and what holds them.
 * @returns The children, with the stack in context.
 */
export const MenuRefProvider = ({ children }: { children: ReactNode }) => {
  const [refStack, setRefStack] = useState<MenuRef[]>([])

  const closeMenuByRef = useCallback((ref: MenuRef) => {
    setRefStack((prev) => {
      const index = prev.indexOf(ref)
      if (index === -1) return prev
      return prev.slice(0, index)
    })
  }, [])

  const openInnerMenu = useCallback((ref: MenuRef, depth: number) => {
    setRefStack((prev) => [...prev.slice(0, depth - 1), ref])
  }, [])

  const closeAllMenus = useCallback(() => {
    setRefStack([])
  }, [])

  const value = useMemo(
    () => ({
      openInnerMenu,
      closeMenuByRef,
      closeAllMenus,
      isInnermostMenu: (ref: MenuRef) => refStack.length > 0 && refStack[refStack.length - 1] === ref,
      isOutermostMenu: (ref: MenuRef) => refStack.length > 0 && refStack[0] === ref,
      isOpenMenu: (ref: MenuRef) => refStack.includes(ref),
      outermostMenu: refStack.length > 0 ? refStack[0] : null,
    }),
    [refStack, openInnerMenu, closeMenuByRef, closeAllMenus],
  )

  return <MenuRefContext.Provider value={value}>{children}</MenuRefContext.Provider>
}
