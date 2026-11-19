import { act, fireEvent, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import MonitorViewBoard from '../../../src/components/monitor-view-board/monitor-view-board'
import { renderInEditor, vmOf } from '../render-in-editor'

test('joins serial chunks into lines, and sets the baud rate on the link', () => {
  const store = createEditorStore()
  const vm = vmOf(store)
  const setMonitorBaud = vi.spyOn(vm.link, 'setMonitorBaud').mockReturnValue()
  renderInEditor(<MonitorViewBoard />, store)

  act(() => {
    vm.events.emit('SERIAL_DATA', 'tem')
    vm.events.emit('SERIAL_DATA', 'p=21\r\nhum')
  })
  expect(screen.getByText('temp=21')).toBeTruthy()
  // The unfinished last line waits for the rest of it
  expect(screen.queryByText('hum')).toBeNull()

  fireEvent.change(screen.getByRole('combobox', { name: 'Serial monitor baud rate' }), {
    target: { value: '115200' },
  })
  expect(setMonitorBaud).toHaveBeenCalledWith(115200)
})
