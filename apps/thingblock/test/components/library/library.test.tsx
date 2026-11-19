import { fireEvent, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import Library, { type LibraryEntry } from '../../../src/components/library/library'
import { renderInEditor } from '../render-in-editor'

const items: LibraryEntry[] = [
  { key: 'blink', name: 'Blink', tags: ['Basics'] },
  { key: 'buzzer', name: 'Buzzer tune', tags: ['Music'] },
  { key: 'servo', name: 'Servo sweep', tags: ['Basics'] },
]

const renderLibrary = (onItemSelected = vi.fn(), onRequestClose = vi.fn()) => {
  renderInEditor(
    <Library
      filterable
      id="testLibrary"
      items={items}
      renderItem={(item, onSelect) => (
        <button type="button" onClick={onSelect}>
          {item.name}
        </button>
      )}
      tags={[
        { tag: 'Basics', label: 'Basics' },
        { tag: 'Music', label: 'Music' },
      ]}
      title="Examples"
      onItemSelected={onItemSelected}
      onRequestClose={onRequestClose}
    />,
  )
  return { onItemSelected, onRequestClose }
}

const shownItems = () => ['Blink', 'Buzzer tune', 'Servo sweep'].filter((name) => screen.queryByText(name))

test('the search finds items by name and by tag', async () => {
  renderLibrary()
  await screen.findByText('Blink')

  fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'servo' } })
  expect(shownItems()).toEqual(['Servo sweep'])

  fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'music' } })
  expect(shownItems()).toEqual(['Buzzer tune'])

  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(shownItems()).toEqual(['Blink', 'Buzzer tune', 'Servo sweep'])
})

test('a tag narrows the items to that tag, and All shows them all again', async () => {
  renderLibrary()
  await screen.findByText('Blink')

  fireEvent.click(screen.getByRole('button', { name: 'Basics' }))
  expect(shownItems()).toEqual(['Blink', 'Servo sweep'])

  fireEvent.click(screen.getByRole('button', { name: 'All' }))
  expect(shownItems()).toEqual(['Blink', 'Buzzer tune', 'Servo sweep'])
})
