/**
 * Draws the Camera AI playground over the camera picture: the tracked hands and body, and the objects the program
 * created.
 */
import { type Gesture, HAND_CONNECTIONS, type Landmark, POSE_CONNECTIONS, type VisionFrame } from './hand-tracker'
import { drawPicture, objectImage } from './object-images'

/** The stage the VM reasons in: x −240…240, y −180…180. The canvas scales it to the panel. */
const STAGE_WIDTH = 480
const STAGE_HEIGHT = 360

/** The emoji drawn for each object kind; the cricket and the robot Tre have pictures and use these while they load. */
const PICTURES: Record<string, string | undefined> = {
  ball: '🏀',
  cricket: '🦗',
  drop: '💧',
  basket: '🧺',
  star: '⭐',
  bomb: '💣',
  tre: '🤖',
}

/** A bamboo's stalks are this wide on the stage; the VM's playground uses the same width to judge touches. */
const BAMBOO_WIDTH = 46

/** A playground object, in the shape the VM's playground sends it. */
export interface PlaygroundObject {
  name: string
  kind: string
  /** The centre, in stage units. */
  x: number
  y: number
  /** The width of the picture, in stage units; for a bamboo, the height of the opening. */
  size: number
  /** The velocity in stage units per second; y grows upward. */
  vx: number
  vy: number
}

/** What the VM's playground shows, as it sends it. */
export interface PlaygroundState {
  objects: PlaygroundObject[]
  scores: [number, number]
  /** Seconds left on the countdown, or null while none runs. */
  timeLeft: number | null
  say: string
  showScoreboard: boolean
}

export const EMPTY_PLAYGROUND: PlaygroundState = {
  objects: [],
  scores: [0, 0],
  timeLeft: null,
  say: '',
  showScoreboard: false,
}

/**
 * Draws a bamboo: two green stalks, from the top and from the bottom of the stage, with the opening between them at
 * the object's y.
 * @param ctx The canvas.
 * @param o The bamboo, in stage units.
 * @param width The canvas width in CSS pixels.
 * @param height The canvas height in CSS pixels.
 */
const drawBamboo = (ctx: CanvasRenderingContext2D, o: PlaygroundObject, width: number, height: number) => {
  const scale = width / STAGE_WIDTH
  const w = BAMBOO_WIDTH * scale
  const cx = (o.x / STAGE_WIDTH + 0.5) * width
  const gapTop = (0.5 - (o.y + o.size / 2) / STAGE_HEIGHT) * height
  const gapBottom = (0.5 - (o.y - o.size / 2) / STAGE_HEIGHT) * height
  const stalk = (top: number, bottom: number) => {
    if (bottom <= top) return
    ctx.fillStyle = '#4d7c0f'
    ctx.fillRect(cx - w / 2, top, w, bottom - top)
    ctx.fillStyle = '#84cc16'
    ctx.fillRect(cx - w / 2 + w * 0.15, top, w * 0.3, bottom - top)
    // Nodes every 40 stage units, as on a real stalk
    ctx.fillStyle = '#365314'
    for (let y = top + 20 * scale; y < bottom; y += 40 * scale) ctx.fillRect(cx - w / 2, y, w, 3 * scale)
  }
  stalk(0, gapTop)
  stalk(gapBottom, height)
}

/**
 * Draws the tracked hands and body and the playground's objects on the canvas over the camera picture, resizing the
 * canvas to its element first.
 * @param canvas The overlay.
 * @param results The latest frame from the tracker, or null while there is none.
 * @param mirror Whether the picture is mirrored.
 * @param playground The objects to draw.
 * @param labels The text to draw under a hand for each gesture.
 * @param base Prefix of the static asset paths, for the objects' pictures.
 */
export const drawPlayground = (
  canvas: HTMLCanvasElement,
  results: VisionFrame | null,
  mirror: boolean,
  playground: PlaygroundState,
  labels: Partial<Record<Gesture, string>>,
  base: string,
) => {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width === 0 || height === 0) return
  const dpr = window.devicePixelRatio || 1
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('drawPlayground: the canvas has no 2D context')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const scale = width / STAGE_WIDTH
  const px = (p: Landmark) => (mirror ? 1 - p.x : p.x) * width
  const py = (p: Landmark) => p.y * height

  // Hands: the skeleton in the extension's purple, the index tip ringed since most blocks use it
  for (const hand of results?.hands ?? []) {
    const pts = hand.landmarks
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.9)'
    ctx.lineWidth = 3
    ctx.beginPath()
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.moveTo(px(pts[a]), py(pts[a]))
      ctx.lineTo(px(pts[b]), py(pts[b]))
    }
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    for (const p of pts) {
      ctx.beginPath()
      ctx.arc(px(p), py(p), 3, 0, Math.PI * 2)
      ctx.fill()
    }
    const tip = pts[8]
    ctx.strokeStyle = '#facc15'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(px(tip), py(tip), 10, 0, Math.PI * 2)
    ctx.stroke()
    if (hand.gesture !== 'none') {
      const wrist = pts[0]
      ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`
      ctx.fillStyle = '#facc15'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(labels[hand.gesture] ?? hand.gesture, px(wrist), py(wrist) + 6)
    }
  }

  // The body: the upper skeleton and a ring around the head, in the extension's cyan
  if (results?.pose) {
    const pts = results.pose.landmarks
    // A landmark the model reports no visibility for counts as seen
    const seen = (p: Landmark) => p.visibility === undefined || p.visibility >= 0.5
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.9)'
    ctx.lineWidth = 4
    ctx.beginPath()
    for (const [a, b] of POSE_CONNECTIONS) {
      if (!seen(pts[a]) || !seen(pts[b])) continue
      ctx.moveTo(px(pts[a]), py(pts[a]))
      ctx.lineTo(px(pts[b]), py(pts[b]))
    }
    ctx.stroke()
    const nose = pts[0]
    if (seen(nose)) {
      const ears = Math.hypot(px(pts[7]) - px(pts[8]), py(pts[7]) - py(pts[8]))
      ctx.beginPath()
      ctx.arc(px(nose), py(nose), Math.max(12, ears * 0.75), 0, Math.PI * 2)
      ctx.stroke()
      // The line of the eyes shows the lean
      ctx.beginPath()
      ctx.moveTo(px(pts[2]), py(pts[2]))
      ctx.lineTo(px(pts[5]), py(pts[5]))
      ctx.stroke()
    }
  }

  // Objects, as pictures sized in stage units
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const o of playground.objects) {
    if (o.kind === 'bamboo') {
      drawBamboo(ctx, o, width, height)
      continue
    }
    const x = (o.x / STAGE_WIDTH + 0.5) * width
    const y = (0.5 - o.y / STAGE_HEIGHT) * height
    const img = objectImage(o.kind, base)
    if (img) {
      drawPicture(ctx, img, o, x, y, o.size * scale)
      continue
    }
    ctx.font = `${Math.round(o.size * scale)}px serif`
    ctx.fillText(PICTURES[o.kind] ?? '🏀', x, y)
  }
}
