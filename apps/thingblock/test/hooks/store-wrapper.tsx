import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import IntlProvider from '../../src/app/intl-provider'
import type { EditorStore } from '../../src/app/store'

/**
 * @param store The store to provide.
 * @returns A `renderHook` wrapper that provides the store and its locale.
 */
export const storeWrapper =
  (store: EditorStore) =>
  ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <IntlProvider>{children}</IntlProvider>
    </Provider>
  )
