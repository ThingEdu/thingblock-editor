import classNames from 'classnames'
import { defineMessages, useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useBufferedInput } from '../../hooks/use-buffered-input'
import { setProjectTitle } from '../../reducers/project-title'
import Input from '../input/input'
import styles from './input-project-title.module.css'

const messages = defineMessages({
  projectTitlePlaceholder: {
    id: 'gui.gui.projectTitlePlaceholder',
    description: 'Placeholder for project title when blank',
    defaultMessage: 'Project title here',
  },
})

/**
 * The project's title, editable; an edit reaches the store when the field loses focus or Enter is pressed.
 * @param props - React props.
 * @param props.className - An extra class, to size the field where it sits.
 * @returns The title field.
 */
const InputProjectTitle = ({ className }: { className?: string }) => {
  const intl = useIntl()
  const dispatch = useAppDispatch()
  const projectTitle = useAppSelector((state) => state.scratchGui.projectTitle)
  const bufferedInput = useBufferedInput(projectTitle, (title) => dispatch(setProjectTitle(title)))

  return (
    <Input
      {...bufferedInput}
      className={classNames(styles.titleField, className)}
      maxLength={100}
      placeholder={intl.formatMessage(messages.projectTitlePlaceholder)}
      tabIndex={0}
      type="text"
    />
  )
}

export default InputProjectTitle
