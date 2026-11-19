import classNames from 'classnames'
import { useCallback, useRef } from 'react'
import { defineMessage, FormattedMessage, useIntl } from 'react-intl'
import locales from 'scratch-l10n'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useMenuNavigation } from '../../hooks/use-menu-navigation'
import checkIcon from '../../lib/assets/icon--check.svg'
import dropdownCaret from '../../lib/assets/icon--dropdown-caret.svg'
import { savePreference } from '../../lib/preferences/user-preferences'
import { selectLocale } from '../../reducers/locales'
import stylesSettingsMenu from '../menu-settings/menu-settings.module.css'
import { MenuItem, MenuSubmenu } from '../menu/menu'
import languageIcon from './icon--language.svg'
import styles from './menu-language.module.css'

const SUPPORTED_LOCALES = ['en', 'vi']

const languageMenu = defineMessage({
  id: 'gui.aria.languageMenu',
  defaultMessage: 'Language menu',
  description: 'accessibility label for language menu',
})

/**
 * The Settings menu's language submenu. The choice is remembered on this machine.
 * @param props - React props.
 * @param props.depth - How deep the submenu is nested, for `useMenuNavigation`.
 * @returns The submenu's item, with the languages beside it while it is open.
 */
const MenuLanguage = ({ depth }: { depth: number }) => {
  const intl = useIntl()
  const dispatch = useAppDispatch()
  const currentLocale = useAppSelector((state) => state.locales.locale)
  const isRtl = useAppSelector((state) => state.locales.isRtl)
  const selectedRef = useRef<HTMLImageElement | null>(null)
  const { isExpanded, handleKeyDown, handleKeyDownOpenMenu, handleOnOpen, menuRef } =
    useMenuNavigation<HTMLLIElement>({ depth, defaultIndexOnOpen: SUPPORTED_LOCALES.indexOf(currentLocale) })

  const scrollSelectedIntoView = useCallback(() => {
    // The submenu also opens on hover and focus, so its selected language is scrolled into view then
    if (isExpanded() && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'center' })
    }
  }, [isExpanded])

  const handleChangeLanguage = (locale: string) => {
    savePreference('locale', locale)
    dispatch(selectLocale(locale))
  }

  return (
    <MenuItem
      ref={menuRef}
      isExpanded={isExpanded()}
      ariaLabel={intl.formatMessage(languageMenu)}
      onKeyDown={handleKeyDown}
      isDataMenuItemWrapper
    >
      <button
        className={stylesSettingsMenu.option}
        onClick={handleOnOpen}
        onFocus={scrollSelectedIntoView}
        onMouseOver={scrollSelectedIntoView}
        data-menu-item
      >
        <img alt="" className={stylesSettingsMenu.icon} src={languageIcon} />
        <span className={stylesSettingsMenu.submenuLabel}>
          <FormattedMessage defaultMessage="Language" description="Language sub-menu" id="gui.menuBar.language" />
        </span>
        <img alt="" className={stylesSettingsMenu.expandCaret} src={dropdownCaret} />
      </button>
      <MenuSubmenu className={styles.languageSubmenu} place={isRtl ? 'left' : 'right'}>
        {SUPPORTED_LOCALES.map((locale) => {
          const isSelected = currentLocale === locale
          return (
            <MenuItem
              key={locale}
              className={styles.languageMenuItem}
              onClick={() => handleChangeLanguage(locale)}
              isDataMenuItem
              onParentKeyDown={handleKeyDownOpenMenu}
              isSelected={isSelected}
            >
              <img
                alt=""
                className={classNames(stylesSettingsMenu.check, { [stylesSettingsMenu.selected]: isSelected })}
                src={checkIcon}
                ref={isSelected ? selectedRef : undefined}
              />
              {locales[locale].name}
            </MenuItem>
          )
        })}
      </MenuSubmenu>
    </MenuItem>
  )
}

export default MenuLanguage
