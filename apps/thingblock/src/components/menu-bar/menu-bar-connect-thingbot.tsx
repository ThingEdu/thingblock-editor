import classNames from 'classnames'
import { useEffect } from 'react'
import { FormattedMessage } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import { setConnectionModalExtensionId } from '../../reducers/connection-modal'
import { openConnectionModal } from '../../reducers/modals'
import { thingbotConnectSuccess, thingbotDisconnect } from '../../reducers/thingbot-telemetrix'
import styles from './menu-bar-connect-thingbot.module.css'

const THINGBOT_EXTENSION_ID = 'thingbotTelemetrix'

/**
 * The menu bar's button for connecting the ThingBot, shown while its extension is in the project. It follows the
 * VM's peripheral connections, and opens the connection modal.
 * @param props - React props.
 * @param props.className - The menu bar's item classes.
 * @returns The button, or nothing without the extension.
 */
const MenuBarConnectThingbot = ({ className }: { className?: string }) => {
  const vm = useVm()
  const dispatch = useAppDispatch()
  const loaded = useAppSelector((state) => state.scratchGui.loadedExtensions.includes(THINGBOT_EXTENSION_ID))
  const { connected, connecting } = useAppSelector((state) => state.scratchGui.thingbotTelemetrix)

  useEffect(() => {
    const handleConnected = () => dispatch(thingbotConnectSuccess())
    const handleDisconnected = () => dispatch(thingbotDisconnect())
    vm.events.on('PERIPHERAL_CONNECTED', handleConnected)
    vm.events.on('PERIPHERAL_DISCONNECTED', handleDisconnected)
    vm.events.on('PERIPHERAL_REQUEST_ERROR', handleDisconnected)
    return () => {
      vm.events.off('PERIPHERAL_CONNECTED', handleConnected)
      vm.events.off('PERIPHERAL_DISCONNECTED', handleDisconnected)
      vm.events.off('PERIPHERAL_REQUEST_ERROR', handleDisconnected)
    }
  }, [vm, dispatch])

  if (!loaded) return null

  const handleClick = () => {
    dispatch(setConnectionModalExtensionId(THINGBOT_EXTENSION_ID))
    dispatch(openConnectionModal())
  }

  return (
    <button
      className={classNames(className, {
        [styles.connecting]: connecting,
        [styles.connected]: connected,
      })}
      onClick={handleClick}
    >
      {(connected || connecting) && <span className={styles.indicator} />}
      {connected ? (
        <FormattedMessage
          defaultMessage="ThingBot · Connected"
          description="Menu bar button label when the ThingBot is connected"
          id="gui.menuBar.thingbotConnected"
        />
      ) : connecting ? (
        <FormattedMessage
          defaultMessage="ThingBot · Connecting…"
          description="Menu bar button label while connecting to the ThingBot"
          id="gui.menuBar.thingbotConnecting"
        />
      ) : (
        <FormattedMessage
          defaultMessage="Connect ThingBot"
          description="Menu bar button that opens the ThingBot connection dialog"
          id="gui.menuBar.connectThingbot"
        />
      )}
    </button>
  )
}

export default MenuBarConnectThingbot
