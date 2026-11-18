/**
 * The camera this viewer picked last, by name; kept per browser, not in the project.
 *
 * Playing with the mouse is not remembered: it stands in for a missing webcam, so a camera plugged in
 * later is used the next time the playground starts.
 */

export const MOUSE = 'mouse'
export const DEFAULT_CAMERA = 'default'
const DEVICE_KEY = 'thingblock.cameraAi.device'

/**
 * @returns The remembered camera name, or `default` for the system's camera.
 */
export const loadDeviceName = (): string => {
  try {
    const name = localStorage.getItem(DEVICE_KEY)
    return name && name !== MOUSE ? name : DEFAULT_CAMERA
  } catch {
    return DEFAULT_CAMERA
  }
}

/**
 * Remembers a camera choice; choosing the mouse forgets the camera so the default is used next time.
 * @param name The camera name, `default`, or `mouse`.
 */
export const saveDeviceName = (name: string) => {
  try {
    if (name === MOUSE) localStorage.removeItem(DEVICE_KEY)
    else localStorage.setItem(DEVICE_KEY, name)
  } catch {
    // Private windows may refuse storage; the choice then lasts only this session.
  }
}
