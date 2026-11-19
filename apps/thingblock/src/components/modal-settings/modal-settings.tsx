import classNames from 'classnames'
import { type ReactNode, useState } from 'react'
import { defineMessages, FormattedMessage, useIntl } from 'react-intl'
import locales from 'scratch-l10n'
import { version } from '../../../../../package.json'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import { savePreference } from '../../lib/preferences/user-preferences'
import { type ColorMode, offeredColorModes } from '../../lib/settings/color-mode'
import { persistColorMode } from '../../lib/settings/color-mode/persistence'
import { CLOUD_MODE, LINK_MODE, type LinkMode } from '../../lib/settings/link-mode'
import { persistLinkMode } from '../../lib/settings/link-mode/persistence'
import { type Theme, themeMap } from '../../lib/settings/theme'
import { persistTheme } from '../../lib/settings/theme/persistence'
import { selectLocale } from '../../reducers/locales'
import { setColorMode, setLinkMode, setTheme } from '../../reducers/settings'
import { SUPPORTED_LOCALES } from '../menu-language/menu-language'
import Modal from '../modal/modal'
import styles from './modal-settings.module.css'

const messages = defineMessages({
  title: {
    defaultMessage: 'Settings',
    description: 'Settings modal title and accessibility label',
    id: 'gui.settingsModal.title',
  },
  preferencesTab: {
    defaultMessage: 'Preferences',
    description: 'Sidebar label for the language and appearance settings section',
    id: 'gui.settingsModal.preferencesTab',
  },
  preferencesDescription: {
    defaultMessage: 'The editor’s language and look, remembered on this computer.',
    description: 'Sub-heading explaining the preferences section',
    id: 'gui.settingsModal.preferencesDescription',
  },
  language: {
    defaultMessage: 'Language',
    description: 'Language sub-menu',
    id: 'gui.menuBar.language',
  },
  theme: {
    defaultMessage: 'Theme',
    description: 'Theme sub-menu',
    id: 'gui.menuBar.theme',
  },
  colorMode: {
    defaultMessage: 'Color Mode',
    description: 'Color mode sub-menu',
    id: 'gui.menuBar.colorMode',
  },
  aboutTab: {
    defaultMessage: 'About',
    description: 'Sidebar label for the section about ThingBlock',
    id: 'gui.settingsModal.aboutTab',
  },
  version: {
    defaultMessage: 'Version {version}',
    description: 'The editor version in the About section',
    id: 'gui.settingsModal.version',
  },
  github: {
    defaultMessage: 'ThingEdu on GitHub',
    description: 'Link in the About section to ThingEdu’s GitHub page',
    id: 'gui.settingsModal.github',
  },
  license: {
    defaultMessage:
      'ThingBlock is free software, licensed under the GNU Affero General Public License v3.0. {source}',
    description: 'License notice in the About section; {source} is a link to the source code',
    id: 'gui.settingsModal.license',
  },
  source: {
    defaultMessage: 'Source code',
    description: 'Link to the editor’s source code in the About section',
    id: 'gui.settingsModal.source',
  },
  scratchCredit: {
    defaultMessage:
      'ThingBlock is built on Scratch. Scratch is a project of the Scratch Foundation, in collaboration with the Lifelong Kindergarten Group at the MIT Media Lab. It is available for free at {link}.',
    description: 'Credit to Scratch in the About section; {link} is a link to scratch.mit.edu',
    id: 'gui.settingsModal.scratchCredit',
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

const GITHUB_URL = 'https://github.com/ThingEdu'
const SOURCE_URL = 'https://github.com/ThingEdu/thingblock-editor'
const SCRATCH_URL = 'https://scratch.mit.edu'

const tabs = [
  { id: 'preferences', label: messages.preferencesTab },
  { id: 'link', label: messages.linkTab },
  { id: 'about', label: messages.aboutTab },
] as const

/**
 * A link that opens in a new tab.
 * @param props - React props.
 * @param props.children - What the link shows.
 * @param props.href - Where it goes.
 * @returns An `a` opening in a new tab.
 */
const ExternalLink = ({ children, href }: { children: ReactNode; href: string }) => (
  <a className={styles.link} href={href} rel="noreferrer" target="_blank">
    {children}
  </a>
)

interface ModalSettingsProps {
  onRequestClose: () => void
}

/**
 * The editor's settings, in tabs: its language and look, how it builds firmware and connects to the board, and about
 * ThingBlock.
 * @param props - What closing the modal does.
 * @returns The modal, with its tabs.
 */
const ModalSettings = (props: ModalSettingsProps) => {
  const { onRequestClose } = props
  const intl = useIntl()
  const vm = useVm()
  const dispatch = useAppDispatch()
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('preferences')
  const linkMode = useAppSelector((state) => state.scratchGui.settings.linkMode)
  const currentLocale = useAppSelector((state) => state.locales.locale)
  const theme = useAppSelector((state) => state.scratchGui.settings.theme)
  const colorMode = useAppSelector((state) => state.scratchGui.settings.colorMode)

  const handleSetLinkMode = (mode: LinkMode) => {
    dispatch(setLinkMode(mode))
    persistLinkMode(mode)
    vm.link.setLinkMode(mode)
    // Switching into link mode retries loading the resource packs, which fail to load while the helper is down
    void vm.devices.loadResourcePacks()
  }

  const preferences = [
    {
      id: 'language',
      label: messages.language,
      value: currentLocale,
      choices: SUPPORTED_LOCALES.map((locale) => ({ value: locale, label: locales[locale].name })),
      onChange: (locale: string) => {
        savePreference('locale', locale)
        dispatch(selectLocale(locale))
      },
    },
    {
      id: 'theme',
      label: messages.theme,
      value: theme,
      choices: Object.entries(themeMap).map(([value, item]) => ({ value, label: intl.formatMessage(item.label) })),
      onChange: (value: string) => {
        dispatch(setTheme(value as Theme))
        persistTheme(value as Theme)
      },
    },
    {
      id: 'colorMode',
      label: messages.colorMode,
      value: colorMode,
      choices: Object.entries(offeredColorModes).map(([value, item]) => ({
        value,
        label: intl.formatMessage(item.label),
      })),
      onChange: (value: string) => {
        dispatch(setColorMode(value as ColorMode))
        persistColorMode(value as ColorMode)
      },
    },
  ]

  return (
    <Modal
      className={styles.modalContent}
      contentLabel={intl.formatMessage(messages.title)}
      id="settingsModal"
      onRequestClose={onRequestClose}
    >
      <div className={styles.body}>
        <div className={styles.sidebar}>
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              aria-pressed={tab === id}
              className={classNames(styles.tab, { [styles.tabActive]: tab === id })}
              type="button"
              onClick={() => {
                setTab(id)
              }}
            >
              <FormattedMessage {...label} />
            </button>
          ))}
        </div>
        {tab === 'preferences' && (
          <div className={styles.content}>
            <div className={styles.contentHeading}>
              <FormattedMessage {...messages.preferencesTab} />
            </div>
            <div className={styles.contentDescription}>
              <FormattedMessage {...messages.preferencesDescription} />
            </div>
            <div className={styles.options}>
              {preferences.map((preference) => (
                <label key={preference.id} className={styles.preference}>
                  <span className={styles.optionLabel}>
                    <FormattedMessage {...preference.label} />
                  </span>
                  <select
                    className={styles.select}
                    value={preference.value}
                    onChange={(e) => {
                      preference.onChange(e.target.value)
                    }}
                  >
                    {preference.choices.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
        )}
        {tab === 'link' && (
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
        )}
        {tab === 'about' && (
          <div className={styles.content}>
            <div className={styles.contentHeading}>ThingBlock</div>
            <div className={styles.contentDescription}>
              <FormattedMessage {...messages.version} values={{ version }} />
            </div>
            <div className={styles.about}>
              <p>
                <ExternalLink href={GITHUB_URL}>
                  <FormattedMessage {...messages.github} />
                </ExternalLink>
              </p>
              <p>
                <FormattedMessage
                  {...messages.license}
                  values={{
                    source: (
                      <ExternalLink href={SOURCE_URL}>
                        <FormattedMessage {...messages.source} />
                      </ExternalLink>
                    ),
                  }}
                />
              </p>
              <p>
                <FormattedMessage
                  {...messages.scratchCredit}
                  values={{ link: <ExternalLink href={SCRATCH_URL}>scratch.mit.edu</ExternalLink> }}
                />
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ModalSettings
