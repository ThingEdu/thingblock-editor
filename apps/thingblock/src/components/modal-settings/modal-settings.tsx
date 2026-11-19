import classNames from 'classnames'
import { defineMessages, FormattedMessage, useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import { CLOUD_MODE, LINK_MODE, type LinkMode } from '../../lib/settings/link-mode'
import { persistLinkMode } from '../../lib/settings/link-mode/persistence'
import { setLinkMode } from '../../reducers/settings'
import Modal from '../modal/modal'
import styles from './modal-settings.module.css'

const messages = defineMessages({
  title: {
    defaultMessage: 'Settings',
    description: 'Settings modal title and accessibility label',
    id: 'gui.settingsModal.title',
  },
  linkTab: {
    defaultMessage: 'Link',
    description: 'Sidebar label for the device-link settings section',
    id: 'gui.settingsModal.linkTab',
  },
  linkHeading: {
    defaultMessage: 'Connection mode',
    description: 'Heading for the device-link mode selector',
    id: 'gui.settingsModal.linkHeading',
  },
  linkDescription: {
    defaultMessage: 'Choose how the editor builds firmware and connects to your board.',
    description: 'Sub-heading explaining the device-link mode selector',
    id: 'gui.settingsModal.linkDescription',
  },
  linkClient: {
    defaultMessage: 'Link client',
    description: 'Label for the native-helper device-link option',
    id: 'gui.settingsModal.linkClient',
  },
  linkClientDescription: {
    defaultMessage: 'Build and flash through the local helper app on your computer.',
    description: 'Description of the native-helper device-link option',
    id: 'gui.settingsModal.linkClientDescription',
  },
  cloudClient: {
    defaultMessage: 'Cloud client',
    description: 'Label for the web/cloud device-link option',
    id: 'gui.settingsModal.cloudClient',
  },
  cloudClientDescription: {
    defaultMessage:
      'Not available yet — building and flashing from the browser over Web Serial is coming in a future update.',
    description: 'Description of the web/cloud device-link option, currently unavailable',
    id: 'gui.settingsModal.cloudClientDescription',
  },
  cloudClientBadge: {
    defaultMessage: 'Coming soon',
    description: 'Badge shown next to a device-link option that is not yet available',
    id: 'gui.settingsModal.cloudClientBadge',
  },
})

const options = [
  { mode: LINK_MODE, label: messages.linkClient, description: messages.linkClientDescription, disabled: false },
  { mode: CLOUD_MODE, label: messages.cloudClient, description: messages.cloudClientDescription, disabled: true },
] as const

interface ModalSettingsProps {
  onRequestClose: () => void
}

/**
 * The editor's settings: how it builds firmware and connects to the board.
 * @param props - What closing the modal does.
 * @returns The modal, with the link mode choice.
 */
const ModalSettings = (props: ModalSettingsProps) => {
  const { onRequestClose } = props
  const intl = useIntl()
  const vm = useVm()
  const dispatch = useAppDispatch()
  const linkMode = useAppSelector((state) => state.scratchGui.settings.linkMode)

  const handleSetLinkMode = (mode: LinkMode) => {
    dispatch(setLinkMode(mode))
    persistLinkMode(mode)
    vm.link.setLinkMode(mode)
    // Switching into link mode retries loading the resource packs, which fail to load while the helper is down
    void vm.devices.loadResourcePacks()
  }

  return (
    <Modal
      className={styles.modalContent}
      contentLabel={intl.formatMessage(messages.title)}
      id="settingsModal"
      onRequestClose={onRequestClose}
    >
      <div className={styles.body}>
        <div className={styles.sidebar}>
          <button className={classNames(styles.tab, styles.tabActive)} type="button">
            <FormattedMessage {...messages.linkTab} />
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.contentHeading}>
            <FormattedMessage {...messages.linkHeading} />
          </div>
          <div className={styles.contentDescription}>
            <FormattedMessage {...messages.linkDescription} />
          </div>
          <div className={styles.options}>
            {options.map((option) => (
              // eslint-disable-next-line jsx-a11y/label-has-associated-control -- the text is in FormattedMessages, deeper than the rule looks
              <label
                key={option.mode}
                className={classNames(styles.option, {
                  [styles.optionSelected]: linkMode === option.mode,
                  [styles.optionDisabled]: option.disabled,
                })}
              >
                <input
                  checked={linkMode === option.mode}
                  className={styles.optionRadio}
                  disabled={option.disabled}
                  name="linkMode"
                  type="radio"
                  value={option.mode}
                  onChange={() => {
                    handleSetLinkMode(option.mode)
                  }}
                />
                <span className={styles.optionText}>
                  <span className={styles.optionLabel}>
                    <FormattedMessage {...option.label} />
                    {option.disabled && (
                      <span className={styles.optionBadge}>
                        <FormattedMessage {...messages.cloudClientBadge} />
                      </span>
                    )}
                  </span>
                  <span className={styles.optionDescription}>
                    <FormattedMessage {...option.description} />
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ModalSettings
