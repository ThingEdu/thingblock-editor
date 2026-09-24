import formatMessage from 'format-message';
import Device, {type CompileConfig, type DeviceInfo, type UploadConfig} from '../../../devices/device';
import ConnectionType from '../../../devices/connection-type';

/**
 * ESP32-C3 Dev Module device. The single-core RISC-V SoC connects over its built-in USB
 * Serial/JTAG, so it builds with `CDCOnBoot=cdc` to route `Serial` output to the Monitor over USB;
 * boards that instead carry a CP2102/CH340 UART bridge are matched by the extra pnpid filters.
 */
class Esp32C3 extends Device {
    get deviceId (): string {
        return 'esp32c3';
    }

    getDeviceInfo (): DeviceInfo {
        return {
            name: formatMessage({
                id: 'device.esp32c3.name',
                default: 'ESP32-C3 Dev Module',
                description: 'Name of the ESP32-C3 Dev Module device'
            }),
            description: formatMessage({
                id: 'device.esp32c3.description',
                default: 'A single-core RISC-V board with Wi-Fi and Bluetooth Low Energy.',
                description: 'Description of the ESP32-C3 Dev Module device'
            }),
            manufacturer: 'espressif.com',
            requires: ConnectionType.SERIAL,
            learnMore: 'https://www.espressif.com/en/products/socs/esp32-c3',
            help: 'https://docs.espressif.com/projects/arduino-esp32/en/latest/'
        };
    }

    get fqbn (): string {
        return 'esp32:esp32:esp32c3';
    }

    getCompileConfig (): CompileConfig {
        return {options: {CDCOnBoot: 'cdc'}};
    }

    getUploadConfig (): UploadConfig {
        return {
            pnpid: [
                'USB\\VID_303A&PID_1001',
                'USB\\VID_10C4&PID_EA60',
                'USB\\VID_1A86&PID_7523'
            ],
            uploadSpeed: 921600
        };
    }
}

export default Esp32C3;
