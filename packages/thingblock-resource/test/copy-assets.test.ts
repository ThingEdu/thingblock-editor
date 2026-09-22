import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { copyRawAssets } from '../scripts/copy-assets.mjs'

describe('pack asset copying', () => {
  it('copies a firmware directory wholesale, not just images and libs', () => {
    const src = mkdtempSync(join(tmpdir(), 'pack-src-'))
    const out = mkdtempSync(join(tmpdir(), 'pack-out-'))
    mkdirSync(join(src, 'firmware', 'telemetrix-ble'), { recursive: true })
    writeFileSync(join(src, 'firmware', 'telemetrix-ble', 'telemetrix-ble.ino.bin'), 'app')
    writeFileSync(join(src, 'firmware', 'telemetrix-ble', 'telemetrix-ble.ino.bootloader.bin'), 'boot')

    copyRawAssets(src, src, out)

    expect(existsSync(join(out, 'firmware/telemetrix-ble/telemetrix-ble.ino.bin'))).toBe(true)
    // The bootloader has no image or lib extension; a rule that only matches those would drop it,
    // and the board would fail to flash with a missing-sibling error from esptool.
    expect(existsSync(join(out, 'firmware/telemetrix-ble/telemetrix-ble.ino.bootloader.bin'))).toBe(true)
  })
})
