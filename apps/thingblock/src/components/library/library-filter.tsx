import classNames from 'classnames'
import { type ChangeEvent, useRef } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import filterIcon from './icon--filter.svg'
import xIcon from './icon--x.svg'
import styles from './library-filter.module.css'

const messages = defineMessages({
  clear: {
    id: 'gui.aria.clearButton',
    defaultMessage: 'Clear',
    description: 'ARIA label for the clear input button',
  },
})

interface FilterProps {
  className?: string
  filterQuery: string
  inputClassName?: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
  placeholderText: string
}

/**
 * A search field with a button that clears it.
 * @param props - The query, its handlers, and the field's look.
 * @returns The field, with its search icon and clear button.
 */
const LibraryFilter = (props: FilterProps) => {
  const { className, filterQuery, inputClassName, onChange, onClear, placeholderText } = props
  const intl = useIntl()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClear = () => {
    onClear()
    inputRef.current?.focus()
  }

  return (
    <div className={classNames(className, styles.filter, { [styles.isActive]: filterQuery.length > 0 })}>
      <img alt="" className={styles.filterIcon} src={filterIcon} />
      <input
        ref={inputRef}
        className={classNames(styles.filterInput, inputClassName)}
        placeholder={placeholderText}
        type="text"
        value={filterQuery}
        onChange={onChange}
      />
      <button
        type="button"
        className={styles.xIconWrapper}
        onClick={handleClear}
        aria-label={intl.formatMessage(messages.clear)}
        // Focusable only while it shows
        tabIndex={filterQuery.length > 0 ? 0 : -1}
      >
        <img alt="" className={styles.xIcon} src={xIcon} />
      </button>
    </div>
  )
}

export default LibraryFilter
