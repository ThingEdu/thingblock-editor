import formatMessage from 'format-message';
import Device, {type CompileConfig, type DeviceInfo, type UploadConfig} from '../../../devices/device';
import ConnectionType from '../../../devices/connection-type';

/**
 * Arduino Uno (ATmega328P) device.
 */
class ArduinoUno extends Device {
    get deviceId (): string {
        return 'arduinoUno';
    }

    getDeviceInfo (): DeviceInfo {
        return {
            name: formatMessage({
                id: 'device.arduinoUno.name',
                default: 'Arduino Uno',
                description: 'Name of the Arduino Uno device'
            }),
            description: formatMessage({
                id: 'device.arduinoUno.description',
                default: 'The classic ATmega328P board — a great place to start.',
                description: 'Description of the Arduino Uno device'
            }),
            manufacturer: 'arduino.cc',
            requires: ConnectionType.SERIAL,
            learnMore: 'https://docs.arduino.cc/hardware/uno-rev3',
            help: 'https://support.arduino.cc'
        };
    }

    get fqbn (): string {
        return 'arduino:avr:uno';
    }

    getCompileConfig (): CompileConfig {
        return {options: {}};
    }

    getUploadConfig (): UploadConfig {
        return {
            pnpid: [
                'USB\\VID_2341&PID_0043',
                'USB\\VID_2341&PID_0001'
            ],
            uploadSpeed: 115200
        };
    }
}

export default ArduinoUno;
