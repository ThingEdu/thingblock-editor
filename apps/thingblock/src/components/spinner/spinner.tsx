import classNames from 'classnames'
import type { AlertLevel } from '../../lib/alerts'
import styles from './spinner.module.css'

interface SpinnerProps {
  className?: string
  large?: boolean
  level?: AlertLevel | 'primary'
  small?: boolean
}

/**
 * A spinning ring, colored by its level.
 * @param props - The ring's size and level.
 * @returns An empty `div` drawn as the ring.
 */
const Spinner = (props: SpinnerProps) => {
  const { className, large = false, level = 'info', small = false } = props
  return (
    <div
      className={classNames(className, styles.spinner, styles[level], {
        [styles.small]: small,
        [styles.large]: large,
      })}
    />
  )
}

export default Spinner
