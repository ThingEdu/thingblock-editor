import classNames from 'classnames'
import type { ButtonHTMLAttributes, Ref } from 'react'
import styles from './button.module.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  componentRef?: Ref<HTMLButtonElement>
  iconClassName?: string
  iconSrc?: string
}

/**
 * An outlined button with an optional leading icon.
 * @param props - The button's attributes, plus its icon and ref.
 * @returns A `button` holding the icon and the children.
 */
const Button = (props: ButtonProps) => {
  const { children, className, componentRef, disabled, iconClassName, iconSrc, onClick, ...buttonProps } = props
  return (
    // `disabled` only blocks clicks; it is not passed on, so the button keeps its look
    <button
      className={classNames(styles.outlinedButton, className)}
      onClick={disabled ? undefined : onClick}
      ref={componentRef}
      {...buttonProps}
    >
      {iconSrc && <img alt="" className={classNames(iconClassName, styles.icon)} draggable={false} src={iconSrc} />}
      <div className={styles.content}>{children}</div>
    </button>
  )
}

export default Button
