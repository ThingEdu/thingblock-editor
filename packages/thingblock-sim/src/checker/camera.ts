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
  parts: Record<HandPart, StagePoint>
}

export interface CameraSnapshot {
  cameraOn: boolean
  hands: StageHand[]
  objects: { name: string; x: number; y: number; size: number }[]
  scores: [number, number]
  say: string
}

/** One frame of the tracker's results, as the playground panel sends it to the VM. */
export interface VisionResults {
  hands: { gesture: string; landmarks: { x: number; y: number }[] }[]
  mirror: boolean
}

const PART_LANDMARKS: Record<HandPart, number[]> = { indexTip: [8], palm: [0, 5, 9, 13, 17], wrist: [0] }

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

const PART_NAMES: Record<HandPart, string> = { indexTip: 'ngón trỏ', palm: 'lòng bàn tay', wrist: 'cổ tay' }

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
      if (!s.hands.length) return fail(NO_HAND)
      const reach = o.size / 2 + TOUCH_MARGIN
      const touching = s.hands.some(
        (h) => Math.hypot(h.parts[rule.part].x - o.x, h.parts[rule.part].y - o.y) <= reach,
      )
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
