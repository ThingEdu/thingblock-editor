import { defineMessages, useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useModalFocus } from '../../contexts/modal-focus-context'
import { openExtensionLibrary, openPeripheralLibrary } from '../../reducers/modals'
import Box from '../box/box'
import styles from './button-extension.module.css'
import addExtensionIcon from './icon--extensions.svg'

const messages = defineMessages({
  addExtension: {
    id: 'gui.gui.addExtension',
    description: 'Button to add an extension in the target pane',
    defaultMessage: 'Add Extension',
  },
  addPeripheral: {
    id: 'gui.gui.addPeripheral',
    description: 'Button to add a hardware peripheral when a board is selected',
    defaultMessage: 'Add Peripheral',
  },
})

/**
 * The button under the block palette that opens the extension library, or the peripheral library with a board
 * selected.
 * @returns The button, labeled for the library it opens.
 */
const ButtonExtension = () => {
  const intl = useIntl()
  const dispatch = useAppDispatch()
  const boardMode = useAppSelector((state) => state.scratchGui.board.selectedDeviceId !== null)
  const { captureFocus } = useModalFocus()
  const label = intl.formatMessage(boardMode ? messages.addPeripheral : messages.addExtension)

  const handleClick = () => {
    captureFocus()
    dispatch(boardMode ? openPeripheralLibrary() : openExtensionLibrary())
  }

  return (
    <Box className={styles.extensionButtonContainer}>
      <button className={styles.extensionButton} title={label} type="button" onClick={handleClick} aria-label={label}>
        <img alt="" className={styles.extensionButtonIcon} draggable={false} src={addExtensionIcon} />
      </button>
    </Box>
  )
}

export default ButtonExtension
