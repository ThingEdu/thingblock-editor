import classNames from 'classnames'
import { FormattedMessage } from 'react-intl'
import styles from './library-peripheral-card.module.css'

interface PeripheralCardProps {
  /** The peripheral is in the project. */
  active: boolean
  description?: string
  iconURL?: string
  /** The selected board provides the peripheral, so it is always in the project. */
  locked: boolean
  name: string
  onToggle: () => void
}

/**
 * A peripheral's card in the peripheral library. Clicking it adds or removes the peripheral, unless it is locked.
 * @param props - The peripheral's presentation and state, and what toggling it does.
 * @returns A button with the peripheral's picture, name and description, and whether clicking adds or removes it.
 */
const LibraryPeripheralCard = (props: PeripheralCardProps) => {
  const { active, description, iconURL, locked, name, onToggle } = props

  let action
  if (locked) {
    action = (
      <FormattedMessage
        defaultMessage="Included"
        description="Label on a peripheral the selected device always provides"
        id="gui.peripheralCard.included"
      />
    )
  } else if (active) {
    action = (
      <FormattedMessage
        defaultMessage="Remove"
        description="Action to remove a user-added peripheral from the project"
        id="gui.peripheralCard.remove"
      />
    )
  } else {
    action = (
      <FormattedMessage
        defaultMessage="Add"
        description="Action to add a peripheral to the project"
        id="gui.peripheralCard.add"
      />
    )
  }

  return (
    <div className={classNames(styles.card, { [styles.active]: active, [styles.locked]: locked })}>
      <button className={styles.selectButton} type="button" disabled={locked} onClick={onToggle}>
        <div className={styles.imageContainer}>
          {iconURL && <img alt="" className={styles.image} draggable={false} src={iconURL} />}
        </div>
        <div className={styles.text}>
          <span className={styles.name}>{name}</span>
          {description && <span className={styles.description}>{description}</span>}
        </div>
        <div className={classNames(styles.action, { [styles.actionActive]: active })}>{action}</div>
      </button>
    </div>
  )
}

export default LibraryPeripheralCard
