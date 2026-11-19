import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { readCollapsed, usePaneCollapsed, writeCollapsed } from '../../../src/lib/preferences/pane-collapse'

beforeEach(() => {
  window.localStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

const Pane = ({ name, fallback }: { name: string; fallback: boolean }) => {
  const [collapsed, toggle] = usePaneCollapsed(name, fallback)
  return (
    <button type="button" onClick={toggle}>
      {collapsed ? 'closed' : 'open'}
    </button>
  )
}

test('a pane starts in its default state, then remembers what the learner chose', () => {
  const first = render(<Pane fallback name="code" />)
  expect(first.getByText('closed')).toBeTruthy()
  act(() => {
    fireEvent.click(first.getByText('closed'))
  })
  expect(first.getByText('open')).toBeTruthy()
  first.unmount()
  // a reload: the pane comes back open
  const second = render(<Pane fallback name="code" />)
  expect(second.getByText('open')).toBeTruthy()
  second.unmount()
})

test('panes are remembered separately', () => {
  writeCollapsed('code', false)
  expect(readCollapsed('code', true)).toBe(false)
  expect(readCollapsed('serial', true)).toBe(true)
})

test('blocked storage falls back to the default and does not throw', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(readCollapsed('code', true)).toBe(true)
  expect(() => {
    writeCollapsed('code', false)
  }).not.toThrow()
  const { getByText, unmount } = render(<Pane fallback name="code" />)
  act(() => {
    fireEvent.click(getByText('closed'))
  })
  expect(getByText('open')).toBeTruthy()
  unmount()
})
