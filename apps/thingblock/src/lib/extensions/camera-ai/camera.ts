/**
 * The webcam: one stream at a time, at the size the hand tracker likes.
 */

/** The frame size asked of the camera; the models run on 192–256 px internally, so more is waste. */
const WIDTH = 640
const HEIGHT = 480

/**
 * The cameras this computer offers, a phone shown as a webcam (Continuity Camera, DroidCam, Iriun)
 * among them. Names are empty until the page has been allowed a camera once.
 * @returns One entry per camera.
 */
export const listCameras = async (): Promise<{ id: string; name: string }[]> => {
  // `mediaDevices` is missing outside a secure context.
  if (!(navigator.mediaDevices as MediaDevices | undefined)) return []
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'videoinput')
    .map((d, i) => ({ id: d.deviceId, name: d.label || `Camera ${String(i + 1)}` }))
}

/**
 * Opens a camera.
 * @param deviceId The camera to open; the browser's default when omitted.
 * @returns The video stream.
 * @throws {Error} Named `NotAllowedError` when the person denied the camera, `NotFoundError` when there is
 *   none, or `NotSupportedError` when the page cannot ask (no `getUserMedia`).
 */
export const startCamera = async (deviceId?: string): Promise<MediaStream> => {
  if (!(navigator.mediaDevices as MediaDevices | undefined)) {
    const err = new Error('getUserMedia is not available')
    err.name = 'NotSupportedError'
    throw err
  }
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: deviceId
      ? { width: { ideal: WIDTH }, height: { ideal: HEIGHT }, deviceId: { exact: deviceId } }
      : { width: { ideal: WIDTH }, height: { ideal: HEIGHT }, facingMode: 'user' },
  })
}

/**
 * Releases the webcam.
 * @param stream The stream from `startCamera`.
 */
export const stopCamera = (stream: MediaStream | null) => {
  if (!stream) return
  for (const track of stream.getTracks()) track.stop()
}

/**
 * Plays a stream in a video element, resolving once the first frame can be read.
 * @param video The element.
 * @param stream The camera's stream, from `startCamera`.
 */
export const attachStream = (video: HTMLVideoElement, stream: MediaStream) =>
  new Promise<void>((resolve, reject) => {
    video.srcObject = stream
    video.muted = true
    video.playsInline = true
    const onReady = () => {
      video.removeEventListener('loadeddata', onReady)
      resolve()
    }
    video.addEventListener('loadeddata', onReady)
    video.play().catch(reject)
  })
