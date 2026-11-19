import classNames from 'classnames'
import { type ChangeEvent, Fragment, type ReactNode, useEffect, useRef, useState } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import { useModalFocus } from '../../contexts/modal-focus-context'
import Divider from '../divider/divider'
import Modal from '../modal/modal'
import Spinner from '../spinner/spinner'
import LibraryFilter from './library-filter'
import LibraryTagButton from './library-tag-button'
import styles from './library.module.css'

const messages = defineMessages({
  filterPlaceholder: {
    id: 'gui.library.filterPlaceholder',
    defaultMessage: 'Search',
    description: 'Placeholder text for library search field',
  },
  allTag: {
    id: 'gui.library.allTag',
    defaultMessage: 'All',
    description: 'Label for library tag to revert to all items after filtering by tag.',
  },
})

const ALL_TAG = 'all'

/** What the library reads from an item: its React key, and the name and tags a search or tag finds it by. */
export interface LibraryEntry {
  key: string
  /** Searched only when it is a string. */
  name?: ReactNode
  tags?: string[]
}

/** A tag the library can be narrowed to. */
export interface LibraryTag {
  tag: string
  label: string
}

interface LibraryProps<T extends LibraryEntry> {
  /** Shows a search field. */
  filterable?: boolean
  id: string
  items: T[]
  onItemSelected?: (item: T) => void
  onRequestClose: () => void
  /** Renders an item; its `onSelect` closes the library and passes the item to `onItemSelected`. */
  renderItem: (item: T, onSelect: () => void) => ReactNode
  tags?: LibraryTag[]
  title: string
}

const lowerCase = (text: string) => text.toLowerCase()

const matchesQuery = (item: LibraryEntry, query: string) =>
  [...(item.tags ?? []), typeof item.name === 'string' ? item.name : '']
    .map(lowerCase)
    .join('\n') // unlikely to partially match newlines
    .includes(query.toLowerCase())

/**
 * A full-screen modal listing items to choose from, optionally searched or narrowed by tag.
 * @param props - The items and how each renders, the title, the search and tags, and the handlers.
 * @returns The modal, with a spinner in place of the items until they first render.
 */
const Library = <T extends LibraryEntry>(props: LibraryProps<T>) => {
  const { filterable = false, id, items, onItemSelected, onRequestClose, renderItem, tags, title } = props
  const intl = useIntl()
  const { restoreFocus } = useModalFocus()
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState(ALL_TAG)
  const [loaded, setLoaded] = useState(false)
  const scrollGridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Lets the spinner show before the items render
    const timeoutId = setTimeout(() => {
      setLoaded(true)
    })
    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    if (scrollGridRef.current) scrollGridRef.current.scrollTop = 0
  }, [filterQuery, selectedTag])

  const handleClose = () => {
    onRequestClose()
    restoreFocus()
  }

  const handleTagClick = (tag: string) => {
    setFilterQuery('')
    setSelectedTag(tag.toLowerCase())
  }

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilterQuery(event.target.value)
    setSelectedTag(ALL_TAG)
  }

  const filteredItems =
    selectedTag === ALL_TAG
      ? items.filter((item) => !filterQuery || matchesQuery(item, filterQuery))
      : items.filter((item) => item.tags?.map(lowerCase).includes(selectedTag))

  const hasFilterBar = filterable || tags !== undefined

  return (
    <Modal fullScreen contentLabel={title} id={id} onRequestClose={handleClose}>
      {hasFilterBar && (
        <div className={styles.filterBar}>
          {filterable && (
            <LibraryFilter
              className={classNames(styles.filterBarItem, styles.filter)}
              filterQuery={filterQuery}
              inputClassName={styles.filterInput}
              placeholderText={intl.formatMessage(messages.filterPlaceholder)}
              onChange={handleFilterChange}
              onClear={() => {
                setFilterQuery('')
              }}
            />
          )}
          {filterable && tags && <Divider className={classNames(styles.filterBarItem, styles.divider)} />}
          {tags && (
            <div className={styles.tagWrapper}>
              {[{ tag: ALL_TAG, label: intl.formatMessage(messages.allTag) }, ...tags].map(({ tag, label }) => (
                <LibraryTagButton
                  active={selectedTag === tag.toLowerCase()}
                  className={styles.filterBarItem}
                  key={tag}
                  label={label}
                  tag={tag}
                  onClick={handleTagClick}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <div
        className={classNames(styles.libraryScrollGrid, { [styles.withFilterBar]: hasFilterBar })}
        ref={scrollGridRef}
        tabIndex={-1}
      >
        {loaded ? (
          filteredItems.map((item) => (
            <Fragment key={item.key}>
              {renderItem(item, () => {
                handleClose()
                onItemSelected?.(item)
              })}
            </Fragment>
          ))
        ) : (
          <div className={styles.spinnerWrapper}>
            <Spinner large level="primary" />
          </div>
        )}
      </div>
    </Modal>
  )
}

export default Library
