import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/** The worker entry installs itself on the global scope; stand in for the page on the other side. */
const scope = globalThis as unknown as {
  postMessage: (m: unknown) => void
  onmessage: ((e: { data: unknown }) => void) | null
}
const sent: { type: string }[] = []

describe('worker', () => {
  beforeAll(async () => {
    scope.postMessage = (m) => sent.push(m as { type: string })
    await import('../src/worker')
  })
  afterAll(() => {
    scope.onmessage?.({ data: { type: 'stop' } })
  })

  it('answers Run and Step with idle when no program is loaded, so the page knows it is alive', () => {
    sent.length = 0
    scope.onmessage?.({ data: { type: 'run' } })
    scope.onmessage?.({ data: { type: 'step' } })
    expect(sent.map((m) => m.type)).toEqual(['idle', 'idle'])
  })

  it('answers Step into a project with no blocks instead of hanging', () => {
    sent.length = 0
    scope.onmessage?.({
      data: { type: 'load', code: 'function* setup() {} function* loop() {} return { setup, loop };' },
    })
    scope.onmessage?.({ data: { type: 'step' } })
    expect(sent.map((m) => m.type)).toEqual(['snapshot', 'snapshot'])
  })
})
