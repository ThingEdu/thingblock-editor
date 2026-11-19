import classNames from 'classnames'
import { defineMessage, defineMessages, FormattedMessage, useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useMenuNavigation } from '../../hooks/use-menu-navigation'
import dropdownCaret from '../../lib/assets/icon--dropdown-caret.svg'
import settingsIcon from '../../lib/assets/icon--settings.svg'
import { type ColorMode, colorModeMap, DEFAULT_MODE, HIGH_CONTRAST_MODE } from '../../lib/settings/color-mode'
import { persistColorMode } from '../../lib/settings/color-mode/persistence'
import { type Theme, themeMap } from '../../lib/settings/theme'
import { persistTheme } from '../../lib/settings/theme/persistence'
import { setColorMode, setTheme } from '../../reducers/settings'
import menuBarStyles from '../menu-bar/menu-bar.module.css'
import MenuLanguage from '../menu-language/menu-language'
import MenuPreference from '../menu-preference/menu-preference'
import Menu, { MenuSection } from '../menu/menu'
import themeIcon from './icon--theme.svg'
import styles from './menu-settings.module.css'

const settingsMenuAriaMessage = defineMessage({
  id: 'gui.aria.settingsMenu',
  defaultMessage: 'Settings menu',
  description: 'accessibility label for settings menu',
})

const submenuLabels = defineMessages({
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
})

// Dark mode is not offered yet
const colorModes = {
  [DEFAULT_MODE]: colorModeMap[DEFAULT_MODE],
  [HIGH_CONTRAST_MODE]: colorModeMap[HIGH_CONTRAST_MODE],
}

/**
 * The menu bar's Settings menu: the language, the block theme and the color mode, each remembered on this machine.
 * @returns The menu's button, with the menu while it is open.
 */
const MenuSettings = () => {
  const intl = useIntl()
  const dispatch = useAppDispatch()
  const isRtl = useAppSelector((state) => state.locales.isRtl)
  const colorMode = useAppSelector((state) => state.scratchGui.settings.colorMode)
  const theme = useAppSelector((state) => state.scratchGui.settings.theme)
  const { isExpanded, handleOnOpen, handleOnClose, handleKeyDown, menuRef } = useMenuNavigation<HTMLButtonElement>()

  const handleChangeColorMode = (newColorMode: ColorMode) => {
    dispatch(setColorMode(newColorMode))
    persistColorMode(newColorMode)
  }
  const handleChangeTheme = (newTheme: Theme) => {
    dispatch(setTheme(newTheme))
    persistTheme(newTheme)
  }

  return (
    <button
      className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable, {
        [menuBarStyles.active]: isExpanded(),
      })}
      aria-expanded={isExpanded()}
      aria-label={intl.formatMessage(settingsMenuAriaMessage)}
      onClick={handleOnOpen}
      onKeyDown={handleKeyDown}
      ref={menuRef}
    >
      <img alt="" src={settingsIcon} />
      <span className={styles.dropdownLabel}>
        <FormattedMessage defaultMessage="Settings" description="Settings menu" id="gui.menuBar.settings" />
      </span>
      <img alt="" src={dropdownCaret} />
      <div className={menuBarStyles.menuBarMenu}>
        <Menu open={isExpanded()} place={isRtl ? 'left' : 'right'} onRequestClose={handleOnClose}>
          <MenuSection>
            <MenuLanguage depth={2} />
            <MenuPreference
              itemsMap={themeMap}
              onChange={handleChangeTheme}
              defaultMenuIconSrc={themeIcon}
              submenuLabel={submenuLabels.theme}
              selectedItemKey={theme}
              depth={2}
            />
            <MenuPreference
              itemsMap={colorModes}
              onChange={handleChangeColorMode}
              submenuLabel={submenuLabels.colorMode}
              selectedItemKey={colorMode}
              depth={2}
            />
          </MenuSection>
        </Menu>
      </div>
    </button>
  )
}

export default MenuSettings
