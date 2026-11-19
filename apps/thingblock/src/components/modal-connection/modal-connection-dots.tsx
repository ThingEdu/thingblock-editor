import classNames from 'classnames'
import Box from '../box/box'
import styles from './modal-connection.module.css'

interface ModalConnectionDotsProps {
  className?: string
  /** The step in progress, counted from 0. */
  counter?: number
  error?: boolean
  success?: boolean
  total: number
}

/**
 * The connection's progress as a row of dots, one per step.
 * @param props - The number of steps, the one in progress, and whether the connection succeeded or failed.
 * @returns The row of dots, all green on success and all red on error.
 */
const ModalConnectionDots = (props: ModalConnectionDotsProps) => {
  const { className, counter, error, success, total } = props
  return (
    <Box className={classNames(className, styles.dotsRow)}>
      <div
        className={classNames(styles.dotsHolder, {
          [styles.dotsHolderError]: error,
          [styles.dotsHolderSuccess]: success,
        })}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={classNames(styles.dot, {
              [styles.errorDot]: error,
              [styles.successDot]: success && !error,
              [styles.activeStepDot]: !success && !error && counter === i,
              [styles.inactiveStepDot]: !success && !error && counter !== i,
            })}
          />
        ))}
      </div>
    </Box>
  )
}

export default ModalConnectionDots
