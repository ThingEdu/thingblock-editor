import { fireEvent, render } from '@testing-library/react'
import React from 'react'
import { describe, expect, test, vi } from 'vitest'
import { Button } from '../src'

describe('Button', () => {
  test('matches snapshot', () => {
    const { container } = render(<Button onClick={vi.fn()} />)

    expect(container.firstChild).toMatchSnapshot()
  })

  test('triggers callback when clicked', () => {
    const onClick = vi.fn()
    const { container } = render(<Button onClick={onClick} />)

    fireEvent.click(container.firstChild as Element)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('does not trigger callback when disabled', () => {
    const onClick = vi.fn()
    const { container } = render(<Button disabled onClick={onClick} />)

    fireEvent.click(container.firstChild as Element)

    expect(onClick).toHaveBeenCalledTimes(0)
  })
})
