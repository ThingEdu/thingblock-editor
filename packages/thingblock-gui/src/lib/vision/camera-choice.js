/**
 * The camera this viewer picked last, by name; kept per browser, not in the project.
 */

export const DEFAULT_CAMERA = 'default';
const DEVICE_KEY = 'thingblock.cameraAi.device';

/**
 * @returns {string} The remembered camera name, or `default` for the system's camera.
 */
export const loadDeviceName = () => {
    try {
        return localStorage.getItem(DEVICE_KEY) || DEFAULT_CAMERA;
    } catch (e) {
        return DEFAULT_CAMERA;
    }
};

/**
 * Remember a camera choice.
 * @param {string} name The camera name, or `default`.
 */
export const saveDeviceName = name => {
    try {
        localStorage.setItem(DEVICE_KEY, name);
    } catch (e) {
        // Private windows may refuse storage; the choice then lasts only this session.
    }
};
