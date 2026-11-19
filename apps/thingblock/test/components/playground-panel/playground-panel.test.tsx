import { fireEvent, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import PlaygroundPanel from '../../../src/components/playground-panel/playground-panel'
import { renderInEditor, vmOf } from '../render-in-editor'

test('playing with the mouse needs no webcam, and the VM hears when the camera is ready and when it stops', () => {
  const store = createEditorStore()
  const onStatus = vi.fn()
  vmOf(store).events.on('CAMERA_AI_CAMERA_STATUS', onStatus)
  renderInEditor(<PlaygroundPanel />, store)

  fireEvent.change(screen.getByRole('combobox', { name: 'Choose a camera' }), { target: { value: 'mouse' } })
  fireEvent.click(screen.getByRole('button', { name: 'Camera' }))
  expect(onStatus).toHaveBeenLastCalledWith({ on: true, ready: true })
  expect(screen.getByText(/follows the mouse/)).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
  expect(onStatus).toHaveBeenLastCalledWith({ on: false, ready: false })
})
