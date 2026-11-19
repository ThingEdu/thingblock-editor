import classNames from 'classnames'
import { useState } from 'react'
import { defineMessages, FormattedMessage, type MessageDescriptor, useIntl } from 'react-intl'
import { useAppSelector } from '../../app/store'
import checkIcon from '../../lib/assets/icon--check.svg'
import { usePaneCollapsed } from '../../lib/preferences/pane-collapse'
import Box from '../box/box'
import CodeView from '../code-view/code-view'
import DeviceControls from '../device-controls/device-controls'
import Menu, { MenuItem } from '../menu/menu'
import ModalPlatformInstall from '../modal-platform-install/modal-platform-install'
import MonitorViewBoard from '../monitor-view-board/monitor-view-board'
import MonitorViewHost from '../monitor-view-host/monitor-view-host'
import PlaygroundPanel from '../playground-panel/playground-panel'
import styles from './side-panel.module.css'

const messages = defineMessages({
  sidePanel: {
    defaultMessage: 'Device panel',
    description: 'accessibility label for the device panel',
    id: 'gui.aria.stageAndTarget',
  },
  showPanels: {
    defaultMessage: 'Show panels',
    description: 'Label of the side panel button that opens the list of panels to show or hide',
    id: 'gui.sidePanel.showPanels',
  },
  generatedCode: {
    defaultMessage: 'Generated Code',
    description: 'Side panel menu option that shows or hides the generated code panel',
    id: 'gui.sidePanel.generatedCode',
  },
  monitor: {
    defaultMessage: 'Monitor',
    description: 'Side panel menu option that shows or hides the monitor panel',
    id: 'gui.sidePanel.monitor',
  },
  noPanel: {
    defaultMessage: 'No panel shown. Use the panels button above to show one.',
    description: 'Shown in the side panel when every panel is hidden',
    id: 'gui.sidePanel.noPanel',
  },
})

const PlaceholderIcon = () => (
  <svg className={styles.panelIcon} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16">
    <rect height="12" rx="2" width="12" x="2" y="2" />
  </svg>
)

const PanelsIcon = ({ className = styles.panelIcon }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16">
    <rect height="12" rx="2" width="12" x="2" y="2" />
    <path d="M2 9h12" />
  </svg>
)

interface PanelOptionProps {
  label: MessageDescriptor
  shown: boolean
  onToggle: () => void
}

const PanelOption = (props: PanelOptionProps) => {
  const { label, onToggle, shown } = props
  return (
    <MenuItem ariaRole="menuitemcheckbox" isSelected={shown} onClick={onToggle}>
      <div className={styles.option}>
        <img alt="" className={classNames(styles.check, { [styles.checked]: shown })} src={checkIcon} />
        <FormattedMessage {...label} />
      </div>
    </MenuItem>
  )
}

interface SidePanelProps {
  /** The panel's width, in pixels. */
  width: number
}

/**
 * The editor's right-hand column: the device controls, the Camera AI playground while that extension is loaded, and
 * either the board's generated code and serial monitor, or the host monitor when no board is selected. Each pane can
 * be hidden from the panel's menu.
 * @param props - The panel's width.
 * @returns The `aside` holding the panes.
 */
const SidePanel = (props: SidePanelProps) => {
  const { width } = props
  const intl = useIntl()
  const cameraAiLoaded = useAppSelector((state) => state.scratchGui.cameraAi.loaded)
  const generatedCode = useAppSelector((state) => state.scratchGui.code.generatedCode)
  const selectedDeviceId = useAppSelector((state) => state.scratchGui.board.selectedDeviceId)
  // A hidden pane is removed from the panel; the choice is kept across reloads
  const [codeHidden, toggleCodeHidden] = usePaneCollapsed('code.hidden', false)
  const [monitorHidden, toggleMonitorHidden] = usePaneCollapsed('monitor.hidden', false)
  const showCode = selectedDeviceId !== null && !codeHidden
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <Box
      aria-label={intl.formatMessage(messages.sidePanel)}
      className={styles.sidePanel}
      element="aside"
      role="complementary"
      style={{ flex: `0 0 ${String(width)}px` }}
    >
      <div className={styles.header}>
        <DeviceControls />
        <div className={styles.panelActions}>
          <button className={styles.panelButton} type="button">
            <PlaceholderIcon />
          </button>
          <button className={styles.panelButton} type="button">
            <PlaceholderIcon />
          </button>
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={intl.formatMessage(messages.showPanels)}
            className={classNames(styles.panelButton, { [styles.open]: menuOpen })}
            title={intl.formatMessage(messages.showPanels)}
            type="button"
            onClick={() => {
              setMenuOpen((open) => !open)
            }}
            // The open menu closes on any pointerup outside it, which would reopen it on this button's click
            onPointerUp={(e) => {
              e.nativeEvent.stopPropagation()
            }}
          >
            <PanelsIcon />
          </button>
          <Menu
            className={styles.panelMenu}
            open={menuOpen}
            place="left"
            onRequestClose={() => {
              setMenuOpen(false)
            }}
          >
            {selectedDeviceId && (
              <PanelOption label={messages.generatedCode} shown={!codeHidden} onToggle={toggleCodeHidden} />
            )}
            <PanelOption label={messages.monitor} shown={!monitorHidden} onToggle={toggleMonitorHidden} />
          </Menu>
        </div>
      </div>
      <ModalPlatformInstall />
      {cameraAiLoaded && <PlaygroundPanel />}
      {showCode && <CodeView code={generatedCode} language="arduino" />}
      {!monitorHidden &&
        (selectedDeviceId ? (
          // Keyed by board, so a new board starts with an empty monitor and line buffer
          <MonitorViewBoard key={selectedDeviceId} fill={!showCode} />
        ) : (
          <MonitorViewHost />
        ))}
      {!showCode && monitorHidden && (
        <div className={styles.noPanel}>
          <PanelsIcon className={styles.noPanelIcon} />
          <FormattedMessage {...messages.noPanel} />
        </div>
      )}
    </Box>
  )
}

export default SidePanel
