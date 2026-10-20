/**
 * Web Worker entry: hosts a Session off the page's main thread, so a busy program can never freeze the
 * editor. The page sends commands; the worker answers every tick (~60 per second) with a snapshot.
 */
import { Session, type Snapshot } from './session'

export type Command =
  | { type: 'load'; code: string }
  | { type: 'run' }
  | { type: 'pause' }
  | { type: 'step' }
  | { type: 'speed'; speed: number }
  | { type: 'input'; key: string; value: number }
  | { type: 'stop' }

export type Message = { type: 'snapshot'; snapshot: Snapshot } | { type: 'error'; message: string }

interface WorkerScope {
  postMessage(message: Message): void
  onmessage: ((event: { data: Command }) => void) | null
}

const scope = globalThis as unknown as WorkerScope
const TICK_MS = 16

let session: Session | null = null
let timer: ReturnType<typeof setInterval> | null = null
let last = 0

const post = (snapshot: Snapshot) => scope.postMessage({ type: 'snapshot', snapshot })

const tick = () => {
  if (!session) return
  const now = performance.now()
  // A tab in the background gets throttled ticks; never try to catch up more than a quarter second.
  const elapsed = Math.min(now - last, 250)
  last = now
  try {
    post(session.tick(elapsed))
  } catch (e) {
    scope.postMessage({ type: 'error', message: e instanceof Error ? e.message : String(e) })
    session.running = false
  }
}

scope.onmessage = ({ data }) => {
  switch (data.type) {
    case 'load':
      try {
        session = new Session(data.code)
        post(session.snapshot())
      } catch (e) {
        session = null
        scope.postMessage({ type: 'error', message: e instanceof Error ? e.message : String(e) })
      }
      break
    case 'run':
      if (!session) return
      session.running = true
      last = performance.now()
      timer ??= setInterval(tick, TICK_MS)
      break
    case 'pause':
      if (session) session.running = false
      break
    case 'step':
      if (session) post(session.step())
      break
    case 'speed':
      if (session) session.speed = data.speed
      break
    case 'input':
      session?.setInput(data.key, data.value)
      break
    case 'stop':
      if (timer) clearInterval(timer)
      timer = null
      session = null
      break
  }
}
