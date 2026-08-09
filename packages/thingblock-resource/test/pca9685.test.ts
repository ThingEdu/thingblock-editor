import { describe, expect, it } from 'vitest'
import { registerBlocks } from '../src/extensions/peripheral/pca9685/blocks'
import { registerGenerators } from '../src/extensions/peripheral/pca9685/generator'
import pca9685Manifest from '../src/extensions/peripheral/pca9685/manifest'
import pca9685Toolbox from '../src/extensions/peripheral/pca9685/toolbox'
import type { ArduinoGenerator, ArduinoOrder, Blockly } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

const makeGenerator = () => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  valueToCode: (block: { values: Record<string, string> }, name: string) => block.values[name] ?? '',
})

const makeBlock = (values: Record<string, string> = {}, fields: Record<string, string> = {}) => ({
  values,
  getFieldValue: (name: string) => fields[name],
})

const blockIds = [
  'pca9685_init',
  'pca9685_setToServoMode',
  'pca9685_setServoAngle',
  'pca9685_setAllServoAngle',
  'pca9685_setPWMFrequency',
  'pca9685_setChannelPWM',
  'pca9685_setAllChannelPWM',
]

describe('PCA9685 blocks', () => {
  it('defines the seven functional block opcodes', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    expect(Object.keys(Blocks)).toEqual(blockIds)
  })

  it('offers all sixteen channels on the channel dropdowns', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)

    let config: { args0?: { name?: string; options?: string[][] }[] } | undefined
    const stub = { jsonInit: (value: typeof config) => (config = value) }
    ;(Blocks.pca9685_setChannelPWM as { init(this: typeof stub): void }).init.call(stub)

    const channel = config?.args0?.find(({ name }) => name === 'CH')
    expect(channel?.options).toHaveLength(16)
    expect(channel?.options?.[15]).toEqual(['15', '15'])
  })
})

describe('PCA9685 generator', () => {
  it('declares the driver from the init address', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.pca9685_init(makeBlock({ ADDR: '3' }))

    expect(gen.includes.get('pca9685')).toBe('#include <PCA9685.h>')
    expect(gen.globals.get('pca9685')).toBe('PCA9685 pca9685(3);')
    expect(code).toContain('pca9685.init();')
  })

  it('declares the servo evaluator only when servo mode is entered', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.pca9685_setServoAngle(makeBlock({ ANGLE: '90' }, { CH: '4' }))
    expect(gen.globals.has('pca9685_servo')).toBe(false)

    expect(gen.forBlock.pca9685_setToServoMode(makeBlock())).toBe('pca9685.setPWMFreqServo();\n')
    expect(gen.globals.get('pca9685_servo')).toBe('PCA9685_ServoEval pca9685Servo(123, 491);')
  })

  it('emits per-channel and all-channel servo and raw PWM writes', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.pca9685_setServoAngle(makeBlock({ ANGLE: '45' }, { CH: '2' }))).toBe(
      'pca9685.setChannelPWM(2, pca9685Servo.pwmForAngle(45));\n',
    )
    expect(gen.forBlock.pca9685_setAllServoAngle(makeBlock({ ANGLE: '120' }))).toBe(
      'pca9685.setAllChannelsPWM(pca9685Servo.pwmForAngle(120));\n',
    )
    expect(gen.forBlock.pca9685_setPWMFrequency(makeBlock({ FREQ: '500' }))).toBe('pca9685.setPWMFrequency(500);\n')
    expect(gen.forBlock.pca9685_setChannelPWM(makeBlock({ VALUE: '2048' }, { CH: '7' }))).toBe(
      'pca9685.setChannelPWM(7, 2048);\n',
    )
    expect(gen.forBlock.pca9685_setAllChannelPWM(makeBlock({ VALUE: '4096' }))).toBe(
      'pca9685.setAllChannelsPWM(4096);\n',
    )
  })

  it('falls back to safe defaults when inputs and fields are empty', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.pca9685_init(makeBlock())
    expect(gen.globals.get('pca9685')).toBe('PCA9685 pca9685(0);')
    expect(gen.forBlock.pca9685_setServoAngle(makeBlock())).toBe(
      'pca9685.setChannelPWM(0, pca9685Servo.pwmForAngle(90));\n',
    )
  })
})

describe('PCA9685 resource pack', () => {
  it('declares its served modules, icon, and vendored library', () => {
    expect(pca9685Manifest).toMatchObject({
      id: 'pca9685',
      kind: 'peripheral',
      icon: './icon.png',
      blocks: './blocks.js',
      generator: './generator.js',
      toolbox: './toolbox.js',
      libs: [{ path: 'libs/PCA9685_16-Channel_PWM_Driver_Module_Library' }],
    })
  })

  it('fills every value input with a built-in shadow', () => {
    expect(pca9685Toolbox.colour).toBe('#9F4D95')
    expect(pca9685Toolbox.contents.map(({ type }) => type)).toEqual(blockIds)

    const servoAngle = pca9685Toolbox.contents.find(({ type }) => type === 'pca9685_setServoAngle')
    expect(servoAngle?.inputs?.ANGLE).toEqual({ type: 'math_angle', fields: { NUM: 90 } })
  })
})
