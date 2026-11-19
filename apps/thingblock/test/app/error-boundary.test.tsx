import { fireEvent, render } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, test, vi } from 'vitest'
import ErrorBoundary from '../../src/app/error-boundary'
import log from '../../src/lib/log'

const Broken = () => {
  throw new Error('broken component')
}

test('a crash shows a message with a way to reload, and is logged', () => {
  // React reports the error to the console, and jsdom reports it as uncaught
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const keepQuiet = (event: ErrorEvent) => event.preventDefault()
  window.addEventListener('error', keepQuiet)
  const logError = vi.spyOn(log, 'error').mockImplementation(() => undefined)
  const replace = vi.fn()
  vi.spyOn(window, 'location', 'get').mockReturnValue({
    ...window.location,
    origin: 'http://localhost',
    pathname: '/editor/',
    replace,
  })

  const { getByRole, getByText } = render(
    <IntlProvider locale="en">
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    </IntlProvider>,
  )

  expect(getByText('Oops! Something went wrong.')).toBeTruthy()
  expect(logError).toHaveBeenCalledWith(expect.stringContaining('broken component'))
  fireEvent.click(getByRole('button', { name: 'Reload' }))
  expect(replace).toHaveBeenCalledWith('http://localhost/editor/')
  window.removeEventListener('error', keepQuiet)
  vi.restoreAllMocks()
})

test('without a crash, the tree renders as it is', () => {
  const { getByText } = render(
    <IntlProvider locale="en">
      <ErrorBoundary>
        <p>editor</p>
      </ErrorBoundary>
    </IntlProvider>,
  )

  expect(getByText('editor')).toBeTruthy()
})
