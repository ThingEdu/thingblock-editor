import { fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, test, vi } from 'vitest'
import LibraryPeripheralCard from '../../../src/components/library-peripheral/library-peripheral-card'

const renderCard = (state: { active: boolean; locked: boolean }) => {
  const onToggle = vi.fn()
  render(
    <IntlProvider locale="en">
      <LibraryPeripheralCard {...state} description="A hobby servo motor." name="Servo" onToggle={onToggle} />
    </IntlProvider>,
  )
  return onToggle
}

test('an inactive peripheral shows Add and toggles when clicked', () => {
  const onToggle = renderCard({ active: false, locked: false })

  expect(screen.getByText('Add')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /Servo/ }))

  expect(onToggle).toHaveBeenCalledTimes(1)
})

test('a locked peripheral shows Included and cannot be toggled', () => {
  const onToggle = renderCard({ active: true, locked: true })

  expect(screen.getByText('Included')).toBeTruthy()
  const button = screen.getByRole('button', { name: /Servo/ })
  expect(button.hasAttribute('disabled')).toBe(true)
  fireEvent.click(button)

  expect(onToggle).not.toHaveBeenCalled()
})
