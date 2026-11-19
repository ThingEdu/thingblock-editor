import type { ReactNode } from 'react'
import { IntlProvider as ReactIntlProvider } from 'react-intl'
import { useAppSelector } from './store'

/**
 * Provides react-intl with the locale and messages in the `locales` slice.
 * @param props React props.
 * @param props.children The tree to localize.
 * @returns The tree inside react-intl's provider.
 */
const IntlProvider = ({ children }: { children: ReactNode }) => {
  const { locale, messages } = useAppSelector((state) => state.locales)
  return (
    <ReactIntlProvider locale={locale} messages={messages} textComponent="span">
      {children}
    </ReactIntlProvider>
  )
}

export default IntlProvider
