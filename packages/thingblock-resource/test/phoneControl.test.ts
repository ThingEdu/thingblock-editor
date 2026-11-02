import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { registerGenerators } from '../src/extensions/peripheral/phoneControl/generator'
import toolbox from '../src/extensions/peripheral/phoneControl/toolbox'
import type { ArduinoGenerator, ArduinoOrder } from '../src/shared/types'

const Order = { ATOMIC: 0, NONE: 99 } as unknown as ArduinoOrder

const makeGenerator = () => ({
  includes: new Map<string, string>(),
  globals: new Map<string, string>(),
  setups: new Map<string, string>(),
  forBlock: {} as Record<string, (block: unknown) => string>,
  valueToCode: () => '"Xe cua em"',
})

describe('phoneControl', () => {
  it('starts the service from setups, not from where the block sits', () => {
    // A program that opens with `wait` blocks would otherwise leave the phone unable to connect
    // until those waits finished, and two copies of the block would start two services.
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    const code = gen.forBlock.phoneControl_start({})

    expect(code).toBe('')
    expect(gen.setups.get('phone_control')).toBe('thingbotPhoneControlBegin("Xe cua em");')
    expect(gen.includes.get('phone_control')).toContain('ThingBotTelemetrixService.h')
  })

  it('collapses two blocks onto one service', () => {
    const gen = makeGenerator()
    registerGenerators(gen as unknown as ArduinoGenerator, Order)

    gen.forBlock.phoneControl_start({})
    gen.forBlock.phoneControl_start({})

    expect(gen.setups.size).toBe(1)
    expect(gen.includes.size).toBe(1)
  })

  it('offers the block with a board name already filled in', () => {
    // An empty name field would advertise an unnamed peripheral, which is unfindable in a
    // classroom where every board advertises at once.
    expect(toolbox.contents).toHaveLength(1)
    const block = toolbox.contents[0] as { type: string; inputs?: Record<string, unknown> }
    expect(block.type).toBe('phoneControl_start')
    expect(block.inputs?.NAME).toEqual({ type: 'text', fields: { TEXT: 'ThingBot' } })
  })
})

describe('phoneControl firmware frames', () => {
  // Every Telemetrix frame starts with a length byte counting the bytes AFTER it, and clients deframe
  // by that byte. Each `->write(buffer, count)` is checked against the nearest declaration of `buffer`
  // before it, so a frame whose length byte, array size or write count disagree fails here.
  const srcDir = join(__dirname, '../src/extensions/peripheral/phoneControl/libs/ThingBotTelemetrix/src')
  const writes = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.cpp'))
    .flatMap((file) => {
      const source = readFileSync(join(srcDir, file), 'utf8')
      return [...source.matchAll(/->write\(\s*(\w+)\s*,\s*(\d+)\s*\)/g)].map((write) => {
        const [, name, count] = write
        const declaration = new RegExp(
          `(?:byte|uint8_t)\\s+${name}\\s*\\[\\s*(\\d*)\\s*\\]\\s*=\\s*\\{\\s*(?:\\(\\s*(?:byte|uint8_t)\\s*\\)\\s*)?([^,}]*)`,
          'g',
        )
        const declared = [...source.slice(0, write.index).matchAll(declaration)].at(-1)
        return {
          where: `${file}:${name}`,
          count: Number(count),
          size: declared?.[1] ? Number(declared[1]) : undefined,
          length: declared ? declared[2].trim() : undefined,
        }
      })
    })

  it('finds the report frames it checks', () => {
    expect(writes.length).toBeGreaterThanOrEqual(8)
  })

  it.each(writes)('$where sends the bytes its length byte announces', ({ count, size, length }) => {
    expect(length).toBe(String(count - 1))
    if (size !== undefined) expect(size).toBe(count)
  })
})
