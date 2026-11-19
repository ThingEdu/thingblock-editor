import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import { createEditorStore } from '../../src/app/store'
import { useLeavePagePrompt } from '../../src/hooks/use-leave-page-prompt'
import { setProjectChanged, setProjectUnchanged } from '../../src/reducers/project-changed'
import { storeWrapper } from './store-wrapper'

// Whether leaving the page now asks first
const asksBeforeLeaving = () => {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

test('leaving the page asks first only while the project has unsaved changes', () => {
  const store = createEditorStore()
  const { unmount } = renderHook(useLeavePagePrompt, { wrapper: storeWrapper(store) })
  expect(asksBeforeLeaving()).toBe(false)

  act(() => {
    store.dispatch(setProjectChanged())
  })
  expect(asksBeforeLeaving()).toBe(true)

  act(() => {
    store.dispatch(setProjectUnchanged())
  })
  expect(asksBeforeLeaving()).toBe(false)

  act(() => {
    store.dispatch(setProjectChanged())
  })
  unmount()
  expect(asksBeforeLeaving()).toBe(false)
})
