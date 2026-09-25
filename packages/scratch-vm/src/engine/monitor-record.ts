import {Record} from 'immutable';

const MonitorRecord = Record({
    /** ID of the monitored block. */
    id: null,
    /** Set only for sprite-specific monitors. */
    spriteName: null,
    targetId: null,
    opcode: null,
    value: null,
    params: null,
    mode: 'default',
    sliderMin: 0,
    sliderMax: 100,
    isDiscrete: true,
    /** Null x and y ask the GUI to auto-position the monitor. */
    x: null,
    y: null,
    width: 0,
    height: 0,
    visible: true
});

export default MonitorRecord;
