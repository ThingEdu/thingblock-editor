import { act, fireEvent, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import MonitorViewHost from '../../../src/components/monitor-view-host/monitor-view-host'
import { renderInEditor, vmOf } from '../render-in-editor'

test('shows what the blocks print, and answers a question', () => {
  const store = createEditorStore()
  const vm = vmOf(store)
  const writeMonitor = vi.spyOn(vm, 'writeMonitor').mockReturnValue()
  renderInEditor(<MonitorViewHost />, store)

  act(() => {
    vm.events.emit('PRINT_TO_MONITOR', 'hello')
    vm.events.emit('QUESTION', 'Your name?')
  })
  expect(screen.getByText('hello')).toBeTruthy()
  const input = screen.getByPlaceholderText('Type your answer...')
  fireEvent.change(input, { target: { value: 'Ada' } })
  fireEvent.keyDown(input, { key: 'Enter' })

  expect(writeMonitor).toHaveBeenCalledWith('Ada')
  expect(screen.queryByText('Your name?')).toBeNull()
})
