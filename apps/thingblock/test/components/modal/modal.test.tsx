import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import Modal from '../../../src/components/modal/modal'
import { storeWrapper } from '../../hooks/store-wrapper'

const renderModal = (onRequestClose = vi.fn()) => {
  render(
    <Modal contentLabel="Choose a board" id="boardLibrary" onRequestClose={onRequestClose}>
      <p>Boards</p>
    </Modal>,
    { wrapper: storeWrapper(createEditorStore()) },
  )
  return onRequestClose
}

afterEach(() => {
  history.replaceState(null, '')
})

test('the close button asks to close the modal', () => {
  const onRequestClose = renderModal()

  fireEvent.click(screen.getByRole('button', { name: 'Close' }))

  expect(onRequestClose).toHaveBeenCalled()
})

test('the browser going back asks to close the modal', () => {
  const onRequestClose = renderModal()
  expect(history.state).toBe('modal-boardLibrary')

  window.dispatchEvent(new PopStateEvent('popstate'))

  expect(onRequestClose).toHaveBeenCalledTimes(1)
})

test('a modal opened again reuses its history entry', () => {
  const pushState = vi.spyOn(history, 'pushState')
  renderModal()
  renderModal()

  expect(pushState).toHaveBeenCalledTimes(1)
  pushState.mockRestore()
})
