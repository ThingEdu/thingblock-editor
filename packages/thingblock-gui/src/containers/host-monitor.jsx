import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useState} from 'react';
import VM from '@thingblock/thingblock-vm';

import MonitorView, {appendMonitorLogs} from '../components/monitor-view/monitor-view.jsx';

/**
 * Monitor for a project with no board: shows the blocks' print output and answers "ask and wait".
 * @param {object} props component props.
 * @param {VM} props.vm the VM whose events feed the monitor.
 * @returns {React.ReactElement} the monitor.
 */
const HostMonitor = ({vm}) => {
    const [logs, setLogs] = useState([]);
    const [prompt, setPrompt] = useState(null);

    useEffect(() => {
        const handlePrint = message => {
            setLogs(prev => appendMonitorLogs(prev, [{message: String(message)}]));
        };
        const handleQuestion = question => setPrompt(question ?? null);
        vm.events.on('PRINT_TO_MONITOR', handlePrint);
        vm.events.on('QUESTION', handleQuestion);
        return () => {
            vm.events.off('PRINT_TO_MONITOR', handlePrint);
            vm.events.off('QUESTION', handleQuestion);
        };
    }, [vm]);

    const handleClear = useCallback(() => setLogs([]), []);

    const handleSend = useCallback(value => {
        vm.writeMonitor(value);
        setPrompt(null);
    }, [vm]);

    return (
        <MonitorView
            fill
            logs={logs}
            prompt={prompt}
            onClear={handleClear}
            onSend={handleSend}
        />
    );
};

HostMonitor.propTypes = {
    vm: PropTypes.instanceOf(VM).isRequired
};

export default HostMonitor;
