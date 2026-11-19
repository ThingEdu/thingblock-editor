import classNames from 'classnames'
import { defineMessage, FormattedMessage, useIntl } from 'react-intl'
import { useAppSelector } from '../../app/store'
import { useMenuNavigation } from '../../hooks/use-menu-navigation'
import { useVm } from '../../hooks/use-vm'
import dropdownCaret from '../../lib/assets/icon--dropdown-caret.svg'
import menuBarStyles from '../menu-bar/menu-bar.module.css'
import Menu, { MenuItem } from '../menu/menu'
import editIcon from './icon--edit.svg'

const editMenuAriaMessage = defineMessage({
  id: 'gui.aria.editMenu',
  defaultMessage: 'Edit menu',
  description: 'accessibility label for edit menu',
})

/**
 * The menu bar's Edit menu, which turns Turbo Mode on and off.
 * @returns The menu's button, with the menu while it is open.
 */
const MenuEdit = () => {
  const intl = useIntl()
  const vm = useVm()
  const isRtl = useAppSelector((state) => state.locales.isRtl)
  const turboMode = useAppSelector((state) => state.scratchGui.vmStatus.turbo)
  const { menuRef, isExpanded, handleKeyDown, handleKeyDownOpenMenu, handleOnOpen, handleOnClose } =
    useMenuNavigation<HTMLButtonElement>()

  return (
    <button
      className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable, {
        [menuBarStyles.active]: isExpanded(),
      })}
      onClick={handleOnOpen}
      aria-label={intl.formatMessage(editMenuAriaMessage)}
      aria-expanded={isExpanded()}
      onKeyDown={handleKeyDown}
      ref={menuRef}
    >
      <img alt="" src={editIcon} />
      <span className={menuBarStyles.collapsibleLabel}>
        <FormattedMessage defaultMessage="Edit" description="Text for edit dropdown menu" id="gui.menuBar.edit" />
      </span>
      <img alt="" src={dropdownCaret} />
      <div className={menuBarStyles.menuBarMenu}>
        <Menu open={isExpanded()} place={isRtl ? 'left' : 'right'} onRequestClose={handleOnClose}>
          <MenuItem
            onClick={() => vm.setTurboMode(!turboMode)}
            isDataMenuItem
            onParentKeyDown={handleKeyDownOpenMenu}
          >
            {turboMode ? (
              <FormattedMessage
                defaultMessage="Turn off Turbo Mode"
                description="Menu bar item for turning off turbo mode"
                id="gui.menuBar.turboModeOff"
              />
            ) : (
              <FormattedMessage
                defaultMessage="Turn on Turbo Mode"
                description="Menu bar item for turning on turbo mode"
                id="gui.menuBar.turboModeOn"
              />
            )}
          </MenuItem>
        </Menu>
      </div>
    </button>
  )
}

export default MenuEdit
