import { fireEvent, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import ModalBoardList from '../../../src/components/modal-board-list/modal-board-list'
import { renderInEditor } from '../render-in-editor'

const renderDialog = (props: Partial<ComponentProps<typeof ModalBoardList>> = {}) => {
  const handlers = { onCloseDialog: vi.fn(), onConnectBoard: vi.fn(), onScan: vi.fn() }
  renderInEditor(
    <ModalBoardList
      boards={[{ id: '/dev/ttyACM0', name: 'Arduino Uno' }]}
      connectError={null}
      connectingBoard={null}
      deviceIconURL="arduino-uno.svg"
      scanning={false}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

afterEach(() => {
  history.replaceState(null, '')
})

test('lists the boards a finished scan found, each with a Connect button', () => {
  const { onConnectBoard, onScan } = renderDialog()

  expect(screen.getByText('Arduino Uno')).toBeTruthy()
  expect(document.querySelector('img[src="arduino-uno.svg"]')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
  fireEvent.click(screen.getByRole('button', { name: /Refresh/ }))

  expect(onConnectBoard).toHaveBeenCalledWith('/dev/ttyACM0')
  expect(onScan).toHaveBeenCalled()
})

test('a finished scan with no boards shows none found', () => {
  renderDialog({ boards: [] })

  expect(screen.getByText('No devices found')).toBeTruthy()
})

test('shows the board being connected to', () => {
  renderDialog({ connectingBoard: { id: '/dev/ttyACM0', name: 'Arduino Uno' } })

  expect(screen.getByText('Connecting to Arduino Uno…')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull()
})
