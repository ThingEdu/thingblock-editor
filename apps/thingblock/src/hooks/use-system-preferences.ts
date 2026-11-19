import { useEffect } from 'react'
import { useAppDispatch } from '../app/store'
import { PREFERS_HIGH_CONTRAST_QUERY, detectColorMode } from '../lib/settings/color-mode/persistence'
import { setColorMode } from '../reducers/settings'

/** Follows the system's high-contrast preference, unless the learner chose a color mode. */
export const useSystemPreferences = () => {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const highContrast = window.matchMedia(PREFERS_HIGH_CONTRAST_QUERY)
    const followSystem = () => dispatch(setColorMode(detectColorMode()))
    highContrast.addEventListener('change', followSystem)
    return () => highContrast.removeEventListener('change', followSystem)
  }, [dispatch])
}
