import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import DeviceControls from '../../../src/components/device-controls/device-controls'
import { setConnectedBoard, setDevice } from '../../../src/reducers/board'
import { setGeneratedCode } from '../../../src/reducers/code'
import { setRunningState } from '../../../src/reducers/vm-status'
import { renderInEditor, vmOf } from '../render-in-editor'

const board = { id: '/dev/ttyACM0', name: 'Arduino Uno' }

interface SetUpOptions {
  device?: string | null
  connected?: boolean
  code?: string
}

const setUp = ({ device = 'arduinoUno', connected = false, code = '' }: SetUpOptions = {}) => {
  const store = createEditorStore()
  const vm = vmOf(store)
  store.dispatch(setDevice(device))
  store.dispatch(setGeneratedCode(code))
  if (connected) store.dispatch(setConnectedBoard(board))
  return { vm, ...renderInEditor(<DeviceControls />, store) }
}

afterEach(() => {
  history.replaceState(null, '')
})

test('with no board, Run starts the project, and Stop stops it while it runs', () => {
  const { store, vm } = setUp({ device: null })
  const greenFlag = vi.spyOn(vm, 'greenFlag').mockReturnValue()
  vi.spyOn(vm, 'start').mockReturnValue()
  const stopAll = vi.spyOn(vm, 'stopAll').mockReturnValue()

  expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Run' }))
  expect(greenFlag).toHaveBeenCalled()

  act(() => {
    store.dispatch(setRunningState(true))
  })
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
  expect(stopAll).toHaveBeenCalled()
})

test('Connect scans for boards, and picking one connects it', async () => {
  const { store, vm } = setUp()
  const listBoards = vi.spyOn(vm.link, 'listBoards').mockResolvedValue([board])
  const connectBoard = vi.spyOn(vm.link, 'connectBoard').mockResolvedValue()

  fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
  expect(listBoards).toHaveBeenCalledWith('arduinoUno')
  fireEvent.click(await within(screen.getByRole('dialog')).findByRole('button', { name: 'Connect' }))

  await waitFor(() => {
    expect(store.getState().scratchGui.board.connectedBoard).toEqual(board)
  })
  expect(connectBoard).toHaveBeenCalledWith('arduinoUno', board)
  expect(screen.queryByText('Connect a board')).toBeNull()
  expect(screen.getByRole('button', { name: 'Disconnect' })).toBeTruthy()
})

test('a failed connect goes back to the board list with the error', async () => {
  const { vm } = setUp()
  vi.spyOn(vm.link, 'listBoards').mockResolvedValue([board])
  vi.spyOn(vm.link, 'connectBoard').mockRejectedValue(new Error('port busy'))

  fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
  fireEvent.click(await within(screen.getByRole('dialog')).findByRole('button', { name: 'Connect' }))

  expect(await screen.findByText('Couldn’t connect: port busy')).toBeTruthy()
})

test('the board disconnecting clears the connected board', () => {
  const { store, vm } = setUp({ connected: true })

  act(() => {
    vm.events.emit('DEVICE_DISCONNECTED')
  })

  expect(store.getState().scratchGui.board.connectedBoard).toBeNull()
})

test('Upload without a connected board opens the board list', () => {
  const { vm } = setUp()
  const listBoards = vi.spyOn(vm.link, 'listBoards').mockResolvedValue([])

  fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

  expect(listBoards).toHaveBeenCalled()
  expect(screen.getByText('Connect a board')).toBeTruthy()
})

test('Upload compiles the generated code and writes it to the connected board', async () => {
  const { vm } = setUp({ connected: true, code: 'void setup() {}' })
  const artifact = { kind: 'test' } as unknown as Awaited<ReturnType<typeof vm.link.compile>>
  const compile = vi.spyOn(vm.link, 'compile').mockResolvedValue(artifact)
  const upload = vi.spyOn(vm.link, 'upload').mockResolvedValue()

  fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

  expect(await screen.findByText('Your board is ready to go.')).toBeTruthy()
  expect(compile).toHaveBeenCalledWith('arduinoUno', 'void setup() {}', expect.anything())
  expect(upload).toHaveBeenCalledWith('arduinoUno', artifact, expect.anything())
})

test('a stopped upload shows as stopped, not failed', async () => {
  const { vm } = setUp({ connected: true, code: 'void setup() {}' })
  vi.spyOn(vm.link, 'compile').mockRejectedValue(Object.assign(new Error('cancelled'), { code: 'cancelled' }))

  fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

  expect(await screen.findByText('Upload stopped.')).toBeTruthy()
})
