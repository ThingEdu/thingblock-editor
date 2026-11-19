import { useState } from 'react'
import { defineMessages, FormattedMessage } from 'react-intl'
import Box from '../box/box'
import Modal from '../modal/modal'
import styles from './modal-prompt.module.css'

const messages = defineMessages({
  variableTypeLabel: {
    defaultMessage: 'Variable type:',
    description: 'Label for the control that selects the value type of a new variable',
    id: 'gui.gui.variableTypeLabel',
  },
  typeNumberMessage: {
    defaultMessage: 'Number',
    description: 'Option for creating a whole-number (integer) variable',
    id: 'gui.gui.variableTypeNumber',
  },
  typeDecimalMessage: {
    defaultMessage: 'Decimal',
    description: 'Option for creating a decimal (floating-point) variable',
    id: 'gui.gui.variableTypeDecimal',
  },
  typeTextMessage: {
    defaultMessage: 'Text',
    description: 'Option for creating a text (string) variable',
    id: 'gui.gui.variableTypeText',
  },
})

/** A new variable's value type; the generated code declares it with this type. */
export type VariableDataType = 'int' | 'float' | 'string'

const TYPE_OPTIONS: { value: VariableDataType; message: (typeof messages)[keyof typeof messages] }[] = [
  { value: 'int', message: messages.typeNumberMessage },
  { value: 'float', message: messages.typeDecimalMessage },
  { value: 'string', message: messages.typeTextMessage },
]

/** What the prompt adds to the name: the variable's scope and, when the type chooser shows, its type. */
export interface VariableOptions {
  scope: 'global'
  dataType: VariableDataType | ''
}

interface ModalPromptProps {
  defaultValue?: string
  label: string
  /** Whether to show the value type chooser, for a new scalar variable. */
  showTypeOption: boolean
  title: string
  onCancel: () => void
  onOk: (input: string, options: VariableOptions) => void
}

/**
 * The modal Blockly asks for a name in, such as a new or renamed variable, list or broadcast.
 * @param props - The prompt's text, whether to show the type chooser, and what OK and Cancel do.
 * @returns The modal, with the name field and, for a new variable, the type chooser.
 */
const ModalPrompt = (props: ModalPromptProps) => {
  const { defaultValue, label, showTypeOption, title, onCancel, onOk } = props
  const [inputValue, setInputValue] = useState('')
  const [selectedType, setSelectedType] = useState<VariableDataType>('int')

  const handleOk = () => {
    onOk(inputValue, {
      // There is a single implicit device target, so every variable is global.
      scope: 'global',
      dataType: showTypeOption ? selectedType : '',
    })
  }

  return (
    <Modal className={styles.modalContent} contentLabel={title} id="promptModal" onRequestClose={onCancel}>
      <Box className={styles.body}>
        <Box className={styles.label}>{label}</Box>
        <Box>
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the prompt opens to ask for this name
            autoFocus
            className={styles.variableNameTextInput}
            defaultValue={defaultValue}
            name={label}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              // Enter also ends an input method's composition (Vietnamese Telex), which should not submit
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleOk()
            }}
          />
        </Box>
        {showTypeOption ? (
          <Box className={styles.optionsRow}>
            <div className={styles.label}>
              <FormattedMessage {...messages.variableTypeLabel} />
            </div>
            {TYPE_OPTIONS.map((option) => (
              <label key={option.value}>
                <input
                  checked={selectedType === option.value}
                  name="variableTypeOption"
                  type="radio"
                  value={option.value}
                  onChange={() => setSelectedType(option.value)}
                />
                <FormattedMessage {...option.message} />
              </label>
            ))}
          </Box>
        ) : null}
        <Box className={styles.buttonRow}>
          <button onClick={onCancel}>
            <FormattedMessage
              defaultMessage="Cancel"
              description="Button in prompt for cancelling the dialog"
              id="gui.prompt.cancel"
            />
          </button>
          <button className={styles.okButton} onClick={handleOk}>
            <FormattedMessage
              defaultMessage="OK"
              description="Button in prompt for confirming the dialog"
              id="gui.prompt.ok"
            />
          </button>
        </Box>
      </Box>
    </Modal>
  )
}

export default ModalPrompt
