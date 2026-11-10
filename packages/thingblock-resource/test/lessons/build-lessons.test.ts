import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildLessons } from '../../scripts/build-lessons.mjs'

const lesson = (id: string, group: string, order: number) => `---
id: ${id}
name: Lesson ${id}
group: ${group}
order: ${order}
board: thingbot
---
## Step
Do something.
![](picture.png)
check: L1 on
## Step two
Read only.
`

describe('buildLessons', () => {
  it('writes each lesson as JSON, copies its images, skips solutions and indexes by group then order', () => {
    const src = mkdtempSync(join(tmpdir(), 'lessons-src-'))
    const out = mkdtempSync(join(tmpdir(), 'lessons-out-'))
    for (const [id, group, n] of [
      ['blink', 'outputs', 2],
      ['intro', 'getting-started', 1],
      ['light', 'outputs', 1],
    ] as const) {
      mkdirSync(join(src, id, 'solutions'), { recursive: true })
      writeFileSync(join(src, id, 'lesson.vi.md'), lesson(id, group, n))
      writeFileSync(join(src, id, 'picture.png'), 'png')
      writeFileSync(join(src, id, 'solutions', 'pass.tb'), 'zip')
    }

    const index = buildLessons(src, out)

    expect(index.lessons.map((l) => l.id)).toEqual(['intro', 'light', 'blink'])
    expect(index.lessons[0]).toEqual({
      id: 'intro',
      name: 'Lesson intro',
      group: 'getting-started',
      order: 1,
      image: null,
      duration: null,
      langs: ['vi'],
      stepCount: 2,
      gradedCount: 1,
    })
    expect(JSON.parse(readFileSync(join(out, 'index.json'), 'utf8'))).toEqual(index)
    const built = JSON.parse(readFileSync(join(out, 'blink', 'lesson.vi.json'), 'utf8')) as {
      steps: { rules: unknown[] }[]
    }
    expect(built.steps[0].rules).toEqual([{ kind: 'light', target: 'L1', on: true }])
    expect(existsSync(join(out, 'blink', 'picture.png'))).toBe(true)
    expect(existsSync(join(out, 'blink', 'solutions'))).toBe(false)
  })

  it('fails naming the file and line of a bad rule', () => {
    const src = mkdtempSync(join(tmpdir(), 'lessons-src-'))
    const out = mkdtempSync(join(tmpdir(), 'lessons-out-'))
    mkdirSync(join(src, 'broken'))
    writeFileSync(join(src, 'broken', 'lesson.vi.md'), lesson('broken', 'outputs', 1).replace('L1 on', 'L7 on'))
    writeFileSync(join(src, 'broken', 'picture.png'), 'png')
    expect(() => buildLessons(src, out)).toThrow(/broken\/lesson\.vi\.md.*line 11.*L7 on/s)
  })

  it('fails on two lessons with the same order in one group, naming the second and its order line', () => {
    const src = mkdtempSync(join(tmpdir(), 'lessons-src-'))
    const out = mkdtempSync(join(tmpdir(), 'lessons-out-'))
    for (const [id, group] of [
      ['a-blink', 'outputs'],
      ['b-intro', 'getting-started'],
      ['c-light', 'outputs'],
    ] as const) {
      mkdirSync(join(src, id))
      writeFileSync(join(src, id, 'lesson.vi.md'), lesson(id, group, 1))
      writeFileSync(join(src, id, 'picture.png'), 'png')
    }
    let error: (Error & { file?: string; problems?: { line: number; message: string }[] }) | undefined
    try {
      buildLessons(src, out)
    } catch (e) {
      error = e as typeof error
    }
    expect(error?.file).toBe('c-light/lesson.vi.md')
    expect(error?.problems).toEqual([{ line: 5, message: 'order 1 in group outputs is already used by a-blink' }])
    expect(error?.message).toMatch(
      /c-light\/lesson\.vi\.md.*line 5: order 1 in group outputs is already used by a-blink/s,
    )
  })

  it('as a script prints file:line: message and exits 1 on a bad lesson', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'lessons-cwd-'))
    const dir = join(cwd, 'src', 'tutorials', 'broken')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'lesson.vi.md'), lesson('broken', 'outputs', 1).replace('L1 on', 'L7 on'))
    writeFileSync(join(dir, 'picture.png'), 'png')
    const script = join(__dirname, '..', '..', 'scripts', 'build-lessons.mjs')
    const run = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' })
    expect(run.status).toBe(1)
    expect(run.stderr).toMatch(/broken\/lesson\.vi\.md:11: .*L7 on/)
    const ok = execFileSync(process.execPath, [script], {
      cwd: mkdtempSync(join(tmpdir(), 'lessons-empty-')),
      encoding: 'utf8',
    })
    expect(ok).toContain('Built 0 lesson(s)')
  })
})
