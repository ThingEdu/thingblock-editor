import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import Fab from '../../../src/components/fab/fab'
import styles from '../../../src/components/fab/fab.module.css'

const renderFab = () => {
  const onClear = vi.fn()
  render(
    <Fab
      img="main.svg"
      items={[
        { img: 'clear.svg', title: 'Clear', onClick: onClear },
        { img: 'scroll.svg', title: 'Auto-scroll' },
        { img: 'time.svg', title: 'Timestamps' },
      ]}
      title="Actions"
    />,
  )
  const main = screen.getByRole('button', { name: 'Actions' })
  if (!main.parentElement) throw new Error('the main button has no container')
  return { main, container: main.parentElement, onClear }
}

test('opens on focus, the arrow keys cycle through its buttons, Escape goes back and Tab closes it', () => {
  const { main, container } = renderFab()
  const button = (name: string) => screen.getByRole('button', { name })

  act(() => {
    main.focus()
  })
  expect(container.classList).toContain(styles.expanded)

  fireEvent.keyDown(main, { key: 'ArrowDown' })
  expect(document.activeElement).toBe(button('Clear'))
  fireEvent.keyDown(button('Clear'), { key: 'ArrowUp' })
  expect(document.activeElement).toBe(button('Timestamps'))
  fireEvent.keyDown(button('Timestamps'), { key: 'ArrowDown' })
  expect(document.activeElement).toBe(button('Clear'))

  fireEvent.keyDown(button('Clear'), { key: 'Escape' })
  expect(document.activeElement).toBe(main)
  fireEvent.keyDown(main, { key: 'Tab' })
  expect(container.classList).not.toContain(styles.expanded)
})

test('a button runs its action, and one without an action is only coming soon', () => {
  const { onClear } = renderFab()

  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(onClear).toHaveBeenCalled()
  const comingSoon = screen.getByRole('button', { name: 'Auto-scroll' })
  fireEvent.click(comingSoon)
  expect(comingSoon.classList).toContain(styles.comingSoon)
})
