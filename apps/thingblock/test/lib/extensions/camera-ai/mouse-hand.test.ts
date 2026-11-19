import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Hand, Pose, VisionFrame } from '../../../../src/lib/extensions/camera-ai/hand-tracker'
import {
  MOUSE_GESTURES,
  flapPoints,
  gestureForKey,
  mouseHand,
  mousePose,
  nextGesture,
  pointerPosition,
  trackMouse,
} from '../../../../src/lib/extensions/camera-ai/mouse-hand'

const INDEX_TIP = 8
const WRIST = 0
const PALM = [0, 5, 9, 13, 17]

const near = (a: number, b: number) => {
  expect(Math.abs(a - b)).toBeLessThan(1e-9)
}

describe('mouseHand', () => {
  test('has the 21 landmarks of a MediaPipe hand, inside the frame for a pointer in the middle', () => {
    for (const gesture of MOUSE_GESTURES) {
      const hand = mouseHand({ x: 0.5, y: 0.5, gesture, mirror: false })
      expect(hand.gesture).toBe(gesture)
      expect(hand.landmarks).toHaveLength(21)
      for (const p of hand.landmarks) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
        expect(p.x).toBeGreaterThan(0)
        expect(p.x).toBeLessThan(1)
        expect(p.y).toBeGreaterThan(0)
        expect(p.y).toBeLessThan(1)
      }
    }
  })

  test("puts the open hand's index fingertip on the pointer, the wrist below it", () => {
    const hand = mouseHand({ x: 0.3, y: 0.4, gesture: 'open', mirror: false })
    near(hand.landmarks[INDEX_TIP].x, 0.3)
    near(hand.landmarks[INDEX_TIP].y, 0.4)
    expect(hand.landmarks[WRIST].y).toBeGreaterThan(0.5)
  })

  test('a mirrored view stores the frame point the camera would see, so blocks and drawing agree', () => {
    const hand = mouseHand({ x: 0.3, y: 0.4, gesture: 'open', mirror: true })
    near(hand.landmarks[INDEX_TIP].x, 0.7)
    near(hand.landmarks[INDEX_TIP].y, 0.4)
  })

  test('a fist keeps the wrist in place and curls the index finger towards the palm', () => {
    const open = mouseHand({ x: 0.5, y: 0.5, gesture: 'open', mirror: false })
    const fist = mouseHand({ x: 0.5, y: 0.5, gesture: 'fist', mirror: false })
    near(fist.landmarks[WRIST].x, open.landmarks[WRIST].x)
    near(fist.landmarks[WRIST].y, open.landmarks[WRIST].y)
    const palmY = PALM.reduce((sum, i) => sum + fist.landmarks[i].y, 0) / PALM.length
    const reach = (hand: Hand) => Math.abs(hand.landmarks[INDEX_TIP].y - palmY)
    expect(reach(fist)).toBeLessThan(reach(open) / 2)
  })

  test('an unknown gesture draws an open hand', () => {
    expect(mouseHand({ x: 0.5, y: 0.5, gesture: 'wave', mirror: false }).gesture).toBe('open')
  })
})

describe('pointer mapping', () => {
  const rect = { left: 100, top: 50, width: 400, height: 300 }

  test('maps the pointer to fractions of the playground', () => {
    expect(pointerPosition({ clientX: 300, clientY: 200 }, rect)).toEqual({ x: 0.5, y: 0.5 })
    expect(pointerPosition({ clientX: 100, clientY: 350 }, rect)).toEqual({ x: 0, y: 1 })
  })

  test('is null outside the playground or before it has a size', () => {
    expect(pointerPosition({ clientX: 99, clientY: 200 }, rect)).toBeNull()
    expect(pointerPosition({ clientX: 300, clientY: 351 }, rect)).toBeNull()
    expect(pointerPosition({ clientX: 0, clientY: 0 }, { left: 0, top: 0, width: 0, height: 0 })).toBeNull()
  })

  test('the right button steps through the gestures but never to the fist', () => {
    const seen: string[] = []
    let g: (typeof MOUSE_GESTURES)[number] = 'open'
    MOUSE_GESTURES.forEach(() => {
      g = nextGesture(g)
      seen.push(g)
    })
    expect(seen).not.toContain('fist')
    expect(seen[seen.length - 1]).toBe('victory')
    expect(nextGesture('fist')).toBe('open')
  })

  test('number keys 1–7 pick a gesture, other keys none', () => {
    expect(gestureForKey('1')).toBe('open')
    expect(gestureForKey('2')).toBe('victory')
    expect(gestureForKey('7')).toBe('fist')
    expect(gestureForKey('0')).toBeNull()
    expect(gestureForKey('8')).toBeNull()
    expect(gestureForKey('a')).toBeNull()
  })
})

describe('mousePose', () => {
  const NOSE = 0
  const LEFT_EYE = 2
  const RIGHT_EYE = 5
  test('has the 33 landmarks of a MediaPipe pose, the nose on the pointer and the shoulders below', () => {
    const { landmarks } = mousePose({ x: 0.4, y: 0.3, mirror: false })
    expect(landmarks).toHaveLength(33)
    near(landmarks[NOSE].x, 0.4)
    near(landmarks[NOSE].y, 0.3)
    expect(landmarks[11].y).toBeGreaterThan(0.4)
    expect(landmarks[NOSE].visibility).toBeGreaterThan(0.5)
  })

  test("a lean right lowers the eye on the viewer's right; mirroring stores the frame point", () => {
    const eyes = (p: Pose) => [p.landmarks[LEFT_EYE], p.landmarks[RIGHT_EYE]].sort((a, b) => a.x - b.x)
    const [l, r] = eyes(mousePose({ x: 0.5, y: 0.4, tilt: 25, mirror: false }))
    expect(r.y).toBeGreaterThan(l.y)
    const mirrored = mousePose({ x: 0.3, y: 0.4, mirror: true })
    near(mirrored.landmarks[NOSE].x, 0.7)
  })

  test('a nod dips the head towards the shoulders, which stay', () => {
    const up = mousePose({ x: 0.5, y: 0.4, mirror: false }).landmarks
    const down = mousePose({ x: 0.5, y: 0.4, nod: 1, mirror: false }).landmarks
    expect(down[NOSE].y - up[NOSE].y).toBeGreaterThan(0.05)
    near(down[11].y, up[11].y)
  })

  test('raised arms put the wrists where the flapping hands are', () => {
    const wrists = [
      { x: 0.3, y: 0.2 },
      { x: 0.7, y: 0.2 },
    ]
    const { landmarks } = mousePose({ x: 0.5, y: 0.4, wrists, mirror: false })
    const both = [landmarks[15], landmarks[16]].sort((a, b) => a.x - b.x)
    near(both[0].x, 0.3)
    near(both[1].y, 0.2)
  })

  test('a flap takes both hands from the top to the middle', () => {
    expect(flapPoints(0).map((p) => p.y)).toEqual([0.15, 0.15])
    expect(flapPoints(1)[0].y).toBeCloseTo(0.65)
  })
})

describe('trackMouse', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const playground = () => {
    const element = document.createElement('div')
    element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect
    document.body.appendChild(element)
    return element
  }

  const setup = () => {
    const element = playground()
    const frames: VisionFrame[] = []
    const tracker = trackMouse(
      element,
      (r) => frames.push(r),
      () => false,
    )
    const fire = (target: EventTarget, type: string, init: MouseEventInit) => {
      const e = new MouseEvent(type, { bubbles: true, ...init })
      target.dispatchEvent(e)
      return e
    }
    const last = () => frames[frames.length - 1]
    return { element, frames, tracker, fire, last }
  }

  test('reports no hand until the pointer is on the playground, then a hand that follows it', () => {
    const { element, tracker, fire, last } = setup()
    vi.advanceTimersByTime(40)
    expect(last().hands).toEqual([])

    fire(element, 'pointermove', { clientX: 50, clientY: 50 })
    vi.advanceTimersByTime(40)
    const hand = last().hands[0]
    near(hand.landmarks[INDEX_TIP].x, 0.25)
    near(hand.landmarks[INDEX_TIP].y, 0.5)
    expect(hand.gesture).toBe('open')

    fire(element, 'pointerleave', {})
    vi.advanceTimersByTime(40)
    expect(last().hands).toEqual([])
    tracker.stop()
  })

  test('holding the left button makes a fist; the right button and keys change the gesture', () => {
    const { element, tracker, fire, last } = setup()
    const gesture = () => last().hands[0].gesture
    fire(element, 'pointerdown', { clientX: 50, clientY: 50, button: 0 })
    vi.advanceTimersByTime(40)
    expect(gesture()).toBe('fist')
    fire(window, 'pointerup', { button: 0 })
    vi.advanceTimersByTime(40)
    expect(gesture()).toBe('open')

    const menu = fire(element, 'contextmenu', { cancelable: true, button: 2 })
    expect(menu.defaultPrevented).toBe(true)
    vi.advanceTimersByTime(40)
    expect(gesture()).toBe('victory')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }))
    vi.advanceTimersByTime(40)
    expect(gesture()).toBe('thumb_up')
    tracker.stop()
  })

  test('the space bar flaps both hands down, from the top half to below the middle', () => {
    const { element, tracker, fire, last } = setup()
    fire(element, 'pointermove', { clientX: 50, clientY: 50 })
    vi.advanceTimersByTime(40)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    vi.advanceTimersByTime(40)
    const first = last().hands
    expect(first).toHaveLength(2)
    vi.advanceTimersByTime(280)
    const later = last().hands
    expect(later).toHaveLength(2)
    expect(later[0].landmarks[0].y - first[0].landmarks[0].y).toBeGreaterThan(0.3)
    vi.advanceTimersByTime(200)
    expect(last().hands).toHaveLength(1)
    const up = new KeyboardEvent('keyup', { key: ' ', cancelable: true })
    window.dispatchEvent(up)
    expect(up.defaultPrevented).toBe(true)
    tracker.stop()
  })

  test('in a head game the pointer moves the head, and the arrows lean it', () => {
    const element = playground()
    const frames: VisionFrame[] = []
    const tracker = trackMouse(
      element,
      (r) => frames.push(r),
      () => false,
      () => true,
    )
    const pose = () => {
      const frame = frames[frames.length - 1]
      if (!frame.pose) throw new Error('no pose in the last frame')
      return frame.pose
    }
    element.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 100, clientY: 40 }))
    vi.advanceTimersByTime(40)
    expect(frames[frames.length - 1].hands).toEqual([])
    near(pose().landmarks[0].x, 0.5)
    near(pose().landmarks[0].y, 0.4)
    const key = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true })
    window.dispatchEvent(key)
    expect(key.defaultPrevented).toBe(true)
    const lean = () => {
      const [l, r] = [2, 5].map((i) => pose().landmarks[i]).sort((a, b) => a.x - b.x)
      // Degrees, on a 4:3 frame.
      return (Math.atan2((r.y - l.y) * 0.75, r.x - l.x) * 180) / Math.PI
    }
    vi.advanceTimersByTime(200)
    const early = lean()
    vi.advanceTimersByTime(200)
    expect(lean()).toBeGreaterThan(early)
    expect(early).toBeGreaterThan(0)
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }))
    const kept = lean()
    vi.advanceTimersByTime(300)
    expect(lean()).toBeCloseTo(kept, 5)
    vi.advanceTimersByTime(2000)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    vi.advanceTimersByTime(40)
    expect(Math.abs(lean())).toBeLessThan(0.01)
    // Held long, the lean stops at what a neck should do.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    vi.advanceTimersByTime(3000)
    expect(lean()).toBeCloseTo(-35, 0)
    tracker.stop()
  })

  test('stop ends the frames and the listeners', () => {
    const { element, frames, tracker, fire } = setup()
    tracker.stop()
    const count = frames.length
    fire(element, 'pointermove', { clientX: 50, clientY: 50 })
    vi.advanceTimersByTime(200)
    expect(frames).toHaveLength(count)
  })
})
