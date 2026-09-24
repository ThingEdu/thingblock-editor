/**
 * How a device connects to the host. The device-selection card maps each value to a "Requires"
 * icon and label.
 */
const ConnectionType = {
    SERIAL: 'serial',
    BLE: 'ble',
    USB: 'usb'
} as const;

export type ConnectionTypeId = typeof ConnectionType[keyof typeof ConnectionType];

export default ConnectionType;
