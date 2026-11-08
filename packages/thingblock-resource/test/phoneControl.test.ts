import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

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
