import classNames from 'classnames'
import { defineMessages, FormattedMessage, useIntl } from 'react-intl'
import { useAppDispatch } from '../../app/store'
import debugIcon from '../../lib/assets/icon--debug.svg'
import { openDebugModal } from '../../reducers/modals'
import Box from '../box/box'
import Divider from '../divider/divider'
import InputProjectTitle from '../input-project-title/input-project-title'
import MenuBoard from '../menu-board/menu-board'
import MenuEdit from '../menu-edit/menu-edit'
import MenuFile from '../menu-file/menu-file'
import MenuSettings from '../menu-settings/menu-settings'
import MenuBarLogo from './menu-bar-logo'
import styles from './menu-bar.module.css'

const ariaMessages = defineMessages({
  menuBar: {
    id: 'gui.aria.menuBar',
    defaultMessage: 'Menu topbar',
    description: 'accessibility label for the top menu bar',
  },
  debug: {
    id: 'gui.menuBar.debug',
    defaultMessage: 'Debug',
    description: 'accessibility text for the debug button',
  },
  home: {
    id: 'gui.menuBar.home',
    defaultMessage: 'Home',
    description: 'accessibility text for the home button',
  },
})

const HOME_URL = 'https://github.com/ThingEdu'

/**
 * The editor's top bar: the logo, the File, Edit and board menus, the project title, the debug tips and, at the far
 * end, the Settings menu.
 * @param props - React props.
 * @param props.className - An extra class, to place the bar.
 * @returns The bar, as the page's header.
 */
const MenuBar = ({ className }: { className?: string }) => {
  const intl = useIntl()
  const dispatch = useAppDispatch()

  return (
    <Box
      className={classNames(className, styles.menuBar)}
      aria-label={intl.formatMessage(ariaMessages.menuBar)}
      element="header"
    >
      <div className={styles.mainMenu}>
        <div className={styles.fileGroup}>
          <button
            aria-label={intl.formatMessage(ariaMessages.home)}
            className={styles.menuBarItem}
            onClick={() => window.open(HOME_URL, '_blank')}
          >
            <MenuBarLogo className={styles.logo} />
          </button>
          <MenuFile />
          <MenuEdit />
          <MenuBoard />
        </div>
        <div className={classNames(styles.menuBarItem, styles.growable)}>
          <InputProjectTitle className={styles.titleFieldGrowable} />
        </div>
        <Divider className={styles.divider} />
        <div className={styles.fileGroup}>
          <button
            aria-label={intl.formatMessage(ariaMessages.debug)}
            className={classNames(styles.menuBarItem, styles.noOffset, styles.hoverable)}
            onClick={() => dispatch(openDebugModal())}
          >
            <img alt="" className={styles.helpIcon} src={debugIcon} />
            <span className={styles.debugLabel}>
              <FormattedMessage {...ariaMessages.debug} />
            </span>
          </button>
        </div>
      </div>
      <div className={styles.settingsGroup}>
        <MenuSettings />
      </div>
    </Box>
  )
}

export default MenuBar
