import {DEFAULT_CAMERA, loadDeviceName, saveDeviceName} from '../../../src/lib/vision/camera-choice';

describe('camera choice', () => {
    beforeEach(() => localStorage.clear());

    test('uses the system camera when nothing was chosen', () => {
        expect(loadDeviceName()).toBe(DEFAULT_CAMERA);
    });

    test('remembers a camera by name', () => {
        saveDeviceName('rapoo camera');
        expect(loadDeviceName()).toBe('rapoo camera');
    });
});
