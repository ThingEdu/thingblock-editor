import { fireEvent, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import ModalUpload from '../../../src/components/modal-upload/modal-upload'
import { ModalFocusProvider } from '../../../src/contexts/modal-focus-context'
import { renderInEditor } from '../render-in-editor'

type Props = ComponentProps<typeof ModalUpload>

const renderModal = (props: Partial<Props> = {}) => {
  const handlers = { onCancel: vi.fn(), onClose: vi.fn() }
  const ui = (more: Partial<Props>) => (
    <ModalUpload error={null} logs={[]} progress={null} status="compiling" {...handlers} {...props} {...more} />
  )
  const { rerender } = renderInEditor(ui({}))
  // renderInEditor puts the modal focus provider around the first render only
  return {
    ...handlers,
    rerender: (more: Partial<Props>) => {
      rerender(<ModalFocusProvider>{ui(more)}</ModalFocusProvider>)
    },
  }
}

afterEach(() => {
  history.replaceState(null, '')
})

test('shows the compile status, progress percent, and a Stop button while compiling', () => {
  const { onCancel } = renderModal({ progress: { phase: 'Linking', percent: 80 }, logs: ['Compiling sketch\n'] })

  expect(screen.getByText('Compiling your project…')).toBeTruthy()
  expect(screen.getByText('80%')).toBeTruthy()
  expect(screen.getByText('Compiling sketch')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
  expect(onCancel).toHaveBeenCalled()
})

test('reads the upload percent from the log to drive the bar', () => {
  renderModal({ status: 'uploading', logs: ['Writing at 0x1000 (40 %)\n', 'Writing at 0x8000 (72 %)\n'] })

  expect(screen.getByText('Writing to your board…')).toBeTruthy()
  expect(screen.getByText('72%')).toBeTruthy()
})

test('strips ANSI escapes and carriage-return overwrites from the log', () => {
  renderModal({ logs: ['\u001b[1A\u001b[2KWriting flash\rDone flashing'] })

  expect(screen.getByText(/Done flashing/)).toBeTruthy()
  expect(screen.queryByText(/\[2K/)).toBeNull()
})

test('the log folds away when the upload is done and opens when it fails', () => {
  const { rerender, onClose } = renderModal({ logs: ['Compiling sketch\n'] })

  rerender({ status: 'done' })
  expect(screen.queryByText('Compiling sketch')).toBeNull()
  fireEvent.click(screen.getByText('Close'))
  expect(onClose).toHaveBeenCalled()

  rerender({ status: 'error', error: 'avrdude: not in sync' })
  expect(screen.getByText('Compiling sketch')).toBeTruthy()
  expect(screen.getByText('avrdude: not in sync')).toBeTruthy()
})
