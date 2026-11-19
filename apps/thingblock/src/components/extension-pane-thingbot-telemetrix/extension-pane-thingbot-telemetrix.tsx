import classNames from 'classnames'
import { useEffect, useState } from 'react'
import { defineMessages, FormattedMessage } from 'react-intl'
import { useAppDispatch } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import { setConnectionModalExtensionId } from '../../reducers/connection-modal'
import { openConnectionModal } from '../../reducers/modals'
import ExtensionPane from '../extension-pane/extension-pane'
import styles from './extension-pane-thingbot-telemetrix.module.css'

const EXTENSION_ID = 'thingbotTelemetrix'

const messages = defineMessages({
  connected: {
    defaultMessage: 'ThingBot connected',
    description: 'ThingBot pane status while the ThingBot is connected',
    id: 'gui.thingbotTelemetrixPane.connected',
  },
  notConnected: {
    defaultMessage: 'ThingBot not connected',
    description: 'ThingBot pane status while no ThingBot is connected',
    id: 'gui.thingbotTelemetrixPane.notConnected',
  },
  connect: {
    defaultMessage: 'Connect',
    description: 'ThingBot pane button that opens the ThingBot connection dialog',
    id: 'gui.thingbotTelemetrixPane.connect',
  },
  disconnect: {
    defaultMessage: 'Disconnect',
    description: 'ThingBot pane button that disconnects the ThingBot',
    id: 'gui.thingbotTelemetrixPane.disconnect',
  },
})

/**
 * ThingBot Telemetrix's pane: whether the ThingBot is connected, with a button that opens the connection modal or
 * disconnects it.
 * @returns The status row.
 */
const ExtensionPaneThingbotTelemetrix = () => {
  const vm = useVm()
  const dispatch = useAppDispatch()
  const [connected, setConnected] = useState(() => vm.getPeripheralIsConnected(EXTENSION_ID))

  // The peripheral events don't say which extension they are about, so each asks the VM about this one
  useEffect(() => {
    const update = () => {
      setConnected(vm.getPeripheralIsConnected(EXTENSION_ID))
    }
    vm.events.on('PERIPHERAL_CONNECTED', update)
    vm.events.on('PERIPHERAL_DISCONNECTED', update)
    vm.events.on('PERIPHERAL_REQUEST_ERROR', update)
    return () => {
      vm.events.off('PERIPHERAL_CONNECTED', update)
      vm.events.off('PERIPHERAL_DISCONNECTED', update)
      vm.events.off('PERIPHERAL_REQUEST_ERROR', update)
    }
  }, [vm])

  const handleClick = () => {
    if (connected) {
      vm.disconnectPeripheral(EXTENSION_ID)
      return
    }
    dispatch(setConnectionModalExtensionId(EXTENSION_ID))
    dispatch(openConnectionModal())
  }

  return (
    <ExtensionPane>
      <div className={styles.row}>
        <span className={classNames(styles.status, { [styles.connected]: connected })}>
          <FormattedMessage {...(connected ? messages.connected : messages.notConnected)} />
        </span>
        <button className={styles.button} type="button" onClick={handleClick}>
          <FormattedMessage {...(connected ? messages.disconnect : messages.connect)} />
        </button>
      </div>
    </ExtensionPane>
  )
}

export default ExtensionPaneThingbotTelemetrix
