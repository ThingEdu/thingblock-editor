import classNames from 'classnames'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import { useVm } from '../../hooks/use-vm'
import clearIcon from '../../lib/assets/icon--clear.svg'
import { attachStream, listCameras, startCamera, stopCamera } from '../../lib/extensions/camera-ai/camera'
import { loadDeviceName, MOUSE, saveDeviceName } from '../../lib/extensions/camera-ai/camera-choice'
import {
  drawPlayground,
  EMPTY_PLAYGROUND,
  type PlaygroundState,
} from '../../lib/extensions/camera-ai/draw-playground'
import { type Gesture, trackHands, type VisionFrame } from '../../lib/extensions/camera-ai/hand-tracker'
import { trackMouse } from '../../lib/extensions/camera-ai/mouse-hand'
import { replayHands } from '../../lib/extensions/camera-ai/replay'
import log from '../../lib/log'
import ExtensionPane from '../extension-pane/extension-pane'
import Fab from '../fab/fab'
import styles from './extension-pane-camera-ai.module.css'
import cameraIcon from './icon--camera.svg'
import mirrorIcon from './icon--mirror.svg'
import stopIcon from './icon--stop.svg'

// The events shared with the VM's Camera AI extension
const CAMERA_COMMAND = 'CAMERA_AI_CAMERA_COMMAND'
const CAMERA_STATUS = 'CAMERA_AI_CAMERA_STATUS'
const CAMERA_DEVICES = 'CAMERA_AI_CAMERA_DEVICES'
const VISION_RESULTS = 'CAMERA_AI_VISION_RESULTS'
const PLAYGROUND_UPDATE = 'CAMERA_AI_PLAYGROUND_UPDATE'
const PLAYGROUND_COMMAND = 'CAMERA_AI_PLAYGROUND_COMMAND'

const messages = defineMessages({
  actions: {
    defaultMessage: 'Camera actions',
    description: 'Tooltip of the floating button that opens the playground camera actions',
    id: 'gui.playgroundPanel.actions',
  },
  cameraOn: {
    defaultMessage: 'Camera',
    description: 'Button that turns the webcam on',
    id: 'gui.playgroundPanel.cameraOn',
  },
  cameraOnTip: {
    defaultMessage: 'Turn the webcam on and start seeing hands',
    description: 'Tooltip of the button that turns the webcam on',
    id: 'gui.playgroundPanel.cameraOnTip',
  },
  cameraOffTip: {
    defaultMessage: 'Turn the webcam off',
    description: 'Tooltip of the button that turns the webcam off',
    id: 'gui.playgroundPanel.cameraOffTip',
  },
  mirrorTip: {
    defaultMessage: 'Flip the picture like a mirror',
    description: 'Tooltip of the mirror button',
    id: 'gui.playgroundPanel.mirrorTip',
  },
  device: {
    defaultMessage: 'Choose a camera',
    description: 'Label of the list of cameras on the playground panel',
    id: 'gui.playgroundPanel.device',
  },
  defaultCamera: {
    defaultMessage: 'Default camera',
    description: 'The browser default camera, first in the list of cameras',
    id: 'gui.playgroundPanel.defaultCamera',
  },
  phoneHint: {
    defaultMessage:
      'No webcam? Use a phone: with an iPhone and a Mac turn on Continuity Camera; on Android or Windows install DroidCam or Iriun, then choose that camera here.',
    description: 'Shown when the computer has no camera or the camera is off',
    id: 'gui.playgroundPanel.phoneHint',
  },
  mouse: {
    defaultMessage: 'Mouse (no webcam)',
    description: 'Choice in the list of cameras: play with a hand that follows the mouse',
    id: 'gui.playgroundPanel.mouse',
  },
  useMouse: {
    defaultMessage: 'Play with the mouse',
    description: 'Button shown when there is no webcam: play with a hand that follows the mouse',
    id: 'gui.playgroundPanel.useMouse',
  },
  mouseHint: {
    defaultMessage:
      'The index finger (or the head, in head games) follows the mouse. Hold the left button: fist. Right button or keys 1–7: another gesture. Hold ← →: lean the head, ↑: straight, ↓: nod, space: flap both hands.',
    description: 'Shown on the playground while the hand follows the mouse',
    id: 'gui.playgroundPanel.mouseHint',
  },
  clearTip: {
    defaultMessage: 'Remove all objects, scores and the countdown',
    description: 'Tooltip of the clear button',
    id: 'gui.playgroundPanel.clearTip',
  },
  off: {
    defaultMessage: 'The camera is off. Press Camera, or run a "turn camera on" block.',
    description: 'Shown on the playground while the webcam is off',
    id: 'gui.playgroundPanel.off',
  },
  starting: {
    defaultMessage: 'Starting the camera and loading the hand model…',
    description: 'Shown on the playground while the webcam and model start',
    id: 'gui.playgroundPanel.starting',
  },
  denied: {
    defaultMessage: 'The camera was not allowed. Allow it in the browser or system settings and try again.',
    description: 'Shown when the person denied camera access',
    id: 'gui.playgroundPanel.denied',
  },
  notFound: {
    defaultMessage: 'No camera was found on this computer.',
    description: 'Shown when the computer has no webcam',
    id: 'gui.playgroundPanel.notFound',
  },
  failed: {
    defaultMessage: 'The camera could not start: {error}',
    description: 'Shown when the webcam or the model failed for another reason',
    id: 'gui.playgroundPanel.failed',
  },
  player: {
    defaultMessage: 'P{n}',
    description: 'Short label of a player on the scoreboard; {n} is 1 or 2',
    id: 'gui.playgroundPanel.player',
  },
  fps: {
    defaultMessage: '{fps} fps',
    description: 'Frames per second the hand tracker reaches',
    id: 'gui.playgroundPanel.fps',
  },
})

/** The gesture names drawn under a hand; the same ids as the blocks' menu. */
const gestureMessages = defineMessages({
  fist: { defaultMessage: 'fist', description: 'Gesture name: a closed fist', id: 'cameraAi.menu.fist' },
  open: { defaultMessage: 'open hand', description: 'Gesture name: an open palm', id: 'cameraAi.menu.open' },
  thumb_up: { defaultMessage: 'thumbs up', description: 'Gesture name: thumbs up', id: 'cameraAi.menu.thumbUp' },
  thumb_down: {
    defaultMessage: 'thumbs down',
    description: 'Gesture name: thumbs down',
    id: 'cameraAi.menu.thumbDown',
  },
  victory: { defaultMessage: 'victory', description: 'Gesture name: the V sign', id: 'cameraAi.menu.victory' },
  point_up: {
    defaultMessage: 'pointing up',
    description: 'Gesture name: index finger up',
    id: 'cameraAi.menu.pointUp',
  },
  i_love_you: {
    defaultMessage: 'I love you',
    description: 'Gesture name: the ILY sign',
    id: 'cameraAi.menu.iLoveYou',
  },
})

type CameraStatus = 'off' | 'starting' | 'ready' | 'error'

/** What the blocks ask of the camera, through the VM. */
interface CameraCommand {
  on?: boolean
  mirror?: boolean
  device?: string
  /** Whether the project uses the head and body blocks, so the body tracker should run. */
  pose?: boolean
}

/**
 * Hand frames to play instead of the camera, set by development tools and tests; never read in production builds.
 * @returns The frames, or null to use the camera.
 */
const replayFrames = () => {
  if (import.meta.env.PROD) return null
  const frames = window.thingblockCameraReplay
  return frames && frames.length > 0 ? frames : null
}

/**
 * Where the model's and the pictures' assets are served from; the desktop app loads the page from a file.
 * @returns The page's `<base>` address, or an empty prefix without one.
 */
const assetBase = () => document.querySelector('base')?.href ?? ''

const ICONS: Record<'camera' | 'mouse', ReactNode> = {
  camera: <path d="M4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2.5l4-2.5v10l-4-2.5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />,
  mouse: <path d="M12 2a6 6 0 0 0-6 6v8a6 6 0 0 0 12 0V8a6 6 0 0 0-6-6zm-1 3h2v5h-2z" />,
}

interface StageButtonProps {
  icon: keyof typeof ICONS
  label: string
  tip: string
  onClick: () => void
}

/**
 * A button on the stage while the camera is off, with an icon and a label.
 * @param props - The button's icon, label, tooltip and click handler.
 * @returns A `button` with the icon and the label.
 */
const StageButton = (props: StageButtonProps) => {
  const { icon, label, onClick, tip } = props
  return (
    <button aria-label={label} className={styles.button} title={tip} type="button" onClick={onClick}>
      <svg aria-hidden="true" className={styles.icon} fill="currentColor" viewBox="0 0 24 24">
        {ICONS[icon]}
      </svg>
      {label}
    </button>
  )
}

/**
 * Camera AI's pane, the playground: runs the webcam and the hand tracker, sends every frame's hands to the VM, and shows the
 * camera with the tracked hands, the objects the program created, the scoreboard and the countdown.
 * @returns The stage, with the camera's controls.
 */
const ExtensionPaneCameraAi = () => {
  const intl = useIntl()
  const vm = useVm()
  const labels = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(gestureMessages).map(([gesture, message]) => [gesture, intl.formatMessage(message)]),
      ) as Partial<Record<Gesture, string>>,
    [intl],
  )
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const trackerRef = useRef<{ stop(): void } | null>(null)
  // The frame loop draws from refs, so it never restarts as these change
  const labelsRef = useRef(labels)
  const resultsRef = useRef<VisionFrame | null>(null)
  const playgroundRef = useRef<PlaygroundState>(EMPTY_PLAYGROUND)
  const mirrorRef = useRef(true)
  // Whether the project uses the head and body blocks, so the body tracker should run
  const poseWantedRef = useRef(false)
  const startingRef = useRef(false)
  // Bumped by every start and stop; a start whose number is stale was stopped while it waited
  const runRef = useRef(0)
  // Reset when the tracker starts, so it starts from zero here
  const fpsRef = useRef({ count: 0, since: 0 })

  const [status, setStatus] = useState<CameraStatus>('off')
  const [error, setError] = useState<{ name: string; message: string } | null>(null)
  const [mirror, setMirror] = useState(true)
  const [fps, setFps] = useState(0)
  const [playground, setPlayground] = useState<PlaygroundState>(EMPTY_PLAYGROUND)
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([])
  const [deviceName, setDeviceName] = useState(loadDeviceName)
  const deviceNameRef = useRef(deviceName)
  const camerasRef = useRef(cameras)

  useEffect(() => {
    labelsRef.current = labels
  }, [labels])

  // Names become known once a camera was allowed, and change when a phone connects or leaves
  const refreshCameras = useCallback(
    () =>
      listCameras().then((found) => {
        camerasRef.current = found
        setCameras(found)
        vm.events.emit(
          CAMERA_DEVICES,
          found.map((c) => c.name),
        )
      }),
    [vm],
  )

  useEffect(() => {
    void refreshCameras()
    // `mediaDevices` is missing outside a secure context
    const devices = navigator.mediaDevices as MediaDevices | undefined
    if (!devices) return
    const handleDeviceChange = () => {
      void refreshCameras()
    }
    devices.addEventListener('devicechange', handleDeviceChange)
    return () => {
      devices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [refreshCameras])

  const emitStatus = useCallback(
    (on: boolean, ready: boolean, err?: Error) => {
      vm.events.emit(CAMERA_STATUS, err ? { on, ready, error: err.message } : { on, ready })
    },
    [vm],
  )

  const stop = useCallback(() => {
    runRef.current += 1
    trackerRef.current?.stop()
    trackerRef.current = null
    stopCamera(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    resultsRef.current = null
    startingRef.current = false
    setStatus('off')
    setFps(0)
    emitStatus(false, false)
  }, [emitStatus])

  const handleResults = useCallback(
    (results: VisionFrame) => {
      resultsRef.current = results
      vm.events.emit(VISION_RESULTS, { ...results, mirror: mirrorRef.current })
      const f = fpsRef.current
      f.count += 1
      const now = performance.now()
      if (now - f.since >= 1000) {
        setFps(Math.round((f.count * 1000) / (now - f.since)))
        f.count = 0
        f.since = now
      }
    },
    [vm],
  )

  const start = useCallback(async () => {
    if (startingRef.current || trackerRef.current) return
    runRef.current += 1
    const run = runRef.current
    const stale = () => run !== runRef.current
    startingRef.current = true
    setError(null)
    setStatus('starting')
    emitStatus(true, false)
    const frames = replayFrames()
    if (frames || deviceNameRef.current === MOUSE) {
      if (frames) {
        trackerRef.current = replayHands(frames, handleResults)
      } else {
        if (!stageRef.current) throw new Error('PlaygroundPanel: the stage is not rendered')
        trackerRef.current = trackMouse(
          stageRef.current,
          handleResults,
          () => mirrorRef.current,
          () => poseWantedRef.current,
        )
      }
      startingRef.current = false
      fpsRef.current = { count: 0, since: performance.now() }
      setStatus('ready')
      emitStatus(true, true)
      return
    }
    let stream: MediaStream | null = null
    let tracker: { stop(): void } | null = null
    try {
      const video = videoRef.current
      if (!video) throw new Error('PlaygroundPanel: the video is not rendered')
      const chosen = camerasRef.current.find((c) => c.name === deviceNameRef.current)
      stream = await startCamera(chosen?.id)
      if (stale()) return
      streamRef.current = stream
      await attachStream(video, stream)
      if (stale()) return
      tracker = await trackHands(video, handleResults, { base: assetBase(), wantPose: () => poseWantedRef.current })
      if (stale()) return
      // eslint-disable-next-line require-atomic-updates -- the run number, checked just above, guards it
      trackerRef.current = tracker
      fpsRef.current = { count: 0, since: performance.now() }
      void refreshCameras()
      setStatus('ready')
      emitStatus(true, true)
    } catch (caught) {
      if (stale()) return
      const err = caught instanceof Error ? caught : new Error(String(caught))
      log.error('PlaygroundPanel: the camera failed:', err)
      stopCamera(stream)
      streamRef.current = null
      setError({ name: err.name, message: err.message })
      setStatus('error')
      emitStatus(false, false, err)
    } finally {
      if (stale()) {
        // Stopped while this start waited: releases what it opened, which the stop never saw
        tracker?.stop()
        stopCamera(stream)
      } else {
        // eslint-disable-next-line require-atomic-updates -- the run number, checked just above, guards it
        startingRef.current = false
      }
    }
  }, [emitStatus, handleResults, refreshCameras])

  const chooseCamera = useCallback(
    (name: string) => {
      deviceNameRef.current = name
      setDeviceName(name)
      saveDeviceName(name)
      // A running camera switches now; an idle one uses the choice when it starts
      if (trackerRef.current || startingRef.current) {
        stop()
        void start()
      }
    },
    [start, stop],
  )

  // The blocks drive the camera through the VM's events; the VM describes the playground the same way
  useEffect(() => {
    const handleCommand = (command: CameraCommand) => {
      if (typeof command.pose === 'boolean') poseWantedRef.current = command.pose
      // A head block asking for the body tracker: a running camera picks it up on its next frame
      if (command.pose && !('on' in command)) return
      if (typeof command.device === 'string') {
        chooseCamera(command.device)
      } else if (command.on) {
        if (typeof command.mirror === 'boolean') {
          mirrorRef.current = command.mirror
          setMirror(command.mirror)
        }
        void start()
      } else {
        stop()
      }
    }
    const handlePlayground = (state: PlaygroundState) => {
      playgroundRef.current = state
      setPlayground(state)
    }
    vm.events.on(CAMERA_COMMAND, handleCommand)
    vm.events.on(PLAYGROUND_UPDATE, handlePlayground)
    return () => {
      vm.events.off(CAMERA_COMMAND, handleCommand)
      vm.events.off(PLAYGROUND_UPDATE, handlePlayground)
    }
  }, [vm, start, stop, chooseCamera])

  // The camera stops with the panel
  useEffect(() => stop, [stop])

  // Redraws every frame: the hands move with the camera, the objects with the program
  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (canvasRef.current) {
        drawPlayground(
          canvasRef.current,
          resultsRef.current,
          mirrorRef.current,
          playgroundRef.current,
          labelsRef.current,
          assetBase(),
        )
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])

  const on = status === 'starting' || status === 'ready'
  const mouse = deviceName === MOUSE
  const showVideo = status === 'ready' && !mouse

  let placeholder: string | null = null
  if (status === 'off') placeholder = intl.formatMessage(messages.off)
  else if (status === 'starting') placeholder = intl.formatMessage(messages.starting)
  else if (status === 'error') {
    if (error?.name === 'NotAllowedError') placeholder = intl.formatMessage(messages.denied)
    else if (error?.name === 'NotFoundError') placeholder = intl.formatMessage(messages.notFound)
    else placeholder = intl.formatMessage(messages.failed, { error: error?.message ?? '?' })
  }

  const known = mouse || cameras.some((c) => c.name === deviceName)
  const noCamera = status === 'error' && error?.name === 'NotFoundError'
  const showPhoneHint = !mouse && (status === 'off' || noCamera)
  // Without a webcam the mouse is the way to play, so it is offered whenever the camera cannot be used
  const offerMouse = !mouse && (status === 'error' || (status === 'off' && cameras.length === 0))

  const toggleMirror = () => {
    mirrorRef.current = !mirrorRef.current
    setMirror(mirrorRef.current)
  }

  return (
    <ExtensionPane>
      <div ref={stageRef} className={classNames(styles.stage, { [styles.mouseStage]: mouse && status === 'ready' })}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- the live camera picture, which has no sound */}
        <video
          ref={videoRef}
          className={classNames(styles.video, { [styles.mirrored]: mirror, [styles.hidden]: !showVideo })}
        />
        <canvas ref={canvasRef} className={styles.canvas} />
        {placeholder && (
          <div className={classNames(styles.placeholder, { [styles.problem]: status === 'error' })}>
            {placeholder}
            {!on && (
              <div className={styles.startRow}>
                <select
                  aria-label={intl.formatMessage(messages.device)}
                  className={styles.device}
                  title={intl.formatMessage(messages.device)}
                  value={known ? deviceName : 'default'}
                  onChange={(e) => {
                    chooseCamera(e.target.value)
                  }}
                >
                  <option value="default">{intl.formatMessage(messages.defaultCamera)}</option>
                  {cameras.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value={MOUSE}>{intl.formatMessage(messages.mouse)}</option>
                </select>
                <StageButton
                  icon="camera"
                  label={intl.formatMessage(messages.cameraOn)}
                  tip={intl.formatMessage(messages.cameraOnTip)}
                  onClick={() => {
                    void start()
                  }}
                />
              </div>
            )}
            {offerMouse && (
              <StageButton
                icon="mouse"
                label={intl.formatMessage(messages.useMouse)}
                tip={intl.formatMessage(messages.mouseHint)}
                onClick={() => {
                  chooseCamera(MOUSE)
                  void start()
                }}
              />
            )}
            {showPhoneHint && <div className={styles.hint}>{intl.formatMessage(messages.phoneHint)}</div>}
          </div>
        )}
        {mouse && status === 'ready' && (
          <div className={styles.mouseHint}>{intl.formatMessage(messages.mouseHint)}</div>
        )}
        {playground.showScoreboard && (
          <div className={styles.scoreboard}>
            <span>
              {intl.formatMessage(messages.player, { n: 1 })} {playground.scores[0]}
            </span>
            <span className={styles.player2}>
              {intl.formatMessage(messages.player, { n: 2 })} {playground.scores[1]}
            </span>
            {playground.timeLeft !== null && <span className={styles.timer}>⏱ {playground.timeLeft}</span>}
          </div>
        )}
        {playground.say && <div className={styles.say}>{playground.say}</div>}
        {showVideo && fps > 0 && <div className={styles.fps}>{intl.formatMessage(messages.fps, { fps })}</div>}
      </div>
      {/* Beside the stage rather than in it, so the mouse hand, which follows the pointer over the stage, ignores it */}
      <Fab
        className={styles.fab}
        img={cameraIcon}
        items={[
          on
            ? { img: stopIcon, title: intl.formatMessage(messages.cameraOffTip), onClick: stop }
            : {
                img: cameraIcon,
                title: intl.formatMessage(messages.cameraOnTip),
                onClick: () => {
                  void start()
                },
              },
          { img: mirrorIcon, title: intl.formatMessage(messages.mirrorTip), pressed: mirror, onClick: toggleMirror },
          {
            img: clearIcon,
            title: intl.formatMessage(messages.clearTip),
            onClick: () => {
              vm.events.emit(PLAYGROUND_COMMAND, { type: 'reset' })
            },
          },
        ]}
        title={intl.formatMessage(messages.actions)}
      />
    </ExtensionPane>
  )
}

export default ExtensionPaneCameraAi
