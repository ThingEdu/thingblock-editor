import { fireEvent, render } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import Button from '../../../src/components/button/button'

test('a click calls onClick, unless the button is disabled', () => {
  const onClick = vi.fn()
  const { getByRole, rerender } = render(<Button onClick={onClick}>Upload</Button>)

  fireEvent.click(getByRole('button', { name: 'Upload' }))
  rerender(
    <Button disabled onClick={onClick}>
      Upload
    </Button>,
  )
  fireEvent.click(getByRole('button', { name: 'Upload' }))

  expect(onClick).toHaveBeenCalledTimes(1)
})
