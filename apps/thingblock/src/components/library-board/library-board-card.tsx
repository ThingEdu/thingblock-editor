import type { ReactNode } from 'react'
import { FormattedMessage } from 'react-intl'
import styles from './library-board-card.module.css'

const requiresLabels: Record<string, ReactNode> = {
  serial: (
    <FormattedMessage
      defaultMessage="Serial"
      description="Connection requirement label for serial/USB devices"
      id="gui.deviceCard.requires.serial"
    />
  ),
  ble: (
    <FormattedMessage
      defaultMessage="Bluetooth"
      description="Connection requirement label for Bluetooth devices"
      id="gui.deviceCard.requires.ble"
    />
  ),
  usb: (
    <FormattedMessage
      defaultMessage="USB"
      description="Connection requirement label for USB devices"
      id="gui.deviceCard.requires.usb"
    />
  ),
}

export interface LibraryBoardCardProps {
  description?: ReactNode
  /** A link to the device's help or support page. */
  help?: string
  iconURL?: string
  /** A link to the device's documentation. */
  learnMore?: string
  manufacturer?: string
  name: ReactNode
  onSelect: () => void
  /** How the device connects: `serial`, `ble`, `usb`, or text to show as it is. */
  requires?: string
}

/**
 * A board's card in the board library.
 * @param props - The board's presentation, and what choosing it does.
 * @returns A button with the board's picture, name, description and connection, then its links.
 */
const LibraryBoardCard = (props: LibraryBoardCardProps) => {
  const { description, help, iconURL, learnMore, manufacturer, name, onSelect, requires } = props
  return (
    <div className={styles.card}>
      <button className={styles.selectButton} type="button" onClick={onSelect}>
        <div className={styles.imageContainer}>
          {iconURL && <img alt="" className={styles.image} draggable={false} src={iconURL} />}
        </div>
        <div className={styles.text}>
          <span className={styles.name}>{name}</span>
          <span className={styles.description}>{description}</span>
        </div>
        {(Boolean(requires) || Boolean(manufacturer)) && (
          <div className={styles.metadata}>
            <div className={styles.metadataColumn}>
              {requires && (
                <>
                  <span className={styles.metadataLabel}>
                    <FormattedMessage
                      defaultMessage="Requires"
                      description="Label for a device's connection requirement"
                      id="gui.deviceCard.requires"
                    />
                  </span>
                  <span className={styles.metadataDetail}>
                    {Object.hasOwn(requiresLabels, requires) ? requiresLabels[requires] : requires}
                  </span>
                </>
              )}
            </div>
            <div className={styles.metadataColumn}>
              {manufacturer && (
                <>
                  <span className={styles.metadataLabel}>
                    <FormattedMessage
                      defaultMessage="Manufacturer"
                      description="Label for a device's manufacturer"
                      id="gui.deviceCard.manufacturer"
                    />
                  </span>
                  <span className={styles.metadataDetail}>{manufacturer}</span>
                </>
              )}
            </div>
          </div>
        )}
      </button>
      {(Boolean(learnMore) || Boolean(help)) && (
        <div className={styles.links}>
          {learnMore && (
            <a className={styles.link} href={learnMore} target="_blank" rel="noopener noreferrer">
              <FormattedMessage
                defaultMessage="Learn more"
                description="Link to a device's documentation"
                id="gui.deviceCard.learnMore"
              />
            </a>
          )}
          {help && (
            <a className={styles.link} href={help} target="_blank" rel="noopener noreferrer">
              <FormattedMessage
                defaultMessage="Help"
                description="Link to a device's help/support page"
                id="gui.deviceCard.help"
              />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default LibraryBoardCard
