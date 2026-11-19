import { useEffect, useReducer } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import { closePeripheralLibrary } from '../../reducers/modals'
import Library from '../library/library'
import LibraryPeripheralCard from './library-peripheral-card'

const messages = defineMessages({
  peripheralTitle: {
    defaultMessage: 'Choose a Peripheral',
    description: 'Heading for the peripheral selection library',
    id: 'gui.peripheralLibrary.choosePeripheral',
  },
})

/**
 * The library of the selected board's peripherals, shown while its modal is open. Clicking a peripheral adds it to
 * the project or removes it, and the library stays open.
 * @returns The library, or nothing while it is closed.
 */
const LibraryPeripheral = () => {
  const intl = useIntl()
  const vm = useVm()
  const dispatch = useAppDispatch()
  const visible = useAppSelector((state) => state.scratchGui.modals.peripheralLibrary)
  const [, refresh] = useReducer((count: number) => count + 1, 0)

  useEffect(() => {
    if (!visible) return
    // The list and each card's state come from the VM: packs can land, and a peripheral can be added or removed here
    // or by a project that loads
    vm.events.on('RESOURCE_PACKS_LOADED', refresh)
    vm.events.on('PERIPHERALS_CHANGED', refresh)
    return () => {
      vm.events.off('RESOURCE_PACKS_LOADED', refresh)
      vm.events.off('PERIPHERALS_CHANGED', refresh)
    }
  }, [vm, visible])

  if (!visible) return null

  const items = vm.devices.getPeripheralList().map((peripheral) => ({ ...peripheral, key: peripheral.id }))

  return (
    <Library
      id="peripheralLibrary"
      items={items}
      renderItem={(item) => (
        <LibraryPeripheralCard
          active={item.active}
          description={item.description}
          iconURL={item.iconURL}
          locked={item.locked}
          name={item.name}
          onToggle={() => {
            if (item.active) vm.devices.removePeripheral(item.id)
            else void vm.devices.addPeripheral(item.id)
          }}
        />
      )}
      title={intl.formatMessage(messages.peripheralTitle)}
      onRequestClose={() => dispatch(closePeripheralLibrary())}
    />
  )
}

export default LibraryPeripheral
