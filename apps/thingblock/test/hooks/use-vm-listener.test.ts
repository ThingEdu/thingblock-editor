import { renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../src/app/store'
import { useVmListener } from '../../src/hooks/use-vm-listener'
import { storeWrapper } from './store-wrapper'

const setUp = () => {
  const store = createEditorStore()
  const vm = store.getState().scratchGui.vm
  if (!vm) throw new Error('the store has no VM')
  const hook = renderHook(useVmListener, { wrapper: storeWrapper(store) })
  return { store, vm, hook }
}

test('VM events reach the store', () => {
  const { store, vm } = setUp()

  vm.events.emit('RUNTIME_STARTED')
  vm.events.emit('PROJECT_RUN_START')
  vm.events.emit('TURBO_MODE_ON')
  vm.events.emit('PROJECT_CHANGED')
  vm.events.emit('EXTENSION_ADDED', { id: 'cameraAi' })
  vm.events.emit('BOARD_RESTORED', { device: 'thingbot', peripherals: [] })

  const state = store.getState().scratchGui
  expect(state.vmStatus).toEqual({ started: true, running: true, turbo: true })
  expect(state.projectChanged).toBe(true)
  expect(state.cameraAi.loaded).toBe(true)
  expect(state.board.selectedDeviceId).toBe('thingbot')

  vm.events.emit('PROJECT_RUN_STOP')
  vm.events.emit('TURBO_MODE_OFF')
  vm.events.emit('BOARD_RESTORED', { device: null, peripherals: [] })

  expect(store.getState().scratchGui.vmStatus).toEqual({ started: true, running: false, turbo: false })
  expect(store.getState().scratchGui.board.selectedDeviceId).toBeNull()
})

test('other extensions do not show the Camera AI panel', () => {
  const { store, vm } = setUp()

  vm.events.emit('EXTENSION_ADDED', { id: 'arduino' })

  expect(store.getState().scratchGui.cameraAi.loaded).toBe(false)
})

test('nothing is forwarded once unmounted', () => {
  const { store, vm, hook } = setUp()

  hook.unmount()
  vm.events.emit('PROJECT_CHANGED')
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))

  expect(store.getState().scratchGui.projectChanged).toBe(false)
  expect(vm.events.listenerCount('PROJECT_CHANGED')).toBe(0)
})

test('key presses go to the VM, except those typed into an input', () => {
  const { vm } = setUp()
  const postIOData = vi.spyOn(vm, 'postIOData')
  const input = document.body.appendChild(document.createElement('input'))
  const svg = document.body.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))

  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }))
  expect(postIOData).not.toHaveBeenCalled()

  // The Blockly workspace, with a block focused
  svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }))
  expect(postIOData).toHaveBeenLastCalledWith('keyboard', { key: 'A', isDown: true })

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'B' }))
  expect(postIOData).toHaveBeenLastCalledWith('keyboard', { key: 'B', isDown: true })

  input.dispatchEvent(new KeyboardEvent('keyup', { key: 'A', bubbles: true }))
  expect(postIOData).toHaveBeenLastCalledWith('keyboard', { key: 'A', isDown: false })

  // iOS Bluetooth keyboards send a dead key, so its key code goes instead
  document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Dead', keyCode: 10 }))
  expect(postIOData).toHaveBeenLastCalledWith('keyboard', { key: 10, isDown: false })

  input.remove()
  svg.remove()
})

test('space and the arrow keys do not scroll the page', () => {
  setUp()
  const arrow = new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, cancelable: true })
  const letter = new KeyboardEvent('keydown', { key: 'A', keyCode: 65, cancelable: true })

  document.dispatchEvent(arrow)
  document.dispatchEvent(letter)

  expect(arrow.defaultPrevented).toBe(true)
  expect(letter.defaultPrevented).toBe(false)
})
