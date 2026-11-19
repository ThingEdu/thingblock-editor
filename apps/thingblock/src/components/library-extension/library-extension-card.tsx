import classNames from 'classnames'
import type { ReactNode } from 'react'
import styles from './library-extension-card.module.css'

interface LibraryItemProps {
  description: ReactNode
  extensionId: string
  iconURL: string
  insetIconURL?: string
  name: string
  onSelect: () => void
}

/**
 * An extension's tile in the extension library.
 * @param props - The extension's id, name, description and images, and what choosing it does.
 * @returns A button with the extension's banner, its small icon, its name and its description.
 */
const LibraryExtensionCard = (props: LibraryItemProps) => {
  const { description, extensionId, iconURL, insetIconURL, name, onSelect } = props
  return (
    <button
      id={extensionId}
      className={classNames(styles.libraryItem, styles.featuredItem, styles.libraryItemExtension)}
      type="button"
      onClick={onSelect}
    >
      <div className={styles.contentWrapper}>
        <div className={styles.featuredImageContainer}>
          <img alt="" className={styles.featuredImage} src={iconURL} />
        </div>
        {insetIconURL && (
          <div className={styles.libraryItemInsetImageContainer}>
            <img alt="" className={styles.libraryItemInsetImage} src={insetIconURL} />
          </div>
        )}
        <div className={classNames(styles.featuredExtensionText, styles.featuredText)}>
          <span className={styles.libraryItemName}>{name}</span>
          <br />
          <span className={styles.featuredDescription}>{description}</span>
        </div>
      </div>
    </button>
  )
}

export default LibraryExtensionCard
