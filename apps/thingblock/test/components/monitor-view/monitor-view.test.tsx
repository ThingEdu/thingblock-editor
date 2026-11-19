import { fireEvent, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import MonitorView from '../../../src/components/monitor-view/monitor-view'
import { renderInEditor } from '../render-in-editor'

type Props = ComponentProps<typeof MonitorView>

const renderMonitor = (props: Partial<Props> = {}) => {
  const handlers = { onClear: vi.fn(), onSend: vi.fn() }
  const ui = (more: Partial<Props>) => (
    <MonitorView logs={[{ message: 'first' }, { message: 'second' }]} {...handlers} {...props} {...more} />
  )
  const { rerender } = renderInEditor(ui({}))
  return {
    ...handlers,
    rerender: (more: Partial<Props>) => {
      rerender(ui(more))
    },
  }
}

const send = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
}

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'scrollTo')
})

test('scrolled up, the Latest button scrolls back to the newest line and hides', () => {
  const scrollTo = vi.fn()
  Object.defineProperty(Element.prototype, 'scrollTo', { value: scrollTo, configurable: true })
  renderMonitor()
  const content = screen.getByText('first').parentElement
  if (!content) throw new Error('the line has no list')
  // jsdom has no layout, so the list's scroll geometry is set by hand
  Object.defineProperties(content, {
    scrollHeight: { value: 500 },
    clientHeight: { value: 100 },
    scrollTop: { value: 0, writable: true },
  })
  fireEvent.scroll(content)

  fireEvent.click(screen.getByRole('button', { name: 'Scroll to latest output' }))

  expect(scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'smooth' })
  expect(screen.queryByRole('button', { name: 'Scroll to latest output' })).toBeNull()
})

test('a question shows above the input, which asks for an answer', () => {
  renderMonitor({ prompt: 'What is your name?' })

  expect(screen.getByText('What is your name?')).toBeTruthy()
  expect(screen.getByPlaceholderText('Type your answer...')).toBeTruthy()
})

test('an empty line is sent only as the answer to a question, even one without text', () => {
  const { onSend, rerender } = renderMonitor()

  send()
  expect(onSend).not.toHaveBeenCalled()
  rerender({ prompt: '' })
  send()
  expect(onSend).toHaveBeenCalledWith('')
})

test('a new question clears what was typed', () => {
  const { rerender } = renderMonitor()

  fireEvent.change(screen.getByPlaceholderText('Send message...'), { target: { value: 'half-typed' } })
  rerender({ prompt: 'Are you ready?' })

  expect(screen.getByPlaceholderText('Type your answer...')).toHaveProperty('value', '')
})
