import { describe, expect, it } from 'vitest'
import { registerBlocks } from '../src/extensions/peripheral/mpu6050/blocks'
import { registerGenerators } from '../src/extensions/peripheral/mpu6050/generator'
import mpu6050Manifest from '../src/extensions/peripheral/mpu6050/manifest'
import mpu6050Toolbox from '../src/extensions/peripheral/mpu6050/toolbox'
import type { ArduinoGenerator, ArduinoOrder, Blockly } from '../src/shared/types'

const Order = { ATOMIC: 0 } as unknown as ArduinoOrder

const makeGenerator = () => ({
  forBlock: {} as Record<string, (block: unknown) => string | [string, number]>,
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  valueToCode: () => '',
})

const makeBlock = (fields: Record<string, string> = {}) => ({
  getFieldValue: (name: string) => fields[name],
})

const blockIds = ['mpu6050_init', 'mpu6050_readData', 'mpu6050_acceleration', 'mpu6050_gyro', 'mpu6050_temperature']

describe('MPU6050 blocks', () => {
  it('defines the five MPU6050 block opcodes', () => {
    const Blocks: Record<string, unknown> = {}
    registerBlocks({ Blocks } as unknown as Blockly)
    expect(Object.keys(Blocks)).toEqual(blockIds)
  })
})

describe('MPU6050 generator', () => {
  it('emits the driver includes, sensor globals, and the configured init', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.mpu6050_init(
      makeBlock({ AR: 'MPU6050_RANGE_4_G', GR: 'MPU6050_RANGE_250_DEG', FB: 'MPU6050_BAND_94_HZ' }),
    )

    expect(gen.includes.get('mpu6050')).toContain('#include <Adafruit_MPU6050.h>')
    expect(gen.globals.get('mpu6050')).toContain('Adafruit_MPU6050 mpu6050;')
    expect(code).toContain('mpu6050.setAccelerometerRange(MPU6050_RANGE_4_G);')
    expect(code).toContain('mpu6050.setGyroRange(MPU6050_RANGE_250_DEG);')
    expect(code).toContain('mpu6050.setFilterBandwidth(MPU6050_BAND_94_HZ);')
  })

  it('falls back to the toolbox defaults when fields are absent', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.mpu6050_init(makeBlock())

    expect(code).toContain('mpu6050.setAccelerometerRange(MPU6050_RANGE_8_G);')
    expect(code).toContain('mpu6050.setGyroRange(MPU6050_RANGE_500_DEG);')
    expect(code).toContain('mpu6050.setFilterBandwidth(MPU6050_BAND_21_HZ);')
  })

  it('reads the reporters off the sample latched by readData', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    expect(gen.forBlock.mpu6050_readData(makeBlock())).toBe(
      'mpu6050.getEvent(&mpu6050_a, &mpu6050_g, &mpu6050_temp);\n',
    )
    expect(gen.forBlock.mpu6050_acceleration(makeBlock({ AXIS: 'y' }))).toEqual([
      'mpu6050_a.acceleration.y',
      Order.ATOMIC,
    ])
    expect(gen.forBlock.mpu6050_gyro(makeBlock({ AXIS: 'z' }))).toEqual(['mpu6050_g.gyro.z', Order.ATOMIC])
    expect(gen.forBlock.mpu6050_temperature(makeBlock())).toEqual(['mpu6050_temp.temperature', Order.ATOMIC])
  })
})

describe('MPU6050 resource pack', () => {
  it('declares its served modules, icon, and the vendored Adafruit driver stack', () => {
    expect(mpu6050Manifest).toMatchObject({
      id: 'mpu6050',
      kind: 'peripheral',
      icon: './icon.png',
      blocks: './blocks.js',
      generator: './generator.js',
      toolbox: './toolbox.js',
      libs: [
        { path: 'libs/Adafruit_MPU6050' },
        { path: 'libs/Adafruit_BusIO' },
        { path: 'libs/Adafruit_Unified_Sensor' },
      ],
    })
  })

  it('preserves the toolbox block order', () => {
    expect(mpu6050Toolbox.colour).toBe('#0066CC')
    expect(mpu6050Toolbox.contents.map(({ type }) => type)).toEqual(blockIds)
  })
})
