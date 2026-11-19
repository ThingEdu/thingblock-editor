import classNames from 'classnames'
import { defineMessage, useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import { openBoardLibrary } from '../../reducers/modals'
import menuBarStyles from '../menu-bar/menu-bar.module.css'
import styles from './menu-board.module.css'

const boardMenuMessage = defineMessage({
  id: 'gui.menuBar.board',
  defaultMessage: 'Board: {boardName}',
  description: 'Board selection menu item in the menu bar',
})

const selectBoardMessage = defineMessage({
  id: 'gui.menuBar.selectBoard',
  defaultMessage: 'Select board',
  description: 'Board menu button label when no board has been selected',
})

/** An entry of `vm.devices.getDeviceList()`, which the VM types only as `object`. */
interface DeviceListEntry {
  deviceId: string
  name: string
}

/**
 * The menu bar's board button, naming the selected board; it opens the board library.
 * @returns The button.
 */
const MenuBoard = () => {
  const intl = useIntl()
  const vm = useVm()
  const dispatch = useAppDispatch()
  const selectedDeviceId = useAppSelector((state) => state.scratchGui.board.selectedDeviceId)

  // A project can be on a board the picker hides, so the hidden boards are searched too
  const selectedDevice = selectedDeviceId
    ? (vm.devices.getDeviceList({ includeHidden: true }) as DeviceListEntry[]).find(
        (device) => device.deviceId === selectedDeviceId,
      )
    : undefined
  const label = selectedDevice
    ? intl.formatMessage(boardMenuMessage, { boardName: selectedDevice.name })
    : intl.formatMessage(selectBoardMessage)

  return (
    <div className={styles.container}>
      <button
        className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable)}
        aria-label={label}
        onClick={() => dispatch(openBoardLibrary())}
      >
        <span className={styles.label}>{label}</span>
      </button>
    </div>
  )
}

export default MenuBoard
