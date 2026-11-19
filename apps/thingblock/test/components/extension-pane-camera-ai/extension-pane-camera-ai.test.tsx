import { fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import ExtensionPaneCameraAi from '../../../src/components/extension-pane-camera-ai/extension-pane-camera-ai'
import { renderInEditor, vmOf } from '../render-in-editor'

afterEach(() => {
  delete window.thingblockCameraReplay
})

test('the VM hears when the camera starts from the stage and stops from the actions', () => {
  // Replayed hands stand in for the webcam and the model, which jsdom lacks
  window.thingblockCameraReplay = [{ dt: 1000, hands: [] }]
  const store = createEditorStore()
  const onStatus = vi.fn()
  vmOf(store).events.on('CAMERA_AI_CAMERA_STATUS', onStatus)
  renderInEditor(<ExtensionPaneCameraAi />, store)

  fireEvent.click(screen.getByRole('button', { name: 'Camera' }))
  expect(onStatus).toHaveBeenLastCalledWith({ on: true, ready: true })

  fireEvent.click(screen.getByRole('button', { name: 'Turn the webcam off' }))
  expect(onStatus).toHaveBeenLastCalledWith({ on: false, ready: false })
})
