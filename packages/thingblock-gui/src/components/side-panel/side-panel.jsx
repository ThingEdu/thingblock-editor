import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useCallback, useState} from 'react';
import {defineMessages, FormattedMessage, useIntl} from 'react-intl';
import VM from '@thingblock/thingblock-vm';

import Box from '../box/box.jsx';
import CodeView from '../code-view/code-view.jsx';
import {MenuItem} from '../menu/menu.jsx';
import Menu from '../../containers/menu.jsx';
import BoardMonitor from '../../containers/board-monitor.jsx';
import DeviceControls from '../../containers/device-controls.jsx';
import HostMonitor from '../../containers/host-monitor.jsx';
import PlatformInstallModal from '../../containers/platform-install-modal.jsx';
import PlaygroundPanel from '../../containers/playground-panel.jsx';
import SimPanel from '../../containers/sim-panel.jsx';
import {usePaneCollapsed} from '../../lib/pane-collapse';
import check from '../menu-bar/check.svg';

import styles from './side-panel.css';

const messages = defineMessages({
    sidePanel: {
        id: 'gui.aria.stageAndTarget',
        defaultMessage: 'Device panel',
        description: 'accessibility label for the device panel'
    },
    showPanels: {
        id: 'gui.sidePanel.showPanels',
        defaultMessage: 'Show panels',
        description: 'Label of the side panel button that opens the list of panels to show or hide'
    },
    simulator: {
        id: 'gui.sidePanel.simulator',
        defaultMessage: 'Simulator',
        description: 'Side panel menu option that shows or hides the simulator panel'
    },
    generatedCode: {
        id: 'gui.sidePanel.generatedCode',
        defaultMessage: 'Generated Code',
        description: 'Side panel menu option that shows or hides the generated code panel'
    },
    monitor: {
        id: 'gui.sidePanel.monitor',
        defaultMessage: 'Monitor',
        description: 'Side panel menu option that shows or hides the monitor panel'
    },
    noPanel: {
        id: 'gui.sidePanel.noPanel',
        defaultMessage: 'No panel shown. Use the panels button above to show one.',
        description: 'Shown in the side panel when every panel is hidden'
    }
});

const PlaceholderIcon = () => (
    <svg
        className={styles.panelIcon}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
    >
        <rect
            x="2"
            y="2"
            width="12"
            height="12"
            rx="2"
        />
    </svg>
);

const PanelsIcon = ({className = styles.panelIcon}) => (
    <svg
        className={className}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
    >
        <rect
            x="2"
            y="2"
            width="12"
            height="12"
            rx="2"
        />
        <path d="M2 9h12" />
    </svg>
);

PanelsIcon.propTypes = {
    className: PropTypes.string
};

const PanelOption = ({label, shown, onToggle}) => (
    <MenuItem
        ariaRole="menuitemcheckbox"
        isSelected={shown}
        onClick={onToggle}
    >
        <div className={styles.option}>
            <img
                className={classNames(styles.check, {[styles.checked]: shown})}
                src={check}
            />
            <FormattedMessage {...label} />
        </div>
    </MenuItem>
);

PanelOption.propTypes = {
    label: PropTypes.shape({id: PropTypes.string}).isRequired,
    shown: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired
};

/**
 * Right-hand column of the editor: device controls, the Camera AI playground while that extension is loaded,
 * and either the board's simulator, generated code and
 * serial monitor, or the host monitor when no board is selected.
 * @param {object} props component props.
 * @returns {React.ReactElement} the panel.
 */
const SidePanel = ({cameraAiLoaded, generatedCode, selectedDeviceId, vm, width}) => {
    const intl = useIntl();
    // Hiding a pane removes it from the panel; the pane store keeps the choice across reloads.
    const [simHidden, toggleSimHidden] = usePaneCollapsed('sim.hidden', false);
    const [codeHidden, toggleCodeHidden] = usePaneCollapsed('code.hidden', false);
    const [monitorHidden, toggleMonitorHidden] = usePaneCollapsed('monitor.hidden', false);
    const showSim = Boolean(selectedDeviceId) && !simHidden;
    const showCode = Boolean(selectedDeviceId) && !codeHidden;
    const [menuOpen, setMenuOpen] = useState(false);
    const handleToggleMenu = useCallback(() => setMenuOpen(open => !open), []);
    const handleCloseMenu = useCallback(() => setMenuOpen(false), []);
    // The open menu closes on any pointerup outside it, which would reopen it on the button's click.
    const handleMenuButtonPointerUp = useCallback(e => e.nativeEvent.stopPropagation(), []);

    return (
        <Box
            role="complementary"
            aria-label={intl.formatMessage(messages.sidePanel)}
            className={styles.sidePanel}
            element="aside"
            style={{flex: `0 0 ${width}px`}}
        >
            <div className={styles.header}>
                <DeviceControls />
                <div className={styles.panelActions}>
                    <button
                        className={styles.panelButton}
                        type="button"
                    >
                        <PlaceholderIcon />
                    </button>
                    <button
                        className={styles.panelButton}
                        type="button"
                    >
                        <PlaceholderIcon />
                    </button>
                    <button
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        aria-label={intl.formatMessage(messages.showPanels)}
                        className={classNames(styles.panelButton, {[styles.open]: menuOpen})}
                        title={intl.formatMessage(messages.showPanels)}
                        type="button"
                        onClick={handleToggleMenu}
                        onPointerUp={handleMenuButtonPointerUp}
                    >
                        <PanelsIcon />
                    </button>
                    <Menu
                        className={styles.panelMenu}
                        open={menuOpen}
                        place="left"
                        onRequestClose={handleCloseMenu}
                    >
                        {selectedDeviceId && (
                            <PanelOption
                                label={messages.simulator}
                                shown={!simHidden}
                                onToggle={toggleSimHidden}
                            />
                        )}
                        {selectedDeviceId && (
                            <PanelOption
                                label={messages.generatedCode}
                                shown={!codeHidden}
                                onToggle={toggleCodeHidden}
                            />
                        )}
                        <PanelOption
                            label={messages.monitor}
                            shown={!monitorHidden}
                            onToggle={toggleMonitorHidden}
                        />
                    </Menu>
                </div>
            </div>
            <PlatformInstallModal />
            {cameraAiLoaded && <PlaygroundPanel />}
            {showSim && <SimPanel roomy={!showCode} />}
            {showCode && (
                <CodeView
                    code={generatedCode}
                    language="arduino"
                />
            )}
            {!monitorHidden && (selectedDeviceId ? (
                // Keyed by device so a new board starts with an empty monitor and line buffer.
                <BoardMonitor
                    key={selectedDeviceId}
                    fill={!showCode}
                    vm={vm}
                />
            ) : <HostMonitor vm={vm} />)}
            {!showSim && !showCode && monitorHidden && (
                <div className={styles.noPanel}>
                    <PanelsIcon className={styles.noPanelIcon} />
                    <FormattedMessage {...messages.noPanel} />
                </div>
            )}
        </Box>
    );
};

SidePanel.propTypes = {
    cameraAiLoaded: PropTypes.bool,
    generatedCode: PropTypes.string,
    selectedDeviceId: PropTypes.string,
    vm: PropTypes.instanceOf(VM).isRequired,
    width: PropTypes.number.isRequired
};

export default SidePanel;
