import classNames from 'classnames'
import React from 'react'
import styles from './button.module.css'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  iconClassName?: string
  iconSrc?: string
  componentRef?: React.Ref<HTMLButtonElement>
}

/**
 * Outlined button with an optional leading icon.
 * @param props - Standard button attributes plus the icon and ref options.
 * @returns The button element.
 */
export const Button = (props: ButtonProps) => {
  const { className, disabled, iconClassName, iconSrc, onClick, children, componentRef, ...rest } = props

  return (
    // `disabled` only blocks clicks; it is not forwarded, so the button keeps its normal look
    <button
      className={classNames(styles.outlinedButton, className)}
      onClick={disabled ? undefined : onClick}
      ref={componentRef}
      {...rest}
    >
      {iconSrc && <img alt="" className={classNames(iconClassName, styles.icon)} draggable={false} src={iconSrc} />}
      <div className={styles.content}>{children}</div>
    </button>
  )
}
