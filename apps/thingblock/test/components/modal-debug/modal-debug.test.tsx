import { fireEvent, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import ModalDebug from '../../../src/components/modal-debug/modal-debug'
import { renderInEditor } from '../render-in-editor'

const readAloud = 'As you read your code aloud, think from the computer’s perspective.'

test('the arrow keys step through the topics, and the topic list jumps to one', () => {
  renderInEditor(<ModalDebug onClose={vi.fn()} />)
  expect(screen.getByText(readAloud)).toBeTruthy()

  // Stepping back from the first topic stays on it
  fireEvent.keyDown(document, { key: 'ArrowLeft' })
  expect(screen.getByText(readAloud)).toBeTruthy()
  fireEvent.keyDown(document, { key: 'ArrowDown' })
  expect(screen.getByText(/^Separate the blocks into smaller chunks/)).toBeTruthy()
  fireEvent.keyDown(document, { key: 'ArrowUp' })
  expect(screen.getByText(readAloud)).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Timing & Parallelism' }))
  expect(screen.getByText('Think About Timing & Parallelism')).toBeTruthy()
})
