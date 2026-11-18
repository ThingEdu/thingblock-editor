import { afterEach, expect, test, vi } from 'vitest'
import { confirmAsync } from '../../../src/lib/project/native-dialogs'

afterEach(() => {
  delete window.__TAURI_INTERNALS__
  vi.restoreAllMocks()
})

test('in a browser it asks with window.confirm', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  await expect(confirmAsync('Thay thế?')).resolves.toBe(false)
  confirm.mockReturnValue(true)
  await expect(confirmAsync('Thay thế?')).resolves.toBe(true)
  expect(confirm).toHaveBeenCalledWith('Thay thế?')
})

test('in the desktop app it shows the native dialog with the given labels', async () => {
  const invoke = vi.fn(() => Promise.resolve<unknown>(false))
  window.__TAURI_INTERNALS__ = { invoke }
  await expect(confirmAsync('Thay thế?', { okLabel: 'Thay thế', cancelLabel: 'Hủy' })).resolves.toBe(false)
  expect(invoke).toHaveBeenCalledWith('confirm_dialog', {
    message: 'Thay thế?',
    title: 'ThingBlock',
    okLabel: 'Thay thế',
    cancelLabel: 'Hủy',
  })
  invoke.mockReturnValue(Promise.resolve(true))
  await expect(confirmAsync('Thay thế?')).resolves.toBe(true)
})

// The dialog plugin's window.confirm returns a Promise. A synchronous check treats it as "yes"; the answer must be
// awaited.
test("without the command it awaits the plugin's async window.confirm", async () => {
  window.__TAURI_INTERNALS__ = { invoke: vi.fn(() => Promise.reject(new Error('unknown command'))) }
  vi.spyOn(window, 'confirm').mockImplementation(() => Promise.resolve(false) as unknown as boolean)
  await expect(confirmAsync('Thay thế?')).resolves.toBe(false)
})
