/**
 * Plays recorded or generated hand frames in place of the camera and the model, so a project can be
 * shown and checked without a webcam and without filming anyone.
 */
import type { Hand, VisionFrame } from './hand-tracker'

/**
 * Plays frames in a loop, at their own pace.
 * @param frames Hands as the tracker reports them, each with the milliseconds to wait before the next frame.
 * @param onResults Called for every frame.
 * @returns Stops the playback.
 */
export const replayHands = (
  frames: { dt: number; hands: Hand[] }[],
  onResults: (frame: VisionFrame) => void,
): { stop(): void } => {
  let running = true
  let index = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const step = () => {
    if (!running) return
    const frame = frames[index]
    index = (index + 1) % frames.length
    onResults({ hands: frame.hands, t: Date.now() })
    timer = setTimeout(step, frame.dt)
  }
  step()
  return {
    stop() {
      running = false
      clearTimeout(timer)
    },
  }
}
