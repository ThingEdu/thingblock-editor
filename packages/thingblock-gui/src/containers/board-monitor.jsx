import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import VM from '@thingblock/thingblock-vm';

import MonitorView, {appendMonitorLogs} from '../components/monitor-view/monitor-view.jsx';

/**
 * Serial monitor for the selected board: shows what the board writes and sends typed lines to it.
 * @param {object} props component props.
 * @param {boolean} props.fill whether the monitor fills the panel instead of keeping its own height.
 * @param {VM} props.vm the VM whose link carries the board's serial.
 * @returns {React.ReactElement} the monitor.
 */
const BoardMonitor = ({fill = false, vm}) => {
    const [logs, setLogs] = useState([]);
    // The link keeps the rate across remounts and applies it when it opens the monitor.
    const [baudRate, setBaudRate] = useState(() => vm.link.monitorBaud);
    // Holds the partial trailing line between serial chunks; serial frames are not line-aligned.
    const buffer = useRef('');

    useEffect(() => {
        const handleSerial = chunk => {
            const parts = (buffer.current + String(chunk)).split('\n');
            buffer.current = parts.pop();
            if (parts.length) {
                setLogs(prev => appendMonitorLogs(prev, parts.map(line => ({message: line.replace(/\r$/, '')}))));
            }
        };
        vm.events.on('SERIAL_DATA', handleSerial);
        return () => {
            vm.events.off('SERIAL_DATA', handleSerial);
        };
    }, [vm]);

    const handleClear = useCallback(() => setLogs([]), []);

    // The board's reply, if any, comes back as SERIAL_DATA, so there is no local echo.
    const handleSend = useCallback(value => vm.writeMonitor(value), [vm]);

    const handleBaudChange = useCallback(rate => {
        setBaudRate(rate);
        vm.link.setMonitorBaud(rate);
    }, [vm]);

    return (
        <MonitorView
            fill={fill}
            logs={logs}
            baudRate={baudRate}
            onBaudChange={handleBaudChange}
            onClear={handleClear}
            onSend={handleSend}
        />
    );
};

BoardMonitor.propTypes = {
    fill: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default BoardMonitor;
