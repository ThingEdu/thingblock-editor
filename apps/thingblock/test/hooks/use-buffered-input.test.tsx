import { fireEvent, render } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { useBufferedInput } from '../../src/hooks/use-buffered-input'

const TitleInput = ({ onSubmit }: { onSubmit: (value: string) => void }) => (
  <input aria-label="Title" {...useBufferedInput('Robot', onSubmit)} />
)

const setUp = () => {
  const onSubmit = vi.fn()
  const { getByRole } = render(<TitleInput onSubmit={onSubmit} />)
  const input = getByRole('textbox', { name: 'Title' }) as HTMLInputElement
  input.focus()
  return { input, onSubmit }
}

test('edits show in the input but are submitted only when it loses focus', () => {
  const { input, onSubmit } = setUp()

  fireEvent.change(input, { target: { value: 'Line follower' } })
  expect(input.value).toBe('Line follower')
  expect(onSubmit).not.toHaveBeenCalled()

  fireEvent.blur(input)
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Line follower')
})

test('Enter submits the edit once and leaves the input', () => {
  const { input, onSubmit } = setUp()

  fireEvent.change(input, { target: { value: 'Line follower' } })
  fireEvent.keyDown(input, { key: 'Enter' })

  expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Line follower')
  expect(document.activeElement).not.toBe(input)
})

test('leaving an unedited input submits nothing', () => {
  const { input, onSubmit } = setUp()

  fireEvent.blur(input)

  expect(onSubmit).not.toHaveBeenCalled()
  expect(input.value).toBe('Robot')
})
