import classNames from 'classnames'
import type { ReactElement } from 'react'
import { type AlertLevel, AlertLevels } from '../../lib/alerts'
import Box from '../box/box'
import ButtonClose, { type ButtonCloseColor } from '../button-close/button-close'
import Spinner from '../spinner/spinner'
import styles from './alerts-item.module.css'

const closeButtonColors: Partial<Record<AlertLevel, ButtonCloseColor>> = {
  [AlertLevels.SUCCESS]: 'green',
  [AlertLevels.WARN]: 'orange',
}

interface AlertsItemProps {
  closeButton?: boolean
  content?: ReactElement
  iconSpinner?: boolean
  iconURL?: string
  level?: AlertLevel
  onCloseAlert: () => void
}

/**
 * One alert, colored by its level.
 * @param props - The alert's message, icon, level and close handler.
 * @returns The message, after a spinner or icon and before a close button when it has them.
 */
const AlertsItem = (props: AlertsItemProps) => {
  const { closeButton, content, iconSpinner = false, iconURL, level = AlertLevels.WARN, onCloseAlert } = props
  return (
    <Box className={classNames(styles.alert, styles[level])}>
      {(iconSpinner || iconURL) && (
        <div className={styles.iconSection}>
          {iconSpinner && <Spinner className={styles.alertSpinner} level={level} />}
          {iconURL && <img alt="" className={styles.alertIcon} src={iconURL} />}
        </div>
      )}
      <div className={styles.alertMessage}>{content}</div>
      <div className={styles.alertButtons}>
        {closeButton && (
          <Box className={styles.alertCloseButtonContainer}>
            <ButtonClose
              className={styles.alertCloseButton}
              color={closeButtonColors[level]}
              size="large"
              onClick={onCloseAlert}
            />
          </Box>
        )}
      </div>
    </Box>
  )
}

export default AlertsItem
