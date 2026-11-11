import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import cobotDevice from '../src/extensions/devices/cobot/manifest'
import { EYES, MOVES, registerBlocks } from '../src/extensions/peripheral/cobot-core/blocks'
import { EYE_PINS, MOTOR_PINS, registerGenerators } from '../src/extensions/peripheral/cobot-core/generator'
import cobotCore from '../src/extensions/peripheral/cobot-core/manifest'
import toolbox from '../src/extensions/peripheral/cobot-core/toolbox'
import colourSensor from '../src/extensions/peripheral/colourSensor/manifest'
import type { ArduinoGenerator, ArduinoOrder, Blockly } from '../src/shared/types'

const Order = { ATOMIC: 0, NONE: 99 } as unknown as ArduinoOrder

const makeGenerator = () => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  valueToCode: (block: { values: Record<string, string> }, name: string) => block.values[name] ?? '',
})

const makeBlock = (fields: Record<string, string> = {}, values: Record<string, string> = {}) => ({
  values,
  getFieldValue: (name: string) => fields[name],
})

const arduino = () => {
  const gen = makeGenerator()
  registerGenerators(gen as unknown as ArduinoGenerator, Order)
  return gen
}

describe('CoBot device', () => {
  it('builds for the ESP32-C3 with USB CDC on boot, so Serial reaches the Monitor', () => {
    expect(cobotDevice).toMatchObject({
      id: 'cobot',
      kind: 'device',
      name: 'CoBot',
      fqbn: 'esp32:esp32:esp32c3',
      compile: { options: { CDCOnBoot: 'cdc' } },
    })
  })

  it('activates its own pack first, then the colour sensor on its base', () => {
    expect(cobotDevice.extensions).toEqual([cobotCore.id, colourSensor.id])
    expect(cobotCore.hidden).toBe(true)
  })

  it('ships its own drawn icon', () => {
    expect(cobotDevice.icon).toBe('./assets/icon.svg')
    expect(existsSync(join(__dirname, '..', 'src', 'extensions', 'devices', 'cobot', 'assets', 'icon.svg'))).toBe(
      true,
    )
  })
})

describe('CoBot blocks', () => {
  it('defines the wheels, eyes and lights', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    expect(Object.keys(Blocks).sort()).toEqual(
      [
        'cobotC3_init',
        'cobotC3_drive',
        'cobotC3_stop',
        'cobotC3_setMotor',
        'cobotC3_setTrim',
        'cobotC3_readEye',
        'cobotC3_onLine',
        'cobotC3_setLine',
        'cobotC3_pattern',
        'cobotC3_patternIs',
        'cobotC3_irLight',
        'cobotC3_whiteLight',
      ].sort(),
    )
    expect(toolbox.contents.map((c) => c.type).sort()).toEqual(Object.keys(Blocks).sort())
  })
})

describe('CoBot generator', () => {
  it('sets the board up once: PWM on the four motor pins, eye lights on, white light off', () => {
    const gen = arduino()
    expect(gen.forBlock.cobotC3_init(makeBlock())).toBe('')
    gen.forBlock.cobotC3_stop(makeBlock())
    expect(gen.setups.size).toBe(1)
    const setup = gen.setups.get('cobot_board')
    for (const pin of ['LEFT_A', 'LEFT_B', 'RIGHT_A', 'RIGHT_B'])
      expect(setup).toContain(`ledcAttach(COBOT_${pin}, 5000, 8);`)
    expect(setup).toContain('digitalWrite(COBOT_IR_LIGHT, HIGH);')
    expect(setup).toContain('digitalWrite(COBOT_WHITE_LIGHT, LOW);')
  })

  it('wires the motors, eyes and lights to the cobot-arduino pins', () => {
    expect(MOTOR_PINS).toEqual({ leftA: 2, leftB: 10, rightA: 6, rightB: 5 })
    expect(EYE_PINS).toEqual([4, 3, 1, 0])
    const globals = arduino()
    globals.forBlock.cobotC3_init(makeBlock())
    const code = globals.globals.get('cobot_board') ?? ''
    // Each define carries a Vietnamese comment for the learner, so match the line up to it.
    for (const line of [
      '#define COBOT_LEFT_A 2 ',
      '#define COBOT_LEFT_B 10 ',
      '#define COBOT_RIGHT_A 6 ',
      '#define COBOT_RIGHT_B 5 ',
      '#define COBOT_IR_LIGHT 21 ',
      '#define COBOT_WHITE_LIGHT 20 ',
      'const uint8_t cobotEyePins[4] = {4, 3, 1, 0};',
      'int cobotLineThreshold = 2000;',
    ])
      expect(code).toContain(line)
  })

  it('explains the generated code in Vietnamese, as the learner reads it in the code panel', () => {
    const gen = arduino()
    gen.forBlock.cobotC3_init(makeBlock())
    const code = gen.globals.get('cobot_board') ?? ''
    const comments = code.split('\n').filter((line) => line.includes('//'))
    expect(comments.length).toBeGreaterThanOrEqual(12)
    expect(code).toContain('// Quay một bánh với tốc độ -100..100 %: tiến thì cấp xung chân A, lùi thì chân B.')
    expect(code).toContain('// Mẫu 4 mắt, từ mắt 1 tới mắt 4: "1" là thấy vạch.')
    expect(gen.setups.get('cobot_board')).toContain(
      'digitalWrite(COBOT_IR_LIGHT, HIGH);  // bật đèn hồng ngoại để 4 mắt nhìn được vạch',
    )
    // Comments never swallow code: every statement line still ends in `;`, `{` or `}` before any comment.
    for (const line of code.split('\n')) {
      const statement = line.split('//')[0].trim()
      if (statement) expect(statement).toMatch(/[;{}]$|^#define /)
    }
  })

  it('moves the car with signed wheel speeds', () => {
    const drive = (move: string) =>
      arduino().forBlock.cobotC3_drive(makeBlock({ MOVE: move }, { SPEED: 'tocDo' })) as string
    expect(MOVES.map(([, move]) => drive(move))).toEqual([
      'cobotWheels(tocDo, tocDo);\n',
      'cobotWheels(-(tocDo), -(tocDo));\n',
      'cobotWheels(0, tocDo);\n',
      'cobotWheels(tocDo, 0);\n',
      'cobotWheels(-(tocDo), tocDo);\n',
      'cobotWheels(tocDo, -(tocDo));\n',
    ])
    expect(arduino().forBlock.cobotC3_drive(makeBlock({ MOVE: 'spinLeft' }, { SPEED: '40' }))).toBe(
      'cobotWheels(-40, 40);\n',
    )
    // A negative literal stays one negation, not C's `--` operator.
    expect(arduino().forBlock.cobotC3_drive(makeBlock({ MOVE: 'backward' }, { SPEED: '-50' }))).toBe(
      'cobotWheels(-(-50), -(-50));\n',
    )
    expect(arduino().forBlock.cobotC3_stop(makeBlock())).toBe('cobotWheels(0, 0);\n')
  })

  it('drives one wheel without the trim, and sets the trim', () => {
    const gen = arduino()
    expect(gen.forBlock.cobotC3_setMotor(makeBlock({ MOTOR: 'right' }, { SPEED: '-30' }))).toBe(
      'cobotMotor(COBOT_RIGHT_A, COBOT_RIGHT_B, -30);\n',
    )
    expect(gen.forBlock.cobotC3_setMotor(makeBlock({ MOTOR: 'left' }, { SPEED: '30' }))).toBe(
      'cobotMotor(COBOT_LEFT_A, COBOT_LEFT_B, 30);\n',
    )
    expect(gen.forBlock.cobotC3_setTrim(makeBlock({}, { PERCENT: '10' }))).toBe('cobotTrim = 10;\n')
    expect(gen.globals.get('cobot_board')).toContain('right = constrain(right, -100, 100) * (100 + cobotTrim) / 100;')
  })

  it('reads an eye by its number and tests it against the line threshold', () => {
    for (const [, eye] of EYES) {
      expect(arduino().forBlock.cobotC3_readEye(makeBlock({ EYE: eye }))).toEqual([`cobotEye(${eye})`, Order.ATOMIC])
      expect(arduino().forBlock.cobotC3_onLine(makeBlock({ EYE: eye }))).toEqual([
        `cobotOnLine(${eye})`,
        Order.ATOMIC,
      ])
    }
    expect(arduino().forBlock.cobotC3_setLine(makeBlock({ SIDE: 'above' }, { THRESHOLD: '1500' }))).toBe(
      'cobotLineBelow = false;\ncobotLineThreshold = 1500;\n',
    )
    expect(arduino().forBlock.cobotC3_setLine(makeBlock({ SIDE: 'below' }, {}))).toBe(
      'cobotLineBelow = true;\ncobotLineThreshold = 2000;\n',
    )
  })

  it('reports and matches the four-eye pattern', () => {
    expect(arduino().forBlock.cobotC3_pattern(makeBlock())).toEqual(['cobotPattern()', Order.ATOMIC])
    expect(arduino().forBlock.cobotC3_patternIs(makeBlock({}, { PATTERN: '"0110"' }))).toEqual([
      'cobotPatternIs(String("0110"))',
      Order.ATOMIC,
    ])
  })

  it('switches the eye IR lights on IO21 and the white light on IO20', () => {
    expect(arduino().forBlock.cobotC3_irLight(makeBlock({ STATE: 'LOW' }))).toBe(
      'digitalWrite(COBOT_IR_LIGHT, LOW);\n',
    )
    expect(arduino().forBlock.cobotC3_whiteLight(makeBlock({ STATE: 'HIGH' }))).toBe(
      'digitalWrite(COBOT_WHITE_LIGHT, HIGH);\n',
    )
  })
})
