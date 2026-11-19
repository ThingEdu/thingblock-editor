import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import CodeView from '../../../src/components/code-view/code-view'

test('highlights Arduino code, with a line number for each line', () => {
  const { container, getByText } = render(<CodeView code={'void setup() {\n}'} language="arduino" />)

  expect(container.querySelector('pre')?.textContent).toContain('void setup()')
  expect(container.querySelector('.token.keyword')?.textContent).toBe('void')
  expect(getByText('2')).toBeTruthy()
})

test('shows code in a language Prism lacks as plain text', () => {
  const { container } = render(<CodeView code="#include <Servo.h>" language="unknown" />)

  expect(container.querySelector('pre')?.textContent).toBe('#include <Servo.h>')
})
