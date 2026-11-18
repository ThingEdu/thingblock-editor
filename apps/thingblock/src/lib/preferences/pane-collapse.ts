import { useCallback, useState } from 'react'

// Where a side pane's open/closed state is kept.
const storageKey = (pane: string) => `thingblock.pane.${pane}.collapsed`

/**
 * Reads whether a side pane was left collapsed. Storage can be missing or throw (private windows,
 * blocked site data); then the pane starts in its default state.
 * @param pane The pane's name, e.g. `code` or `serial`.
 * @param fallback The state to use when nothing is stored.
 * @returns Whether the pane is collapsed.
 */
export const readCollapsed = (pane: string, fallback: boolean): boolean => {
  try {
    const stored = window.localStorage.getItem(storageKey(pane))
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    // Storage unavailable: use the default.
  }
  return fallback
}

/**
 * Remembers whether a side pane is collapsed; a failed write only means it is not remembered.
 * @param pane The pane's name.
 * @param collapsed Whether it is collapsed.
 */
export const writeCollapsed = (pane: string, collapsed: boolean) => {
  try {
    window.localStorage.setItem(storageKey(pane), String(collapsed))
  } catch {
    // Storage unavailable: the state lasts for this session only.
  }
}

/**
 * A side pane's collapsed state, remembered across reloads, like a VS Code side bar section.
 * @param pane The pane's name.
 * @param fallback Whether it starts collapsed when nothing is stored.
 * @returns The state and a function that toggles it.
 */
export const usePaneCollapsed = (pane: string, fallback: boolean): [boolean, () => void] => {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(pane, fallback))
  const toggle = useCallback(() => {
    setCollapsed((current) => {
      writeCollapsed(pane, !current)
      return !current
    })
  }, [pane])
  return [collapsed, toggle]
}
