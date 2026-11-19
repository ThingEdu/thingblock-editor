import classNames from 'classnames'
import type { InputHTMLAttributes } from 'react'
import styles from './input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** A narrow input with its text centered. */
  small?: boolean
}

/**
 * A rounded text input.
 * @param props - The input's attributes, plus its size.
 * @returns A text field styled for the editor.
 */
const Input = (props: InputProps) => {
  const { className, small = false, ...inputProps } = props
  return <input {...inputProps} className={classNames(styles.inputForm, className, { [styles.inputSmall]: small })} />
}

export default Input
