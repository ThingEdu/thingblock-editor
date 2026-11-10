import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildLessons } from '../../scripts/build-lessons.mjs'

const lesson = (ma: string, nhom: string, thuTu: number) => `---
ma: ${ma}
ten: Bài ${ma}
nhom: ${nhom}
thu-tu: ${thuTu}
bo: thingbot
---
## Bước
Làm gì đó.
![](anh.png)
kiểm: L1 sáng
## Bước hai
Chỉ đọc.
`

describe('buildLessons', () => {
  it('writes each lesson as JSON, copies its images, skips kiem-thu and indexes by group then order', () => {
    const src = mkdtempSync(join(tmpdir(), 'lessons-src-'))
    const out = mkdtempSync(join(tmpdir(), 'lessons-out-'))
    for (const [ma, nhom, n] of [
      ['den', 'dau-ra', 2],
      ['quen', 'lam-quen', 1],
      ['bat', 'dau-ra', 1],
    ] as const) {
      mkdirSync(join(src, ma, 'kiem-thu'), { recursive: true })
      writeFileSync(join(src, ma, 'bai.vi.md'), lesson(ma, nhom, n))
      writeFileSync(join(src, ma, 'anh.png'), 'png')
      writeFileSync(join(src, ma, 'kiem-thu', 'dung.tb'), 'zip')
    }

    const index = buildLessons(src, out)

    expect(index.lessons.map((l) => l.ma)).toEqual(['quen', 'bat', 'den'])
    expect(index.lessons[0]).toEqual({
      ma: 'quen',
      ten: 'Bài quen',
      nhom: 'lam-quen',
      thuTu: 1,
      thoiLuong: null,
      langs: ['vi'],
      stepCount: 2,
      gradedCount: 1,
    })
    expect(JSON.parse(readFileSync(join(out, 'index.json'), 'utf8'))).toEqual(index)
    const built = JSON.parse(readFileSync(join(out, 'den', 'bai.vi.json'), 'utf8')) as {
      steps: { rules: unknown[] }[]
    }
    expect(built.steps[0].rules).toEqual([{ kind: 'light', target: 'L1', on: true }])
    expect(existsSync(join(out, 'den', 'anh.png'))).toBe(true)
    expect(existsSync(join(out, 'den', 'kiem-thu'))).toBe(false)
  })

  it('fails naming the file and line of a bad rule', () => {
    const src = mkdtempSync(join(tmpdir(), 'lessons-src-'))
    const out = mkdtempSync(join(tmpdir(), 'lessons-out-'))
    mkdirSync(join(src, 'hong'))
    writeFileSync(join(src, 'hong', 'bai.vi.md'), lesson('hong', 'dau-ra', 1).replace('L1 sáng', 'L7 sáng'))
    writeFileSync(join(src, 'hong', 'anh.png'), 'png')
    expect(() => buildLessons(src, out)).toThrow(/hong\/bai\.vi\.md.*dòng 11.*L7 sáng/s)
  })

  it('fails on two lessons with the same order in one group, naming the second and its thu-tu line', () => {
    const src = mkdtempSync(join(tmpdir(), 'lessons-src-'))
    const out = mkdtempSync(join(tmpdir(), 'lessons-out-'))
    for (const [ma, nhom] of [
      ['a-den', 'dau-ra'],
      ['b-quen', 'lam-quen'],
      ['c-bat', 'dau-ra'],
    ] as const) {
      mkdirSync(join(src, ma))
      writeFileSync(join(src, ma, 'bai.vi.md'), lesson(ma, nhom, 1))
      writeFileSync(join(src, ma, 'anh.png'), 'png')
    }
    let error: (Error & { file?: string; problems?: { line: number; message: string }[] }) | undefined
    try {
      buildLessons(src, out)
    } catch (e) {
      error = e as typeof error
    }
    expect(error?.file).toBe('c-bat/bai.vi.md')
    expect(error?.problems).toEqual([{ line: 5, message: 'trùng thứ tự 1 trong nhóm dau-ra với bài a-den' }])
    expect(error?.message).toMatch(/c-bat\/bai\.vi\.md.*dòng 5: trùng thứ tự 1 trong nhóm dau-ra với bài a-den/s)
  })

  it('as a script prints file:line: message and exits 1 on a bad lesson', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'lessons-cwd-'))
    const dir = join(cwd, 'src', 'tutorials', 'hong')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'bai.vi.md'), lesson('hong', 'dau-ra', 1).replace('L1 sáng', 'L7 sáng'))
    writeFileSync(join(dir, 'anh.png'), 'png')
    const script = join(__dirname, '..', '..', 'scripts', 'build-lessons.mjs')
    const run = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' })
    expect(run.status).toBe(1)
    expect(run.stderr).toMatch(/hong\/bai\.vi\.md:11: .*L7 sáng/)
    const ok = execFileSync(process.execPath, [script], {
      cwd: mkdtempSync(join(tmpdir(), 'lessons-empty-')),
      encoding: 'utf8',
    })
    expect(ok).toContain('Built 0 lesson(s)')
  })
})
