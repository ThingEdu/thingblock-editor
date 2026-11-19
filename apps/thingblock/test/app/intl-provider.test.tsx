import { act, render } from '@testing-library/react'
import { FormattedMessage } from 'react-intl'
import { Provider } from 'react-redux'
import { expect, test } from 'vitest'
import IntlProvider from '../../src/app/intl-provider'
import { createEditorStore } from '../../src/app/store'
import { selectLocale } from '../../src/reducers/locales'

test('messages follow the locale in the store', () => {
  const store = createEditorStore()
  const { container } = render(
    <Provider store={store}>
      <IntlProvider>
        <FormattedMessage defaultMessage="wait [MS] ms" id="arduino.delay" />
      </IntlProvider>
    </Provider>,
  )
  expect(container.textContent).toBe('wait [MS] ms')

  act(() => {
    store.dispatch(selectLocale('vi'))
  })

  expect(container.textContent).toBe('chờ [MS] ms')
})
