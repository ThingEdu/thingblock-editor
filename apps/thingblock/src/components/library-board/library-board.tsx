import { type ReactNode, useEffect, useReducer } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import { noBoardTile } from '../../lib/boards'
import { setDevice } from '../../reducers/board'
import { closeBoardLibrary } from '../../reducers/modals'
import Library from '../library/library'
import LibraryBoardCard, { type LibraryBoardCardProps } from './library-board-card'

const messages = defineMessages({
  deviceTitle: {
    defaultMessage: 'Choose a Device',
    description: 'Heading for the device selection library',
    id: 'gui.boardLibrary.chooseADevice',
  },
})

/** An entry of `vm.devices.getDeviceList()`, which the VM types only as `object`. */
interface DeviceListEntry extends Omit<LibraryBoardCardProps, 'name' | 'onSelect'> {
  deviceId: string
  name: string
}

interface BoardItem extends Omit<LibraryBoardCardProps, 'onSelect'> {
  /** The device to select; null for the "No board" tile. */
  deviceId: string | null
  key: string
  name: ReactNode
}

/**
 * The library of boards, shown while its modal is open; choosing one selects it, and "No board" leaves board mode.
 * @returns The library, or nothing while it is closed.
 */
const LibraryBoard = () => {
  const intl = useIntl()
  const vm = useVm()
  const dispatch = useAppDispatch()
  const visible = useAppSelector((state) => state.scratchGui.modals.boardLibrary)
  const [, refresh] = useReducer((count: number) => count + 1, 0)

  useEffect(() => {
    if (!visible) return
    // Resource packs from the link helper can land while the library is open, adding their boards
    vm.events.on('RESOURCE_PACKS_LOADED', refresh)
    return () => {
      vm.events.off('RESOURCE_PACKS_LOADED', refresh)
    }
  }, [vm, visible])

  if (!visible) return null

  const devices = vm.devices.getDeviceList() as DeviceListEntry[]
  const items: BoardItem[] = [
    { ...noBoardTile, key: 'noBoard' },
    ...devices.map((device) => ({ ...device, key: device.deviceId })),
  ]

  return (
    <Library
      id="boardLibrary"
      items={items}
      renderItem={(item, onSelect) => (
        <LibraryBoardCard
          description={item.description}
          help={item.help}
          iconURL={item.iconURL}
          learnMore={item.learnMore}
          manufacturer={item.manufacturer}
          name={item.name}
          requires={item.requires}
          onSelect={onSelect}
        />
      )}
      title={intl.formatMessage(messages.deviceTitle)}
      onItemSelected={(item) => dispatch(setDevice(item.deviceId))}
      onRequestClose={() => dispatch(closeBoardLibrary())}
    />
  )
}

export default LibraryBoard
