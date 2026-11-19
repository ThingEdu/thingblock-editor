import { fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, test, vi } from 'vitest'
import LibraryBoardCard from '../../../src/components/library-board/library-board-card'

const renderCard = () => {
  const onSelect = vi.fn()
  render(
    <IntlProvider locale="en">
      <LibraryBoardCard
        description="The classic board for getting started."
        help="https://example.com/help"
        iconURL="arduino-uno.svg"
        learnMore="https://example.com/learn-more"
        manufacturer="arduino.cc"
        name="Arduino Uno"
        requires="serial"
        onSelect={onSelect}
      />
    </IntlProvider>,
  )
  return onSelect
}

test('opening a link does not select the device', () => {
  const onSelect = renderCard()

  fireEvent.click(screen.getByRole('link', { name: 'Learn more' }))

  expect(onSelect).not.toHaveBeenCalled()
})
