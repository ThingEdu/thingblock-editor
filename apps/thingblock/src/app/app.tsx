import { useState } from 'react'
import { Provider } from 'react-redux'
import Editor from './editor'
import ErrorBoundary from './error-boundary'
import IntlProvider from './intl-provider'
import { createEditorStore } from './store'

/**
 * The editor with its store, localized, behind an error boundary.
 * @returns The editor and what it runs inside.
 */
const App = () => {
  const [store] = useState(createEditorStore)
  return (
    <Provider store={store}>
      <IntlProvider>
        <ErrorBoundary>
          <Editor />
        </ErrorBoundary>
      </IntlProvider>
    </Provider>
  )
}

export default App
