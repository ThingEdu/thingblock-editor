import { useAppDispatch, useAppSelector } from '../../app/store'
import { closeAlert } from '../../reducers/alerts'
import Box from '../box/box'
import AlertsItem from './alerts-item'
import styles from './alerts.module.css'

/**
 * The editor's alerts, newest last.
 * @param props React props.
 * @param props.className - Where the alerts sit in the editor.
 * @returns Each alert in the store, newest last.
 */
const Alerts = ({ className }: { className?: string }) => {
  const alertsList = useAppSelector((state) => state.scratchGui.alerts.alertsList)
  const dispatch = useAppDispatch()

  return (
    <Box className={className}>
      <Box className={styles.alertsInnerContainer}>
        {alertsList.map((a, index) => (
          <AlertsItem
            closeButton={a.closeButton}
            content={a.content}
            iconSpinner={a.iconSpinner}
            iconURL={a.iconURL}
            key={index}
            level={a.level}
            onCloseAlert={() => dispatch(closeAlert(index))}
          />
        ))}
      </Box>
    </Box>
  )
}

export default Alerts
