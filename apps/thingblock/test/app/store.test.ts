import VM from '@thingblock/thingblock-vm'
import { afterEach, expect, test } from 'vitest'
import { createEditorStore } from '../../src/app/store'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

test('the store starts in English, with a VM', () => {
  const state = createEditorStore().getState()

  expect(state.locales.locale).toBe('en')
  expect(state.scratchGui.vm).toBeInstanceOf(VM)
})

test('the store starts in the detected locale', () => {
  window.history.replaceState(null, '', '/?locale=vi')

  const { locales } = createEditorStore().getState()

  expect(locales.locale).toBe('vi')
  expect(locales.messages).toBe(locales.messagesByLocale.vi)
})
