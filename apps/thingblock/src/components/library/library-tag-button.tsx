import classNames from 'classnames'
import Button from '../button/button'
import styles from './library-tag-button.module.css'

interface TagButtonProps {
  active?: boolean
  className?: string
  label: string
  onClick: (tag: string) => void
  tag: string
}

/**
 * A rounded button that filters a library by a tag.
 * @param props - The tag, its label, whether it is the selected one, and its click handler.
 * @returns The button, highlighted while `active`.
 */
const LibraryTagButton = (props: TagButtonProps) => {
  const { active = false, className, label, onClick, tag } = props
  return (
    <Button
      className={classNames(styles.tagButton, className, { [styles.active]: active })}
      onClick={() => {
        onClick(tag)
      }}
    >
      {label}
    </Button>
  )
}

export default LibraryTagButton
