import { describe, expect, it } from 'vitest'
import { LessonError, parseLesson, parseRuns } from '../../scripts/lessons/parse-lesson.mjs'

const FRONT = `---
id: blink
name: Blinking light
group: outputs            # comment
order: 2
board: thingbot
duration: 10
---
`
const catchError = (fn: () => unknown): LessonError => {
  try {
    fn()
  } catch (e) {
    return e as LessonError
  }
  throw new Error('expected a LessonError')
}
const ctx = { dirName: 'blink', lang: 'vi', files: ['lesson.vi.md', 'block.png'] }

describe('parseLesson', () => {
  it('reads front matter, steps, body runs, hints and rules', () => {
    const md = `${FRONT}
## Turn on L1
Drag the **set led L1 100** block *inside* the start block.
![Light block](block.png)

- step one
- step **two**

> hint: The light block is in the **ThingBot** category.

check: L1 on
check: L2 off

## Done
Well done!
`
    const { lesson, warnings } = parseLesson(md, ctx)
    expect(warnings).toEqual([])
    expect(lesson).toMatchObject({
      id: 'blink',
      name: 'Blinking light',
      group: 'outputs',
      order: 2,
      board: 'thingbot',
      start: null,
      image: null,
      peripherals: [],
      duration: 10,
      lang: 'vi',
    })
    expect(lesson.steps).toHaveLength(2)
    const [step, last] = lesson.steps
    expect(step.title).toBe('Turn on L1')
    expect(step.body).toEqual([
      {
        type: 'p',
        runs: [
          { text: 'Drag the ' },
          { text: 'set led L1 100', bold: true },
          { text: ' block ' },
          { text: 'inside', italic: true },
          { text: ' the start block.' },
        ],
      },
      { type: 'img', src: 'block.png', alt: 'Light block' },
      {
        type: 'list',
        items: [[{ text: 'step one' }], [{ text: 'step ' }, { text: 'two', bold: true }]],
      },
    ])
    expect(step.hints).toEqual([
      [{ text: 'The light block is in the ' }, { text: 'ThingBot', bold: true }, { text: ' category.' }],
    ])
    expect(step.rules).toEqual([
      { kind: 'light', target: 'L1', on: true },
      { kind: 'light', target: 'L2', on: false },
    ])
    expect(step.pointAt).toBeNull()
    expect(last.rules).toEqual([])
  })

  it('accepts a tour anchor and rejects an unknown one', () => {
    const ok = parseLesson(`${FRONT}\n## B\npoint at: run-button\n`, ctx)
    expect(ok.lesson.steps[0].pointAt).toBe('run-button')
    expect(() => parseLesson(`${FRONT}\n## B\npoint at: fly-button\n`, ctx)).toThrow(LessonError)
  })

  it('reads the peripherals the lesson needs, for the editor to add when it opens', () => {
    const md = `${FRONT.replace('board: thingbot', 'board: thingbot\nperipherals: oled, ultrasonic')}\n## B\n`
    expect(parseLesson(md, ctx).lesson.peripherals).toEqual(['oled', 'ultrasonic'])
  })

  it.each([
    ['unknown peripheral', FRONT.replace('board: thingbot', 'board: thingbot\nperipherals: screen'), /screen/],
    ['missing name', FRONT.replace('name: Blinking light\n', ''), /name/],
    ['id differs from folder', FRONT.replace('id: blink', 'id: other'), /folder/],
    ['bad group', FRONT.replace('group: outputs', 'group: xyz'), /group/],
    ['bad rule', `${FRONT}\n## B\ncheck: L9 on\n`, /L9 on/],
    ['missing image', `${FRONT}\n## B\n![](missing.png)\n`, /missing\.png/],
    ['missing start', FRONT.replace('board: thingbot', 'board: thingbot\nstart: other.tb'), /other\.tb/],
    ['no steps', FRONT, /no steps/],
  ])('fails the build on %s', (_name, md, pattern) => {
    expect(() => parseLesson(md, ctx)).toThrow(pattern)
  })

  it('reports every problem with its line number in one error', () => {
    let error: LessonError | undefined
    try {
      parseLesson(`${FRONT}\n## B\ncheck: L9 on\ncheck: buzzer howls\n`, ctx)
    } catch (e) {
      error = e as LessonError
    }
    expect(error?.problems.map((p) => p.line)).toEqual([11, 12])
  })

  describe('fix round 1', () => {
    const HAPPY = `${FRONT}
## Turn on the light
Drag the **a** block.

check: L1 on
`

    it('parses a CRLF + BOM file like the LF one', () => {
      const crlf = '﻿' + HAPPY.replace(/\n/g, '\r\n')
      expect(parseLesson(crlf, ctx).lesson).toEqual(parseLesson(HAPPY, ctx).lesson)
    })

    it.each(['Check: L1 on', 'CHECK: L1 on'])('reads directive %s case-insensitively', (l) => {
      const { lesson } = parseLesson(`${FRONT}\n## B\n${l}\n`, ctx)
      expect(lesson.steps[0].rules).toEqual([{ kind: 'light', target: 'L1', on: true }])
    })

    it('reads a capitalised hint and tour directive', () => {
      const { lesson } = parseLesson(`${FRONT}\n## B\n> Hint: hello\nPoint at: run-button\n`, ctx)
      expect(lesson.steps[0].hints).toEqual([[{ text: 'hello' }]])
      expect(lesson.steps[0].pointAt).toBe('run-button')
    })

    it('reads decomposed (NFD) Vietnamese text', () => {
      const md = `${FRONT}\n## Bật đèn\ncheck: L1 on\n`.normalize('NFD')
      const { lesson } = parseLesson(md, ctx)
      expect(lesson.steps[0].title).toBe('Bật đèn'.normalize('NFC'))
      expect(lesson.steps[0].rules).toHaveLength(1)
    })

    it('joins a multi-line hint into one hint', () => {
      const { lesson } = parseLesson(`${FRONT}\n## B\n> hint: line one\n> line two\n\ndone\n`, ctx)
      expect(lesson.steps[0].hints).toEqual([[{ text: 'line one line two' }]])
      expect(lesson.steps[0].body).toEqual([{ type: 'p', runs: [{ text: 'done' }] }])
    })

    it.each([
      ['order', FRONT.replace('order: 2', 'order: two'), /order must be a number/, 5],
      ['duration', FRONT.replace('duration: 10', 'duration: ten'), /duration must be a number/, 7],
    ])('rejects non-numeric %s at its line', (_n, md, pattern, line) => {
      const err = catchError(() => parseLesson(`${md}\n## B\n`, ctx))
      expect(err.message).toMatch(pattern)
      expect(err.problems[0].line).toBe(line)
    })

    it('treats # as a comment only after whitespace', () => {
      const { lesson } = parseLesson(`${FRONT.replace('name: Blinking light', 'name: Light #2')}\n## B\n`, ctx)
      expect(lesson.name).toBe('Light #2')
      expect(lesson.group).toBe('outputs')
    })

    it('puts numbered items in a list', () => {
      const { lesson } = parseLesson(`${FRONT}\n## B\n1. one\n2. **two**\n`, ctx)
      expect(lesson.steps[0].body).toEqual([
        { type: 'list', items: [[{ text: 'one' }], [{ text: 'two', bold: true }]] },
      ])
    })

    it('rejects ### headings', () => {
      const err = catchError(() => parseLesson(`${FRONT}\n## B\n### sub\n`, ctx))
      expect(err.problems).toEqual([{ line: 11, message: 'use ## for steps, not ###' }])
    })

    it('checks an image whose path has a space', () => {
      expect(() => parseLesson(`${FRONT}\n## B\n![a](light block.png)\n`, ctx)).toThrow(/light block\.png/)
    })

    it('reports a bad group on its own line', () => {
      const err = catchError(() => parseLesson(`${FRONT.replace('group: outputs', 'group: xyz')}\n## B\n`, ctx))
      expect(err.problems[0].line).toBe(4)
    })

    it('keeps consecutive hints separate', () => {
      const two = parseLesson(`${FRONT}\n## B\n> hint: one\n> hint: two\n`, ctx)
      expect(two.lesson.steps[0].hints).toEqual([[{ text: 'one' }], [{ text: 'two' }]])
      const mixed = parseLesson(`${FRONT}\n## B\n> hint: one\n> two\n> hint: three\n`, ctx)
      expect(mixed.lesson.steps[0].hints).toEqual([[{ text: 'one two' }], [{ text: 'three' }]])
    })
  })
})

describe('parseRuns', () => {
  it('reads _italic_ like *italic*', () => {
    expect(parseRuns('Drag _inside_ the box')).toEqual([
      { text: 'Drag ' },
      { text: 'inside', italic: true },
      { text: ' the box' },
    ])
  })

  it('reads __bold__ like **bold**', () => {
    expect(parseRuns('__bold__ and _italic_')).toEqual([
      { text: 'bold', bold: true },
      { text: ' and ' },
      { text: 'italic', italic: true },
    ])
  })

  it('leaves underscores inside words alone', () => {
    expect(parseRuns('variable a_b_c stays')).toEqual([{ text: 'variable a_b_c stays' }])
  })
})
