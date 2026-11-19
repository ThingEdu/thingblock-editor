import { describe, expect, test } from 'vitest'
import makeToolboxXML from '../../../src/lib/blocks/make-toolbox-xml'
import { defaultColors } from '../../../src/lib/settings/color-mode'

describe('makeToolboxXML board mode gating', () => {
  test('host mode (no board) shows host-only core blocks', () => {
    const xml = makeToolboxXML(false, [], defaultColors, false)
    expect(xml).toContain('event_whenflagclicked')
    expect(xml).toContain('event_whenkeypressed')
    expect(xml).toContain('sensing_mousex')
    expect(xml).toContain('sensing_askandwait')
    expect(xml).toContain('sensing_online')
    expect(xml).toContain('control_print')
  })

  test('board mode hides host-only core blocks but keeps the timer blocks', () => {
    const xml = makeToolboxXML(false, [], defaultColors, true)
    expect(xml).not.toContain('event_whenflagclicked')
    expect(xml).not.toContain('event_whenkeypressed')
    expect(xml).not.toContain('sensing_mousex')
    expect(xml).not.toContain('sensing_askandwait')
    expect(xml).not.toContain('sensing_online')
    expect(xml).not.toContain('control_print')
    // Timer maps to millis() on the board, so it stays available in both modes.
    expect(xml).toContain('sensing_timer')
  })
})

test('a category with a core id replaces the built-in one, others go at the bottom', () => {
  const xml = makeToolboxXML(false, [
    { id: 'pins', xml: '<category id="pins"/>' },
    { id: 'control', xml: '<category id="my-control"/>' },
  ])
  expect(xml).toContain('my-control')
  expect(xml).not.toContain('control_forever')
  expect(xml.indexOf('my-control')).toBeLessThan(xml.indexOf('id="pins"'))
})
