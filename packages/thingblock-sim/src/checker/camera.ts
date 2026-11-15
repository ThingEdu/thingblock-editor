// packages/thingblock-sim/src/checker/camera.ts
/**
 * Grade Camera AI rules against what the playground shows: the camera, the hands the tracker sees and the
 * objects, scores and message the program put on the playground. The editor builds the snapshot from the
 * VM's Camera AI events; the lesson fixtures build it the same way from a headless VM. Messages are for the
 * learner and say what the playground shows, never "wrong".
 */
import type { RuleResult } from './evaluate'
import type { CameraRule, CompareOp, HandPart } from './rules'

/** The Scratch-sized stage the playground uses: x −240…240, y −180…180. */
const STAGE_WIDTH = 480
const STAGE_HEIGHT = 360
/** How far past an object's picture a hand part still touches it, as the extension's touch blocks judge. */
const TOUCH_MARGIN = 14

export interface StagePoint {
  x: number
  y: number
}

/** A hand on the stage: its gesture and the parts the rules name. */
export interface StageHand {
  gesture: string
  parts: Record<HandLandmarkPart, StagePoint>
}

/** The head on the stage: the nose, the lean in degrees (+ to the right), about half its width. */
export interface StageHead {
  x: number
  y: number
  tilt: number
  radius: number
}

export interface CameraSnapshot {
  cameraOn: boolean
  hands: StageHand[]
  head: StageHead | null
  /** The movements the playground saw lately ('flap', 'nod'). */
  motions: string[]
  objects: { name: string; x: number; y: number; size: number }[]
  scores: [number, number]
  say: string
}

/** One frame of the tracker's results, as the playground panel sends it to the VM. */
export interface VisionResults {
  hands: { gesture: string; landmarks: { x: number; y: number }[] }[]
  pose?: { landmarks: { x: number; y: number; visibility?: number }[] } | null
  mirror: boolean
}

type HandLandmarkPart = Exclude<HandPart, 'head'>
const PART_LANDMARKS: Record<HandLandmarkPart, number[]> = { indexTip: [8], palm: [0, 5, 9, 13, 17], wrist: [0] }

/**
 * The head on the stage, as the extension's head blocks see it: the nose, leaning by the line of the eyes.
 * @param results The tracker's latest frame.
 * @returns The head, or null without a pose or with the nose unseen.
 */
export function headOnStage(results: VisionResults): StageHead | null {
  const pts = results.pose?.landmarks
  const seen = (i: number) => {
    const p = pts?.[i]
    return p && (p.visibility ?? 1) >= 0.5 ? p : null
  }
  const toStage = (p: { x: number; y: number }): StagePoint => ({
    x: Math.round(((results.mirror ? 1 - p.x : p.x) - 0.5) * STAGE_WIDTH),
    y: Math.round((0.5 - p.y) * STAGE_HEIGHT),
  })
  const noseSeen = seen(0)
  if (!noseSeen) return null
  const nose = toStage(noseSeen)
  const a = seen(2)
  const b = seen(5)
  if (!a || !b) return { ...nose, tilt: 0, radius: 30 }
  const [p, q] = [toStage(a), toStage(b)].sort((u, w) => u.x - w.x)
  const tilt = Math.round((Math.atan2(p.y - q.y, q.x - p.x) * 180) / Math.PI)
  return { ...nose, tilt, radius: Math.max(20, Math.hypot(q.x - p.x, q.y - p.y) * 1.6) }
}

/** A lean counts from this many degrees, as the extension's head blocks judge it. */
const TILT_ON = 15

/**
 * The tracked hands on the stage, mirrored like the picture, as the extension's blocks place them.
 * @param results The tracker's latest frame.
 * @returns One entry per hand.
 */
export function handsOnStage(results: VisionResults): StageHand[] {
  const toStage = (indices: number[], landmarks: { x: number; y: number }[]): StagePoint => {
    let x = 0
    let y = 0
    for (const i of indices) {
      x += landmarks[i].x
      y += landmarks[i].y
    }
    const nx = x / indices.length
    const sx = results.mirror ? 1 - nx : nx
    return { x: Math.round((sx - 0.5) * STAGE_WIDTH), y: Math.round((0.5 - y / indices.length) * STAGE_HEIGHT) }
  }
  return results.hands.map((hand) => ({
    gesture: hand.gesture,
    parts: {
      indexTip: toStage(PART_LANDMARKS.indexTip, hand.landmarks),
      palm: toStage(PART_LANDMARKS.palm, hand.landmarks),
      wrist: toStage(PART_LANDMARKS.wrist, hand.landmarks),
    },
  }))
}

const PASS: RuleResult = { ok: true, message: '' }
const fail = (message: string): RuleResult => ({ ok: false, message })

const GESTURE_NAMES: Record<string, string> = {
  fist: 'nắm tay',
  open: 'xòe tay',
  victory: 'chữ V',
  point_up: 'chỉ lên',
  thumb_up: 'giơ ngón cái',
  thumb_down: 'chúc ngón cái',
  i_love_you: 'I love you',
}

const PART_NAMES: Record<HandLandmarkPart, string> = { indexTip: 'ngón trỏ', palm: 'lòng bàn tay', wrist: 'cổ tay' }

const NO_HEAD =
  'Sân chơi chưa thấy đầu em. Em hãy đứng trước camera cho thấy mặt và vai, hoặc di chuột trên sân chơi.'
const LEAN_NAMES = { left: 'nghiêng sang trái', right: 'nghiêng sang phải', straight: 'giữ thẳng' }
const MOTION_ASK = {
  flap: 'Em hãy giơ hai tay lên cao rồi vỗ mạnh xuống (chơi bằng chuột: bấm phím cách).',
  nod: 'Em hãy gật đầu chậm một lần (chơi bằng chuột: bấm phím ↓).',
}

const COMPARE: Record<CompareOp, (seen: number, n: number) => boolean> = {
  '<': (seen, n) => seen < n,
  '≤': (seen, n) => seen <= n,
  '>': (seen, n) => seen > n,
  '≥': (seen, n) => seen >= n,
  '=': (seen, n) => seen === n,
}

const NO_HAND = 'Sân chơi chưa thấy bàn tay nào. Em hãy giơ tay trước camera, hoặc di chuột trên sân chơi.'

const check = (rule: CameraRule, s: CameraSnapshot): RuleResult => {
  switch (rule.kind) {
    case 'cameraOn':
      return s.cameraOn ? PASS : fail('Camera chưa bật.')
    case 'handSeen':
      return s.hands.length > 0 ? PASS : fail(NO_HAND)
    case 'gesture': {
      if (!s.hands.length) return fail(NO_HAND)
      return s.hands.some((h) => h.gesture === rule.gesture)
        ? PASS
        : fail(`Em hãy làm cử chỉ ${GESTURE_NAMES[rule.gesture]}.`)
    }
    case 'object':
      return s.objects.some((o) => o.name === rule.name) ? PASS : fail(`Sân chơi chưa có vật tên "${rule.name}".`)
    case 'touch': {
      const o = s.objects.find((obj) => obj.name === rule.name)
      if (!o) return fail(`Sân chơi chưa có vật tên "${rule.name}".`)
      if (rule.part === 'head') {
        if (!s.head) return fail(NO_HEAD)
        const near = Math.hypot(s.head.x - o.x, s.head.y - o.y) <= o.size / 2 + s.head.radius + TOUCH_MARGIN
        return near ? PASS : fail(`"${rule.name}" chưa chạm đầu em.`)
      }
      if (!s.hands.length) return fail(NO_HAND)
      const reach = o.size / 2 + TOUCH_MARGIN
      const part = rule.part
      const touching = s.hands.some((h) => Math.hypot(h.parts[part].x - o.x, h.parts[part].y - o.y) <= reach)
      return touching ? PASS : fail(`"${rule.name}" chưa chạm ${PART_NAMES[rule.part]} của em.`)
    }
    case 'score': {
      const seen = s.scores[rule.player - 1]
      return COMPARE[rule.op](seen, rule.n)
        ? PASS
        : fail(`Điểm người chơi ${rule.player} đang là ${seen}. Bước này cần ${rule.op} ${rule.n}.`)
    }
    case 'say':
      return s.say.includes(rule.text) ? PASS : fail(`Sân chơi chưa nói "${rule.text}".`)
    case 'headSeen':
      return s.head ? PASS : fail(NO_HEAD)
    case 'headTilt': {
      if (!s.head) return fail(NO_HEAD)
      const { tilt } = s.head
      const ok =
        rule.dir === 'left' ? tilt <= -TILT_ON : rule.dir === 'right' ? tilt >= TILT_ON : Math.abs(tilt) < TILT_ON
      return ok ? PASS : fail(`Em hãy ${LEAN_NAMES[rule.dir]} đầu, thật chậm.`)
    }
    case 'motion':
      return s.motions.includes(rule.motion) ? PASS : fail(MOTION_ASK[rule.motion])
  }
}

/**
 * Grade a step's Camera AI rules.
 * @param rules The step's rules, all Camera AI rules.
 * @param snapshot What the playground shows now.
 * @returns One result per rule, in order.
 */
export function evaluateCameraRules(rules: readonly CameraRule[], snapshot: CameraSnapshot): RuleResult[] {
  return rules.map((rule) => check(rule, snapshot))
}
