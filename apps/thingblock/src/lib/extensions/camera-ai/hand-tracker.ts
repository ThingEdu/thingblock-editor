/**
 * Hands and gestures from a video element, through MediaPipe's gesture recognizer, and the body (33
 * landmarks) through its pose landmarker when the project asks for it. The models and their WASM runtime
 * are served from the editor's own static files, so this works offline.
 */
import {
  FilesetResolver,
  GestureRecognizer,
  type GestureRecognizerResult,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'

/** Where the MediaPipe runtime and the models are served from. */
const WASM_PATH = 'static/mediapipe/wasm'
const MODEL_PATH = 'static/ai-models/gesture_recognizer.task'
const POSE_MODEL_PATH = 'static/ai-models/pose_landmarker_lite.task'

/** A gesture, as the VM's vision state names it. */
export type Gesture = 'none' | 'fist' | 'open' | 'thumb_up' | 'thumb_down' | 'victory' | 'point_up' | 'i_love_you'

/** A landmark, normalized to the camera frame with its origin top-left. */
export interface Landmark {
  x: number
  y: number
  z: number
  visibility?: number
}

/** A hand, in the shape the VM's vision state takes. */
export interface Hand {
  gesture: Gesture
  score: number
  side: 'left' | 'right'
  /** 21 landmarks in MediaPipe's hand order. */
  landmarks: Landmark[]
}

/** A body, in the shape the VM's vision state takes: 33 landmarks in MediaPipe's pose order. */
export interface Pose {
  landmarks: Landmark[]
}

/** One processed frame. */
export interface VisionFrame {
  hands: Hand[]
  pose?: Pose | null
  t: number
}

/** MediaPipe's category names, as the VM's vision state expects them. */
const GESTURE_BY_CATEGORY: Record<string, Gesture | undefined> = {
  None: 'none',
  Closed_Fist: 'fist',
  Open_Palm: 'open',
  Thumb_Up: 'thumb_up',
  Thumb_Down: 'thumb_down',
  Victory: 'victory',
  Pointing_Up: 'point_up',
  ILoveYou: 'i_love_you',
}

/** Landmark pairs that outline a hand, in MediaPipe's 21-point order. */
export const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
]

/** Pose landmark pairs drawn as the upper body: shoulders, arms and the sides of the trunk. */
export const POSE_CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
]

let recognizerPromise: Promise<GestureRecognizer> | null = null
let posePromise: Promise<PoseLandmarker> | null = null
let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null

const loadFileset = (base: string) => {
  filesetPromise ??= FilesetResolver.forVisionTasks(base + WASM_PATH).catch((err: unknown) => {
    filesetPromise = null
    throw err
  })
  return filesetPromise
}

/**
 * Creates a MediaPipe task on the GPU, or on the CPU where WebGL 2 is missing.
 * @param create Builds the task for a delegate.
 * @returns The task.
 */
const onGpuOrCpu = async <T>(create: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> => {
  try {
    return await create('GPU')
  } catch (err) {
    console.warn('[cameraAi] GPU delegate unavailable, using CPU:', err)
    return create('CPU')
  }
}

/**
 * Loads the pose landmarker once; later calls share it. Only projects with head or body blocks need it.
 * @param base Prefix of the static paths.
 * @returns The model, ready for video.
 */
const loadPose = (base: string) => {
  posePromise ??= loadFileset(base)
    .then((vision) =>
      onGpuOrCpu((delegate) =>
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: base + POSE_MODEL_PATH, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
        }),
      ),
    )
    .catch((err: unknown) => {
      posePromise = null
      throw err
    })
  return posePromise
}

/**
 * Loads the recognizer once; later calls share it.
 * @param base Prefix of the static paths, '' in the dev server.
 * @returns The model, ready for video.
 */
const loadRecognizer = (base: string) => {
  // The GPU path needs WebGL 2; a machine or WebView without it still gets the CPU path.
  recognizerPromise ??= loadFileset(base)
    .then((vision) =>
      onGpuOrCpu((delegate) =>
        GestureRecognizer.createFromOptions(vision, {
          baseOptions: { modelAssetPath: base + MODEL_PATH, delegate },
          runningMode: 'VIDEO',
          numHands: 2,
        }),
      ),
    )
    .catch((err: unknown) => {
      recognizerPromise = null
      throw err
    })
  return recognizerPromise
}

/**
 * Turns one recognizer result into the shape the VM takes.
 * @param result The recognizer's result for a frame.
 * @returns One entry per hand.
 */
const toHands = (result: GestureRecognizerResult): Hand[] =>
  result.landmarks.map((landmarks, i) => {
    const gesture = result.gestures.at(i)?.at(0)
    const handedness = result.handedness.at(i)?.at(0)
    return {
      gesture: gesture ? (GESTURE_BY_CATEGORY[gesture.categoryName] ?? 'none') : 'none',
      score: gesture ? gesture.score : 0,
      // MediaPipe labels hands for a mirrored picture; camera frames are not mirrored, so swap.
      side: handedness?.categoryName === 'Left' ? 'right' : 'left',
      landmarks: landmarks.map((p) => ({ x: p.x, y: p.y, z: p.z })),
    }
  })

/**
 * Turns one pose result into the shape the VM takes.
 * @param result The pose landmarker's result for a frame.
 * @returns The first person's body, or null when nobody was found.
 */
const toPose = (result: PoseLandmarkerResult): Pose | null => {
  const landmarks = result.landmarks.at(0)
  if (!landmarks) return null
  return { landmarks: landmarks.map((p) => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility })) }
}

/**
 * Tracks hands in a playing video element until stopped, and the body while `wantPose` says so.
 * @param video The element showing the camera.
 * @param onResults Called after every processed frame; `pose` is null until the body model has loaded, and
 *   whenever it is not wanted.
 * @param options How to track.
 * @param options.base Prefix of the static asset paths, '' in the dev server.
 * @param options.wantPose Whether the project uses the head and body blocks.
 * @returns Resolves once the hand model is loaded and tracking runs.
 */
export const trackHands = async (
  video: HTMLVideoElement,
  onResults: (frame: VisionFrame) => void,
  options: { base?: string; wantPose?: () => boolean } = {},
): Promise<{ stop(): void }> => {
  const { base = '', wantPose = () => false } = options
  const recognizer = await loadRecognizer(base)
  let running = true
  let lastVideoTime = -1
  // Loaded the first time the project wants it; hands keep running meanwhile.
  let poseModel: PoseLandmarker | null = null
  let poseLoading = false
  const pose = () => {
    if (!wantPose()) return null
    if (!poseModel) {
      if (!poseLoading) {
        poseLoading = true
        loadPose(base)
          .then((model) => {
            poseModel = model
          })
          .catch((err: unknown) => {
            console.warn('[cameraAi] body model failed to load:', err)
          })
      }
      return null
    }
    return toPose(poseModel.detectForVideo(video, performance.now()))
  }

  const step = () => {
    if (!running) return
    // A frame is processed once; the recognizer needs strictly increasing timestamps.
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime
      try {
        const result = recognizer.recognizeForVideo(video, performance.now())
        onResults({ hands: toHands(result), pose: pose(), t: Date.now() })
      } catch (err) {
        // One bad frame (for instance while the element resizes) is not worth stopping for.
        console.warn('[cameraAi] frame skipped:', err)
      }
    }
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)

  return {
    stop() {
      running = false
    },
  }
}
