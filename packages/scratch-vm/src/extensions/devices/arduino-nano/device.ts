import formatMessage from 'format-message';
import Device, {type CompileConfig, type DeviceInfo, type UploadConfig} from '../../../devices/device';
import ConnectionType from '../../../devices/connection-type';

/**
 * Arduino Nano (ATmega328P) device. Shares the ATmega328P FQBN family with the Uno but is a
 * distinct device: its classic bootloader needs the old-bootloader CPU option and a slower
 * upload speed, so it keys on its own `deviceId`.
 */
class ArduinoNano extends Device {
    get deviceId (): string {
        return 'arduinoNano';
    }

    getDeviceInfo (): DeviceInfo {
        return {
            name: formatMessage({
                id: 'device.arduinoNano.name',
                default: 'Arduino Nano',
                description: 'Name of the Arduino Nano device'
            }),
            description: formatMessage({
                id: 'device.arduinoNano.description',
                default: 'The Arduino Nano is a classic small board to build your projects with.',
                description: 'Description of the Arduino Nano device'
            }),
            manufacturer: 'arduino.cc',
            requires: ConnectionType.SERIAL,
            learnMore: 'https://docs.arduino.cc/hardware/nano',
            help: 'https://support.arduino.cc'
        };
    }

    get fqbn (): string {
        return 'arduino:avr:nano';
    }

    getCompileConfig (): CompileConfig {
        return {options: {cpu: 'atmega328old'}};
    }

    getUploadConfig (): UploadConfig {
        return {
            pnpid: [
                'USB\\VID_1A86&PID_7523',
                'USB\\VID_0403&PID_6001'
            ],
            uploadSpeed: 57600
        };
    }
}

export default ArduinoNano;
