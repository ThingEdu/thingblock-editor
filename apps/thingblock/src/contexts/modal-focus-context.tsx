import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef } from 'react'

interface ModalFocusContextValue {
  /** Remembers the focused element, before a modal opens. */
  captureFocus: () => void
  /** Focuses the remembered element again, if it is still on the page, after the modal closes. */
  restoreFocus: () => void
}

const ModalFocusContext = createContext<ModalFocusContextValue | null>(null)

/**
 * Reads the focus handlers of the `ModalFocusProvider` above.
 * @returns `captureFocus`, for what opens a modal, and `restoreFocus`, for the modal as it closes.
 */
export const useModalFocus = () => {
  const value = useContext(ModalFocusContext)
  if (!value) throw new Error('useModalFocus: no ModalFocusProvider above this component')
  return value
}

/**
 * Returns focus to where it was before a modal opened, once the modal closes.
 * @param props React props.
 * @param props.children - What opens modals.
 * @returns The children, with the focus handlers in context.
 */
export const ModalFocusProvider = ({ children }: { children: ReactNode }) => {
  const lastFocusedElement = useRef<HTMLElement | null>(null)

  const captureFocus = useCallback(() => {
    lastFocusedElement.current = document.activeElement as HTMLElement | null
  }, [])

  const restoreFocus = useCallback(() => {
    if (lastFocusedElement.current?.isConnected) {
      lastFocusedElement.current.focus()
      lastFocusedElement.current = null
    }
  }, [])

  const value = useMemo(() => ({ captureFocus, restoreFocus }), [captureFocus, restoreFocus])

  return <ModalFocusContext.Provider value={value}>{children}</ModalFocusContext.Provider>
}
