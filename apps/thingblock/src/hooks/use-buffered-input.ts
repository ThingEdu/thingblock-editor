import { type ChangeEvent, type KeyboardEvent, useState } from 'react'

/**
 * Keeps a text input's edits to itself until the input loses focus or Enter is pressed, then submits them.
 * @param value - The value the input shows while it is not being edited.
 * @param onSubmit - Called with the edited value.
 * @returns The input's `value` and its handlers, to spread onto it.
 */
export const useBufferedInput = (value: string, onSubmit: (value: string) => void) => {
  const [edited, setEdited] = useState<string | null>(null)

  return {
    value: edited ?? value,
    onBlur: () => {
      if (edited !== null) onSubmit(edited)
      setEdited(null)
    },
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setEdited(e.target.value)
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      // Leaving the input submits it, through `onBlur`
      if (e.key === 'Enter') e.currentTarget.blur()
    },
  }
}
