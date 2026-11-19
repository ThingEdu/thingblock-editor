import classNames from 'classnames'
import type { ReactNode } from 'react'
import { defineMessages, FormattedMessage, useIntl } from 'react-intl'
import type { Requirement } from '../../lib/extensions'
import bluetoothIcon from './icon--bluetooth.svg'
import webcamIcon from './icon--webcam.svg'
import styles from './library-extension-card.module.css'

const requirementMessages = defineMessages({
  bluetooth: {
    defaultMessage: 'Bluetooth',
    description: 'Name of the Bluetooth icon under "Requires" on an extension card',
    id: 'gui.extensionLibrary.bluetooth',
  },
  webcam: {
    defaultMessage: 'Webcam',
    description: 'Name of the webcam icon under "Requires" on an extension card',
    id: 'gui.extensionLibrary.webcam',
  },
})

const requirementIcons: Record<Requirement, string> = { bluetooth: bluetoothIcon, webcam: webcamIcon }

interface LibraryItemProps {
  description: ReactNode
  extensionId: string
  iconURL: string
  insetIconURL?: string
  name: string
  requires?: Requirement[]
  onSelect: () => void
}

/**
 * An extension's tile in the extension library.
 * @param props - The extension's id, name, description, images and requirements, and what choosing it does.
 * @returns A button with the extension's banner, its small icon, its name, its description and what it requires.
 */
const LibraryExtensionCard = (props: LibraryItemProps) => {
  const { description, extensionId, iconURL, insetIconURL, name, onSelect, requires } = props
  const intl = useIntl()
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
        {requires && (
          <div className={styles.featuredExtensionMetadata}>
            <FormattedMessage
              defaultMessage="Requires"
              description="Label for extension hardware requirements"
              id="gui.extensionLibrary.requires"
            />
            <div className={styles.featuredExtensionMetadataDetail}>
              {requires.map((requirement) => {
                const label = intl.formatMessage(requirementMessages[requirement])
                return <img key={requirement} alt={label} src={requirementIcons[requirement]} title={label} />
              })}
            </div>
          </div>
        )}
      </div>
    </button>
  )
}

export default LibraryExtensionCard
