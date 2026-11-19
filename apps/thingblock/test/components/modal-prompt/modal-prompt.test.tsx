import { fireEvent, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import ModalPrompt from '../../../src/components/modal-prompt/modal-prompt'
import { renderInEditor } from '../render-in-editor'

const renderPrompt = (showTypeOption: boolean) => {
  const onOk = vi.fn()
  renderInEditor(
    <ModalPrompt
      label="New variable name:"
      showTypeOption={showTypeOption}
      title="New Variable"
      onCancel={vi.fn()}
      onOk={onOk}
    />,
  )
  return onOk
}

test('passes the selected type to onOk as a global variable', () => {
  const onOk = renderPrompt(true)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'speed' } })
  fireEvent.click(screen.getByRole('radio', { name: 'Decimal' }))
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
  expect(onOk).toHaveBeenCalledWith('speed', { scope: 'global', dataType: 'float' })
})

test('defaults to the Number type when nothing is changed', () => {
  const onOk = renderPrompt(true)
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
  expect(onOk).toHaveBeenCalledWith('', { scope: 'global', dataType: 'int' })
})

test('omits the type when the chooser is hidden (lists, renames)', () => {
  const onOk = renderPrompt(false)
  expect(screen.queryByRole('radio', { name: 'Number' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
  expect(onOk).toHaveBeenCalledWith('', { scope: 'global', dataType: '' })
})

test('Enter submits, but not while an input method is composing', () => {
  const onOk = renderPrompt(false)
  const input = screen.getByRole('textbox')
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
  expect(onOk).not.toHaveBeenCalled()
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onOk).toHaveBeenCalledTimes(1)
})
