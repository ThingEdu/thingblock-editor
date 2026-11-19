import { fireEvent, render } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import Menu, { MenuItem, MenuSection } from '../../../src/components/menu/menu'

test('an open menu asks to close on a click outside it, not inside', () => {
  const onRequestClose = vi.fn()
  const { getByText } = render(
    <Menu open onRequestClose={onRequestClose}>
      <MenuItem>New</MenuItem>
    </Menu>,
  )

  fireEvent.pointerUp(getByText('New'))
  expect(onRequestClose).not.toHaveBeenCalled()

  fireEvent.pointerUp(document.body)
  expect(onRequestClose).toHaveBeenCalledTimes(1)
})

test('a section keeps the class of its first item', () => {
  const { getByText } = render(
    <ul>
      <MenuSection>
        <MenuItem className="first">New</MenuItem>
        <MenuItem>Open</MenuItem>
      </MenuSection>
    </ul>,
  )

  expect(getByText('New').classList).toContain('first')
})
