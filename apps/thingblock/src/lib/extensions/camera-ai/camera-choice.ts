/** The camera this viewer picked last, by name; kept per browser, not in the project. */

export const DEFAULT_CAMERA = 'default'
const DEVICE_KEY = 'thingblock.cameraAi.device'

/**
 * @returns The remembered camera name, or `default` for the system's camera.
 */
export const loadDeviceName = (): string => {
  try {
    return localStorage.getItem(DEVICE_KEY) ?? DEFAULT_CAMERA
  } catch {
    return DEFAULT_CAMERA
  }
}

/**
 * Remembers a camera choice.
 * @param name The camera name, or `default`.
 */
export const saveDeviceName = (name: string) => {
  try {
    localStorage.setItem(DEVICE_KEY, name)
  } catch {
    // Private windows may refuse storage; the choice then lasts only this session.
  }
}
