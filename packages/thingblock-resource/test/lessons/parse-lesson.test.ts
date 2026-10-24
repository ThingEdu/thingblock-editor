import { describe, expect, it } from 'vitest'
import { LessonError, parseLesson } from '../../scripts/lessons/parse-lesson.mjs'

const FRONT = `---
ma: den-nhap-nhay
ten: Đèn nhấp nháy
nhom: dau-ra            # nhóm
thu-tu: 2
bo: thingbot
thoi-luong: 10
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
const ctx = { dirName: 'den-nhap-nhay', lang: 'vi', files: ['bai.vi.md', 'khoi.png'] }

describe('parseLesson', () => {
  it('reads front matter, steps, body runs, hints and rules', () => {
    const md = `${FRONT}
## Bật đèn L1
Kéo khối **set led L1 100** vào *bên trong* khối bắt đầu.
![Khối đèn](khoi.png)

- việc một
- việc **hai**

> gợi ý: Khối đèn nằm trong nhóm **ThingBot**.

kiểm: L1 sáng
kiểm: L2 tắt

## Xong
Chúc mừng!
`
    const { lesson, warnings } = parseLesson(md, ctx)
    expect(warnings).toEqual([])
    expect(lesson).toMatchObject({
      ma: 'den-nhap-nhay',
      ten: 'Đèn nhấp nháy',
      nhom: 'dau-ra',
      thuTu: 2,
      bo: 'thingbot',
      batDau: null,
      thoiLuong: 10,
      lang: 'vi',
    })
    expect(lesson.steps).toHaveLength(2)
    const [step, last] = lesson.steps
    expect(step.title).toBe('Bật đèn L1')
    expect(step.body).toEqual([
      {
        type: 'p',
        runs: [
          { text: 'Kéo khối ' },
          { text: 'set led L1 100', bold: true },
          { text: ' vào ' },
          { text: 'bên trong', italic: true },
          { text: ' khối bắt đầu.' },
        ],
      },
      { type: 'img', src: 'khoi.png', alt: 'Khối đèn' },
      {
        type: 'list',
        items: [[{ text: 'việc một' }], [{ text: 'việc ' }, { text: 'hai', bold: true }]],
      },
    ])
    expect(step.hints).toEqual([
      [{ text: 'Khối đèn nằm trong nhóm ' }, { text: 'ThingBot', bold: true }, { text: '.' }],
    ])
    expect(step.rules).toEqual([
      { kind: 'light', target: 'L1', on: true },
      { kind: 'light', target: 'L2', on: false },
    ])
    expect(step.pointAt).toBeNull()
    expect(last.rules).toEqual([])
  })

  it('accepts a tour marker and rejects an unknown one', () => {
    const ok = parseLesson(`${FRONT}\n## B\nchỉ vào: nut-run\n`, ctx)
    expect(ok.lesson.steps[0].pointAt).toBe('nut-run')
    expect(() => parseLesson(`${FRONT}\n## B\nchỉ vào: nut-bay\n`, ctx)).toThrow(LessonError)
  })

  it.each([
    ['missing ten', FRONT.replace('ten: Đèn nhấp nháy\n', ''), /ten/],
    ['ma differs from folder', FRONT.replace('ma: den-nhap-nhay', 'ma: khac'), /thư mục/],
    ['bad nhom', FRONT.replace('nhom: dau-ra', 'nhom: xyz'), /nhom/],
    ['bad rule', `${FRONT}\n## B\nkiểm: L9 sáng\n`, /L9 sáng/],
    ['missing image', `${FRONT}\n## B\n![](thieu.png)\n`, /thieu\.png/],
    ['missing bat-dau', FRONT.replace('bo: thingbot', 'bo: thingbot\nbat-dau: bat-dau.tb'), /bat-dau\.tb/],
    ['no steps', FRONT, /bước/],
  ])('fails the build on %s', (_name, md, pattern) => {
    expect(() => parseLesson(md, ctx)).toThrow(pattern)
  })

  it('reports every problem with its line number in one error', () => {
    let error: LessonError | undefined
    try {
      parseLesson(`${FRONT}\n## B\nkiểm: L9 sáng\nkiểm: còi hú\n`, ctx)
    } catch (e) {
      error = e as LessonError
    }
    expect(error?.problems.map((p) => p.line)).toEqual([11, 12])
  })

  describe('fix round 1', () => {
    const HAPPY = `${FRONT}
## Bật đèn
Kéo khối **a**.

kiểm: L1 sáng
`

    it('parses a CRLF + BOM file like the LF one', () => {
      const crlf = '\uFEFF' + HAPPY.replace(/\n/g, '\r\n')
      expect(parseLesson(crlf, ctx).lesson).toEqual(parseLesson(HAPPY, ctx).lesson)
    })

    it.each(['Kiểm: L1 sáng', 'KIỂM: L1 sáng'])('reads directive %s case-insensitively', (l) => {
      const { lesson } = parseLesson(`${FRONT}\n## B\n${l}\n`, ctx)
      expect(lesson.steps[0].rules).toEqual([{ kind: 'light', target: 'L1', on: true }])
    })

    it('reads a capitalised hint and tour directive', () => {
      const { lesson } = parseLesson(`${FRONT}\n## B\n> Gợi ý: xin chào\nChỉ vào: nut-run\n`, ctx)
      expect(lesson.steps[0].hints).toEqual([[{ text: 'xin chào' }]])
      expect(lesson.steps[0].pointAt).toBe('nut-run')
    })

    it('reads decomposed (NFD) Vietnamese', () => {
      const md = `${FRONT}\n## B\nkiểm: L1 sáng\n`.normalize('NFD')
      const { lesson } = parseLesson(md, ctx)
      expect(lesson.steps[0].rules).toHaveLength(1)
    })

    it('joins a multi-line hint into one hint', () => {
      const { lesson } = parseLesson(`${FRONT}\n## B\n> gợi ý: dòng một\n> dòng hai\n\nxong\n`, ctx)
      expect(lesson.steps[0].hints).toEqual([[{ text: 'dòng một dòng hai' }]])
      expect(lesson.steps[0].body).toEqual([{ type: 'p', runs: [{ text: 'xong' }] }])
    })

    it.each([
      ['thu-tu', FRONT.replace('thu-tu: 2', 'thu-tu: hai'), /thu-tu phải là số/, 5],
      ['thoi-luong', FRONT.replace('thoi-luong: 10', 'thoi-luong: mười'), /thoi-luong phải là số/, 7],
    ])('rejects non-numeric %s at its line', (_n, md, pattern, line) => {
      const err = catchError(() => parseLesson(`${md}\n## B\n`, ctx))
      expect(err.message).toMatch(pattern)
      expect(err.problems[0].line).toBe(line)
    })

    it('treats # as a comment only after whitespace', () => {
      const { lesson } = parseLesson(`${FRONT.replace('ten: Đèn nhấp nháy', 'ten: Đèn #2')}\n## B\n`, ctx)
      expect(lesson.ten).toBe('Đèn #2')
      expect(lesson.nhom).toBe('dau-ra')
    })

    it('puts numbered items in a list', () => {
      const { lesson } = parseLesson(`${FRONT}\n## B\n1. một\n2. **hai**\n`, ctx)
      expect(lesson.steps[0].body).toEqual([
        { type: 'list', items: [[{ text: 'một' }], [{ text: 'hai', bold: true }]] },
      ])
    })

    it('rejects ### headings', () => {
      const err = catchError(() => parseLesson(`${FRONT}\n## B\n### con\n`, ctx))
      expect(err.problems).toEqual([{ line: 11, message: 'chỉ dùng ## cho bước, không dùng ###' }])
    })

    it('checks an image whose path has a space', () => {
      expect(() => parseLesson(`${FRONT}\n## B\n![a](khoi den.png)\n`, ctx)).toThrow(/khoi den\.png/)
    })

    it('reports a bad nhom on its own line', () => {
      const err = catchError(() => parseLesson(`${FRONT.replace('nhom: dau-ra', 'nhom: xyz')}\n## B\n`, ctx))
      expect(err.problems[0].line).toBe(4)
    })

    it('keeps consecutive hints separate', () => {
      const two = parseLesson(`${FRONT}\n## B\n> gợi ý: một\n> gợi ý: hai\n`, ctx)
      expect(two.lesson.steps[0].hints).toEqual([[{ text: 'một' }], [{ text: 'hai' }]])
      const mixed = parseLesson(`${FRONT}\n## B\n> gợi ý: một\n> hai\n> gợi ý: ba\n`, ctx)
      expect(mixed.lesson.steps[0].hints).toEqual([[{ text: 'một hai' }], [{ text: 'ba' }]])
    })
  })
})
