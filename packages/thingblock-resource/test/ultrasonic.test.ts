import { describe, expect, it } from 'vitest'
import { registerBlocks } from '../src/extensions/peripheral/ultrasonic/blocks'
import { registerGenerators } from '../src/extensions/peripheral/ultrasonic/generator'
import ultrasonicManifest from '../src/extensions/peripheral/ultrasonic/manifest'
import ultrasonicToolbox from '../src/extensions/peripheral/ultrasonic/toolbox'
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

describe('ultrasonic blocks', () => {
  it('defines ultrasonic_readDistance on the injected Blockly', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    expect(Blocks.ultrasonic_readDistance).toBeDefined()
  })
})

describe('ultrasonic generator', () => {
  it('emits the include and one Ultrasonic object per TRIG/ECHO pair', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.ultrasonic_readDistance(makeBlock({ TRIG: 2, ECHO: 3, UNIT: 'CM' }))

    expect(code).toEqual(['ultrasonic_2_3.read(CM)', Order.ATOMIC])
    expect(gen.includes.get('ultrasonic')).toBe('#include <Ultrasonic.h>')
    expect(gen.globals.get('ultrasonic_2_3')).toBe('Ultrasonic ultrasonic_2_3(2, 3);')
  })

  it('falls back to default pins and cm unit when inputs are empty', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.ultrasonic_readDistance(makeBlock())

    expect(code).toEqual(['ultrasonic_2_3.read(CM)', Order.ATOMIC])
  })
})

describe('ultrasonic resource pack', () => {
  it('declares its served modules, icon, and vendored library', () => {
    expect(ultrasonicManifest).toMatchObject({
      id: 'ultrasonic',
      kind: 'peripheral',
      icon: './icon.png',
      blocks: './blocks.js',
      generator: './generator.js',
      toolbox: './toolbox.js',
      libs: [{ path: 'libs/Ultrasonic' }],
    })
  })

  it('toolbox references the block type', () => {
    expect(ultrasonicToolbox.colour).toBe('#D39DDB')
    expect(ultrasonicToolbox.contents).toEqual([{ kind: 'block', type: 'ultrasonic_readDistance' }])
  })
})
