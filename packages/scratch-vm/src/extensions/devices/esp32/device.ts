import formatMessage from 'format-message';
import Device, {type CompileConfig, type DeviceInfo, type UploadConfig} from '../../../devices/device';
import ConnectionType from '../../../devices/connection-type';

/**
 * ESP32 Dev Module device. ESP32-specific build options (PartitionScheme, FlashMode, and on
 * native-USB variants CDCOnBoot) go in the compile options when a device needs them; the plain
 * Dev Module builds with core defaults.
 */
class Esp32 extends Device {
    get deviceId (): string {
        return 'esp32';
    }

    getDeviceInfo (): DeviceInfo {
        return {
            name: formatMessage({
                id: 'device.esp32.name',
                default: 'ESP32 Dev Module',
                description: 'Name of the ESP32 Dev Module device'
            }),
            description: formatMessage({
                id: 'device.esp32.description',
                default: 'A Wi-Fi and Bluetooth capable dual-core board.',
                description: 'Description of the ESP32 Dev Module device'
            }),
            manufacturer: 'espressif.com',
            requires: ConnectionType.SERIAL,
            learnMore: 'https://www.espressif.com/en/products/socs/esp32',
            help: 'https://docs.espressif.com/projects/arduino-esp32/en/latest/'
        };
    }

    get fqbn (): string {
        return 'esp32:esp32:esp32';
    }

    getCompileConfig (): CompileConfig {
        return {options: {}};
    }

    getUploadConfig (): UploadConfig {
        return {
            pnpid: [
                'USB\\VID_10C4&PID_EA60',
                'USB\\VID_1A86&PID_7523'
            ],
            uploadSpeed: 921600
        };
    }
}

export default Esp32;
