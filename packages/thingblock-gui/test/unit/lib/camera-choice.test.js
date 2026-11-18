import {DEFAULT_CAMERA, MOUSE, loadDeviceName, saveDeviceName} from '../../../src/lib/vision/camera-choice';

describe('camera choice', () => {
    beforeEach(() => localStorage.clear());

    test('uses the system camera when nothing was chosen', () => {
        expect(loadDeviceName()).toBe(DEFAULT_CAMERA);
    });

    test('remembers a camera by name', () => {
        saveDeviceName('rapoo camera');
        expect(loadDeviceName()).toBe('rapoo camera');
    });

    test('does not remember the mouse, so a webcam plugged in later is used', () => {
        saveDeviceName('rapoo camera');
        saveDeviceName(MOUSE);
        expect(loadDeviceName()).toBe(DEFAULT_CAMERA);
    });

    test('ignores a mouse choice an older build saved', () => {
        localStorage.setItem('thingblock.cameraAi.device', MOUSE);
        expect(loadDeviceName()).toBe(DEFAULT_CAMERA);
    });
});
