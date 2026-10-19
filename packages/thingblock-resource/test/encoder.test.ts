import { describe, expect, it } from 'vitest'
import { registerBlocks } from '../src/extensions/peripheral/encoder/blocks'
import { registerGenerators } from '../src/extensions/peripheral/encoder/generator'
import encoderManifest from '../src/extensions/peripheral/encoder/manifest'
import encoderToolbox from '../src/extensions/peripheral/encoder/toolbox'
import type { ArduinoGenerator, ArduinoOrder, Blockly } from '../src/shared/types'

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

const blockIds = ['encoder_init', 'encoder_readPosition', 'encoder_resetPosition', 'encoder_isPressed']

describe('encoder blocks', () => {
  it('defines the init, position, reset and button blocks', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    expect(Object.keys(Blocks).sort()).toEqual([...blockIds].sort())
  })
})

describe('encoder generator', () => {
  it('pulls up all three pins and interrupts on both phases', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.encoder_init(makeBlock({ PIN_A: 2, PIN_B: 10, PIN_BTN: 7 })) as string

    expect(code).toContain('encoder_pinA = 2;\nencoder_pinB = 10;\nencoder_pinBtn = 7;\n')
    for (const pin of [2, 10, 7]) expect(code).toContain(`pinMode(${pin}, INPUT_PULLUP);`)
    expect(code).toContain('attachInterrupt(digitalPinToInterrupt(2), encoder_isr, CHANGE);')
    expect(code).toContain('attachInterrupt(digitalPinToInterrupt(10), encoder_isr, CHANGE);')
    // The handler compares against the state the pins were in before the first edge, so it
    // must be sampled before the interrupts are attached.
    expect(code.indexOf('encoder_state =')).toBeLessThan(code.indexOf('attachInterrupt'))
  })

  it('emits the shared handler once, however many encoder blocks the project uses', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.encoder_init(makeBlock())
    gen.forBlock.encoder_readPosition(makeBlock())
    gen.forBlock.encoder_isPressed(makeBlock())

    expect([...gen.globals.keys()]).toEqual(['encoder'])
    expect(gen.globals.get('encoder')).toContain('void IRAM_ATTR encoder_isr()')
  })

  // The `.ino` preprocessor inserts a prototype for every function ahead of the first function body in
  // the sketch, which can precede the globals bucket. Any macro in the handler's signature must
  // therefore come from the includes bucket, which is emitted before all code.
  it('defines the ISR attribute in the includes bucket, not beside the handler', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.encoder_init(makeBlock())

    expect(gen.includes.get('encoder')).toBe('#ifndef IRAM_ATTR\n#define IRAM_ATTR\n#endif')
    expect(gen.globals.get('encoder')).not.toContain('#define')
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

  it('reports position and a pressed button (active LOW against the pull-up)', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.encoder_readPosition(makeBlock())).toEqual(['encoder_position()', Order.ATOMIC])
    expect(gen.forBlock.encoder_isPressed(makeBlock())).toEqual([
      '(digitalRead(encoder_pinBtn) == LOW)',
      Order.ATOMIC,
    ])
    expect(gen.forBlock.encoder_resetPosition(makeBlock())).toBe('encoder_reset();\n')
  })

  it('falls back to the ThingBot wiring when a pin field is empty', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.encoder_init(makeBlock()) as string

    expect(code).toContain('encoder_pinA = 2;\nencoder_pinB = 10;\nencoder_pinBtn = 7;\n')
  })
})

describe('encoder resource pack', () => {
  it('declares its served modules and icon, and vendors no library', () => {
    expect(encoderManifest).toMatchObject({
      id: 'encoder',
      kind: 'peripheral',
      icon: './icon.png',
      blocks: './blocks.js',
      generator: './generator.js',
      toolbox: './toolbox.js',
    })
    expect(encoderManifest.libs).toBeUndefined()
  })

  it('lists every block in the toolbox', () => {
    expect(encoderToolbox.contents.map(({ type }) => type)).toEqual(blockIds)
  })
})
