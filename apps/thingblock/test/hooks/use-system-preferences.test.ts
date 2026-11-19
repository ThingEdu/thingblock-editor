import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../src/app/store'
import { useSystemPreferences } from '../../src/hooks/use-system-preferences'
import { HIGH_CONTRAST_MODE } from '../../src/lib/settings/color-mode'
import { storeWrapper } from './store-wrapper'

test('the color mode follows the system high-contrast setting', () => {
  const highContrast = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal('matchMedia', () => highContrast)
  const store = createEditorStore()
  const { unmount } = renderHook(useSystemPreferences, { wrapper: storeWrapper(store) })

  highContrast.matches = true
  act(() => {
    highContrast.dispatchEvent(new Event('change'))
  })
  expect(store.getState().scratchGui.settings.colorMode).toBe(HIGH_CONTRAST_MODE)

  // Unmounted, it no longer follows
  unmount()
  highContrast.matches = false
  highContrast.dispatchEvent(new Event('change'))
  expect(store.getState().scratchGui.settings.colorMode).toBe(HIGH_CONTRAST_MODE)
})
