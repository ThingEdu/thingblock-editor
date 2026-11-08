import { describe, expect, it } from 'vitest'
import { registerGenerators } from '../src/extensions/peripheral/encoder/generator'
import type { ArduinoGenerator, ArduinoOrder } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

const makeGenerator = () => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  valueToCode: () => '',
})

const makeBlock = (fields: Record<string, string | number> = {}) => ({
  getFieldValue: (name: string) => fields[name],
})

describe('encoder generator', () => {
  it('emits the shared handler once, however many encoder blocks the project uses', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.encoder_init(makeBlock())
    gen.forBlock.encoder_readPosition(makeBlock())
    gen.forBlock.encoder_isPressed(makeBlock())

    expect([...gen.globals.keys()]).toEqual(['encoder'])
    expect(gen.globals.get('encoder')).toContain('void IRAM_ATTR encoder_isr()')
  })

  it('counts whole detents: four quarter steps make one click in either direction', () => {
    const handler = (() => {
      const gen = makeGenerator()
      registerGenerators(gen as unknown as ArduinoGenerator, Order)
      gen.forBlock.encoder_resetPosition(makeBlock())
      return gen.globals.get('encoder') ?? ''
    })()

    expect(handler).toContain('if (encoder_steps >= 4) {\n    encoder_count++;')
    expect(handler).toContain('} else if (encoder_steps <= -4) {\n    encoder_count--;')
  })
})
