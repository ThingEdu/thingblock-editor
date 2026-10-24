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
})
