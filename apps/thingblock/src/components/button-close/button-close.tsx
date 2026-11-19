import classNames from 'classnames'
import backIcon from '../../lib/assets/icon--back.svg'
import styles from './button-close.module.css'
import closeIconOrange from './icon--close-orange.svg'
import closeIcon from './icon--close.svg'

export type ButtonCloseColor = 'neutral' | 'green' | 'orange'

interface ButtonCloseProps {
  buttonType?: 'back' | 'close'
  className?: string
  color?: ButtonCloseColor
  onClick: () => void
  size?: 'small' | 'large'
}

/**
 * A round button that closes, or goes back from, what it sits in.
 * @param props - The button's type, size and color, and its click handler.
 * @returns A focusable `div` with the button role, showing a cross or a back arrow.
 */
const ButtonClose = (props: ButtonCloseProps) => {
  const { buttonType = 'close', className, color = 'neutral', onClick, size = 'large' } = props
  return (
    <div
      aria-label="Close"
      className={classNames(styles.closeButton, className, {
        [styles.small]: size === 'small',
        [styles.large]: size === 'large',
        [styles.orange]: color === 'orange',
      })}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
    >
      {buttonType === 'back' ? (
        <img alt="" className={styles.backIcon} src={backIcon} />
      ) : (
        <img
          alt=""
          className={classNames(styles.closeIcon, { [styles[color]]: color !== 'neutral' })}
          src={color === 'orange' ? closeIconOrange : closeIcon}
        />
      )}
    </div>
  )
}

export default ButtonClose
