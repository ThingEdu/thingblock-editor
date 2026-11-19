import classNames from 'classnames'
import {
  Children,
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type KeyboardEventHandler,
  type ReactNode,
  useEffect,
  useRef,
} from 'react'
import styles from './menu.module.css'

type Place = 'left' | 'right'

interface MenuListProps {
  children?: ReactNode
  className?: string
  place?: Place
}

const MenuList = forwardRef<HTMLUListElement, MenuListProps>(({ children, className, place = 'right' }, ref) => (
  <ul
    className={classNames(styles.menu, className, {
      [styles.left]: place === 'left',
      [styles.right]: place === 'right',
    })}
    ref={ref}
  >
    {children}
  </ul>
))
MenuList.displayName = 'MenuList'

interface MenuProps extends MenuListProps {
  onRequestClose: () => void
  open: boolean
}

/**
 * A dropdown menu, shown while `open`, that asks to close on a click outside it.
 * @param props - The menu's items and placement, whether it is open, and how to close it.
 * @returns The menu, or nothing while it is closed.
 */
const Menu = (props: MenuProps) => {
  const { onRequestClose, open, ...listProps } = props
  const ref = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onRequestClose()
    }
    // The Blockly workspace suppresses compatibility events like `mouseup`
    document.addEventListener('pointerup', handleClick)
    return () => {
      document.removeEventListener('pointerup', handleClick)
    }
  }, [open, onRequestClose])

  if (!open) return null
  return <MenuList ref={ref} {...listProps} />
}

/**
 * A menu that opens beside the item it is in, on hover or while that item is expanded.
 * @param props - The submenu's items and the side it opens on.
 * @returns The submenu's frame, holding its menu.
 */
export const MenuSubmenu = (props: MenuListProps) => {
  const { children, className, place } = props
  return (
    <ul
      className={classNames(styles.submenu, className, {
        [styles.left]: place === 'left',
        [styles.right]: place === 'right',
      })}
    >
      <MenuList place={place}>{children}</MenuList>
    </ul>
  )
}

interface MenuItemProps extends HTMLAttributes<HTMLLIElement> {
  ariaLabel?: string
  ariaRole?: string
  isDataMenuItem?: boolean
  isDataMenuItemWrapper?: boolean
  isDisabled?: boolean
  isExpanded?: boolean
  isSelected?: boolean
  onParentKeyDown?: KeyboardEventHandler<HTMLLIElement>
}

/** A menu entry. `useMenuNavigation` moves between entries marked with `isDataMenuItem` or `isDataMenuItemWrapper`. */
export const MenuItem = forwardRef<HTMLLIElement, MenuItemProps>(
  (
    {
      ariaLabel,
      ariaRole,
      children,
      className,
      isDataMenuItem = false,
      isDataMenuItemWrapper = false,
      isDisabled = false,
      isExpanded = false,
      isSelected = false,
      onParentKeyDown,
      ...props
    },
    ref,
  ) => (
    // The caller gives the item its role, such as `menuitem`
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the role comes from `ariaRole`
    <li
      ref={ref}
      className={classNames(styles.menuItem, styles.hoverable, className, { [styles.expanded]: isExpanded })}
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-selected={isSelected}
      aria-disabled={isDisabled}
      role={ariaRole}
      onKeyDown={onParentKeyDown}
      data-menu-item={isDataMenuItem}
      data-menu-item-wrapper={isDataMenuItemWrapper}
      {...props}
    >
      {children}
    </li>
  ),
)
MenuItem.displayName = 'MenuItem'

/**
 * A group of menu items, set off from the items above it by a rule over its first item.
 * @param props React props.
 * @param props.children - The section's items.
 * @returns The items, the first marked as starting the section.
 */
export const MenuSection = ({ children }: { children: ReactNode }) =>
  Children.map(children, (child, index) =>
    isValidElement<{ className?: string }>(child)
      ? cloneElement(child, { className: classNames(child.props.className, { [styles.menuSection]: index === 0 }) })
      : child,
  )

export default Menu
