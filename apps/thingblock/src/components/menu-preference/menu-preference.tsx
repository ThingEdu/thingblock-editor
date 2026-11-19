import classNames from 'classnames'
import { FormattedMessage, type MessageDescriptor } from 'react-intl'
import { useAppSelector } from '../../app/store'
import { useMenuNavigation } from '../../hooks/use-menu-navigation'
import checkIcon from '../../lib/assets/icon--check.svg'
import dropdownCaret from '../../lib/assets/icon--dropdown-caret.svg'
import styles from '../menu-settings/menu-settings.module.css'
import { MenuItem, MenuSubmenu } from '../menu/menu'

interface PreferenceItem {
  icon?: string
  label: MessageDescriptor
}

interface MenuPreferenceProps<K extends string> {
  /** The choices, by key. */
  itemsMap: Record<K, PreferenceItem>
  // The keys come from `itemsMap`, so a handler for a wider type fits
  onChange: (key: NoInfer<K>) => void
  /** The submenu's icon when the selected choice has none. */
  defaultMenuIconSrc?: string
  submenuLabel: MessageDescriptor
  selectedItemKey: string
  /** How deep the submenu is nested, for `useMenuNavigation`. */
  depth: number
}

/**
 * A submenu of choices for a setting, with a check on the selected one.
 * @param props - The choices, the selected one, what choosing does, and the submenu's label and icon.
 * @returns The submenu's item, with the choices beside it while it is open.
 */
const MenuPreference = <K extends string>(props: MenuPreferenceProps<K>) => {
  const { itemsMap, onChange, defaultMenuIconSrc, submenuLabel, selectedItemKey, depth } = props
  const isRtl = useAppSelector((state) => state.locales.isRtl)
  const { isExpanded, handleKeyDown, handleKeyDownOpenMenu, handleOnOpen, menuRef } =
    useMenuNavigation<HTMLLIElement>({ depth })
  const itemKeys = Object.keys(itemsMap) as K[]
  const selectedItem = itemKeys.includes(selectedItemKey as K) ? itemsMap[selectedItemKey as K] : undefined

  return (
    <MenuItem isExpanded={isExpanded()} isDataMenuItemWrapper ref={menuRef} onKeyDown={handleKeyDown}>
      <button className={styles.option} onClick={handleOnOpen} data-menu-item>
        <img alt="" src={selectedItem?.icon ?? defaultMenuIconSrc} style={{ width: 24 }} />
        <span className={styles.submenuLabel}>
          <FormattedMessage {...submenuLabel} />
        </span>
        <img alt="" className={styles.expandCaret} src={dropdownCaret} />
      </button>
      <MenuSubmenu place={isRtl ? 'left' : 'right'}>
        {itemKeys.map((itemKey) => {
          const isSelected = itemKey === selectedItemKey
          const item = itemsMap[itemKey]
          return (
            <MenuItem
              key={itemKey}
              onClick={() => onChange(itemKey)}
              onParentKeyDown={handleKeyDownOpenMenu}
              isSelected={isSelected}
              isDataMenuItem
            >
              <div className={styles.option}>
                <img alt="" className={classNames(styles.check, { [styles.selected]: isSelected })} src={checkIcon} />
                {item.icon && <img alt="" className={styles.icon} src={item.icon} />}
                <FormattedMessage {...item.label} />
              </div>
            </MenuItem>
          )
        })}
      </MenuSubmenu>
    </MenuItem>
  )
}

export default MenuPreference
