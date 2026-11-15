import { describe, expect, it } from 'vitest'
import { registerBlocks } from '../src/extensions/peripheral/colourSensor/blocks'
import { CHANNELS, COLOUR_NAMES, COLOURS } from '../src/extensions/peripheral/colourSensor/colours'
import { registerGenerators } from '../src/extensions/peripheral/colourSensor/generator'
import manifest from '../src/extensions/peripheral/colourSensor/manifest'
import { registerSimGenerators, SIM_HELPERS } from '../src/extensions/peripheral/colourSensor/sim'
import toolbox from '../src/extensions/peripheral/colourSensor/toolbox'
import type { ArduinoGenerator, ArduinoOrder, Blockly, SimGenerator } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

const makeGenerator = () => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  typeFor: {} as Record<string, () => string>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  valueToCode: () => '',
})

const makeBlock = (fields: Record<string, string> = {}) => ({ getFieldValue: (name: string) => fields[name] })

const arduino = () => {
  const gen = makeGenerator()
  registerGenerators(gen as unknown as ArduinoGenerator, Order)
  return gen
}

/**
 * The simulator's colour rules run on a reading.
 * @param raw Red, green, blue and clear.
 * @returns The colour name they give.
 */
const nameOf = (raw: [number, number, number, number]): string => {
  const $ = { analogRead: (key: string) => raw[Number(key.split('_')[1])] }
  // The simulator runs its generated code the same way (thingblock-sim `headless.ts`).
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- runs the helpers as the simulator would
  return new Function('$', `${SIM_HELPERS}\nreturn colourSensorName();`)($) as string
}

describe('colour sensor blocks', () => {
  it('defines start, read, is and name', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    expect(Object.keys(Blocks).sort()).toEqual([
      'colourSensor_init',
      'colourSensor_is',
      'colourSensor_name',
      'colourSensor_read',
    ])
  })

  it('codes every colour it names, and names every code', () => {
    expect(COLOURS.map(([, code]) => Number(code)).sort()).toEqual([0, 1, 2, 3, 4, 5])
    expect(COLOUR_NAMES).toHaveLength(6)
  })
})

describe('colour sensor generator', () => {
  it('starts the TCS34725 once, in setup, whichever block comes first', () => {
    const gen = arduino()
    gen.forBlock.colourSensor_read(makeBlock({ CHANNEL: '0' }))
    gen.forBlock.colourSensor_is(makeBlock({ COLOUR: '1' }))
    expect(gen.includes.get('colourSensor')).toBe('#include <Wire.h>\n#include <Adafruit_TCS34725.h>')
    expect(gen.setups.get('colourSensor')).toBe('colourTcs.begin();  // khởi động cảm biến màu')
    expect(gen.globals.get('colourSensor')).toContain('TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X')
    expect(gen.forBlock.colourSensor_init(makeBlock())).toBe('')
  })

  it('explains each colour rule in Vietnamese, as the learner reads it in the code panel', () => {
    const gen = arduino()
    gen.forBlock.colourSensor_init(makeBlock())
    const code = gen.globals.get('colourSensor') ?? ''
    expect(code).toContain('// Đoán màu đang thấy, trả về mã: 0 đen, 1 đỏ, 2 xanh lá, 3 xanh dương, 4 vàng, 5 trắng.')
    expect(code).toContain('return 0;  // quá ít ánh sáng hắt về: đen')
    expect(code).toContain('return 4;  // đỏ và xanh lá cùng nhiều: vàng')
    // Comments never swallow code: every statement line still ends in `;`, `{` or `}` before any comment.
    for (const line of code.split('\n')) {
      const statement = line.split('//')[0].trim()
      if (statement) expect(statement).toMatch(/[;{}]$|^#define /)
    }
  })

  it('reads the data registers without the library wait', () => {
    const gen = arduino()
    gen.forBlock.colourSensor_init(makeBlock())
    expect(gen.globals.get('colourSensor')).toContain('colourTcs.read16(TCS34725_CDATAL)')
    expect(gen.globals.get('colourSensor')).not.toContain('getRawData')
  })

  it('reads one channel by index, clamped', () => {
    for (const [, channel] of CHANNELS)
      expect(arduino().forBlock.colourSensor_read(makeBlock({ CHANNEL: channel }))).toEqual([
        `colourSensorRead(${channel})`,
        Order.ATOMIC,
      ])
    expect(arduino().forBlock.colourSensor_read(makeBlock({ CHANNEL: '9' }))).toEqual([
      'colourSensorRead(3)',
      Order.ATOMIC,
    ])
  })

  it('compares the colour code, and names it in Vietnamese', () => {
    const gen = arduino()
    expect(gen.forBlock.colourSensor_is(makeBlock({ COLOUR: '4' }))).toEqual([
      '(colourSensorClass() == 4)',
      Order.ATOMIC,
    ])
    expect(gen.forBlock.colourSensor_name(makeBlock())).toEqual(['colourSensorName()', Order.ATOMIC])
    expect(gen.globals.get('colourSensor')).toContain('"đen", "đỏ", "xanh lá", "xanh dương", "vàng", "trắng"')
  })
})

describe('colour sensor simulator codegen', () => {
  const sim = () => {
    const gen = makeGenerator()
    registerSimGenerators(gen as unknown as SimGenerator, Order)
    return gen
  }

  it('reads each channel from its rig input', () => {
    for (const [, channel] of CHANNELS)
      expect(sim().forBlock.colourSensor_read(makeBlock({ CHANNEL: channel }))).toEqual([
        `$.analogRead("colour_${channel}")`,
        Order.ATOMIC,
      ])
  })

  it('types its reporters for the C++ checks', () => {
    const gen = sim()
    expect([gen.typeFor.colourSensor_read(), gen.typeFor.colourSensor_is(), gen.typeFor.colourSensor_name()]).toEqual(
      ['int', 'bool', 'String'],
    )
  })

  it('names colours by the rules the Arduino code uses', () => {
    expect(nameOf([0, 0, 0, 0])).toBe('đen')
    expect(nameOf([120, 110, 100, 350])).toBe('đen') // too little light
    expect(nameOf([700, 650, 600, 1000])).toBe('đen') // even but dim: dark grey
    expect(nameOf([3400, 3300, 3000, 9800])).toBe('trắng')
    expect(nameOf([3000, 900, 800, 4800])).toBe('đỏ')
    expect(nameOf([800, 1700, 1100, 3600])).toBe('xanh lá')
    expect(nameOf([600, 1100, 2000, 3700])).toBe('xanh dương')
    expect(nameOf([2800, 2400, 700, 6000])).toBe('vàng')
  })
})

describe('colour rules on the board and in the simulator', () => {
  it('share every threshold and test', () => {
    const gen = arduino()
    gen.forBlock.colourSensor_init(makeBlock())
    const board = gen.globals.get('colourSensor') ?? ''
    for (const rule of ['rp + gp >= 75', 'abs(rp - gp) <= 15', 'if (rp ', 'if (gp ']) {
      expect(board).toContain(rule)
      expect(SIM_HELPERS).toContain(rule)
    }
    expect(board).toContain('#define COLOUR_DARK 400')
    expect(SIM_HELPERS).toContain('c < 400')
    expect(board).toContain('#define COLOUR_WHITE 1500')
    expect(SIM_HELPERS).toContain('c >= 1500')
    expect(board).toContain('#define COLOUR_EVEN 12')
    expect(SIM_HELPERS).toContain('hi - lo <= 12')
  })
})

describe('colour sensor resource pack', () => {
  it('is a library pack with its vendored drivers and simulator', () => {
    expect(manifest).toMatchObject({
      id: 'colourSensor',
      kind: 'peripheral',
      blocks: './blocks.js',
      generator: './generator.js',
      sim: './sim.js',
      toolbox: './toolbox.js',
      libs: [{ path: 'libs/Adafruit_TCS34725' }, { path: 'libs/Adafruit_BusIO' }],
    })
    expect(manifest.hidden).toBeUndefined()
    expect(toolbox.contents.map((c) => c.type)).toEqual([
      'colourSensor_init',
      'colourSensor_read',
      'colourSensor_is',
      'colourSensor_name',
    ])
  })
})
