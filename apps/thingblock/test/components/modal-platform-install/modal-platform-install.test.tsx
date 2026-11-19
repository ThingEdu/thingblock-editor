import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import ModalPlatformInstall from '../../../src/components/modal-platform-install/modal-platform-install'
import { setDevice } from '../../../src/reducers/board'
import { setLinkMode } from '../../../src/reducers/settings'
import { renderInEditor, vmOf } from '../render-in-editor'

const setUp = () => {
  const store = createEditorStore()
  const vm = vmOf(store)
  const getPlatformStatus = vi
    .spyOn(vm.link, 'getPlatformStatus')
    .mockResolvedValue({ id: 'esp32:esp32', name: 'esp32', installed: false, known: true })
  // The download runs until the test settles it
  let settle = { resolve: () => {}, reject: (_error: unknown) => {} }
  const installPlatform = vi.spyOn(vm.link, 'installPlatform').mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        settle = { resolve: () => resolve(), reject }
      }),
  )
  const callbacks = () => {
    const streamCallbacks = installPlatform.mock.calls[0][1]
    if (!streamCallbacks?.onLog || !streamCallbacks.onProgress) throw new Error('installPlatform got no callbacks')
    return { onLog: streamCallbacks.onLog, onProgress: streamCallbacks.onProgress }
  }
  store.dispatch(setDevice('esp32'))
  renderInEditor(<ModalPlatformInstall />, store)
  return { store, vm, getPlatformStatus, installPlatform, callbacks, settle: () => settle }
}

afterEach(() => {
  history.replaceState(null, '')
})

test('offers to download a missing board package, and a dismissed offer stays dismissed', async () => {
  const { store, getPlatformStatus } = setUp()

  expect(await screen.findByText(/The esp32 board package isn’t installed/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
  expect(screen.queryByText(/board package/)).toBeNull()

  // Cloud mode doesn't ask the helper; back in link mode, the board was already offered the download
  act(() => {
    store.dispatch(setLinkMode('cloud'))
  })
  act(() => {
    store.dispatch(setLinkMode('link'))
  })
  expect(getPlatformStatus).toHaveBeenCalledTimes(1)
})

test('shows the download’s progress, phase and log, and Stop shows it stopped', async () => {
  const { vm, installPlatform, callbacks, settle } = setUp()
  vi.spyOn(vm.link, 'cancelPlatformInstall').mockImplementation(() => {
    settle().reject(Object.assign(new Error('cancelled'), { code: 'cancelled' }))
  })

  fireEvent.click(await screen.findByRole('button', { name: 'Download' }))
  expect(installPlatform).toHaveBeenCalledWith('esp32', expect.anything())
  expect(screen.getByText('Downloading the esp32 board package…')).toBeTruthy()
  // An indeterminate bar until the helper reports progress
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull()

  act(() => {
    callbacks().onProgress({ phase: 'esp32-arduino-libs', percent: 40 })
    callbacks().onLog('Tool downloaded\n')
  })
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40')
  expect(screen.getByText('esp32-arduino-libs')).toBeTruthy()
  expect(screen.queryByText('Tool downloaded')).toBeNull()
  fireEvent.click(screen.getByText('Details'))
  expect(screen.getByText('Tool downloaded')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
  expect(await screen.findByText('Download stopped.')).toBeTruthy()
})

test('a failed download shows its error, with the log open', async () => {
  const { callbacks, settle } = setUp()

  fireEvent.click(await screen.findByRole('button', { name: 'Download' }))
  act(() => {
    callbacks().onLog('Downloading esptool\n')
    settle().reject(new Error('network unreachable'))
  })

  expect(await screen.findByText('network unreachable')).toBeTruthy()
  expect(screen.getByText('Downloading esptool')).toBeTruthy()
})
