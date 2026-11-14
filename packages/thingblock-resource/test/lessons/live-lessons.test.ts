/**
 * The ThingBot Live lessons drive a real ThingBot over Bluetooth, so the simulator has nothing to grade:
 * they open without a board, load the live blocks, carry no rules, and every example they point the learner
 * to exists in the ThingBot Live examples.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLesson } from '../../scripts/lessons/parse-lesson.mjs'

const TUTORIALS = join(__dirname, '../../src/tutorials')
const EXAMPLES = join(__dirname, '../../src/examples/thingbot-live/index.json')
const exampleTitles = (JSON.parse(readFileSync(EXAMPLES, 'utf8')) as { examples: { title: string }[] }).examples.map(
  (e) => e.title,
)

const lessons = readdirSync(TUTORIALS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const dir = join(TUTORIALS, d.name)
    const markdown = readFileSync(join(dir, 'lesson.vi.md'), 'utf8')
    const { lesson } = parseLesson(markdown, { dirName: d.name, lang: 'vi', files: readdirSync(dir) })
    return { id: d.name, markdown, lesson }
  })
  .filter(({ lesson }) => lesson.group === 'thingbot-live')

describe('ThingBot Live lessons', () => {
  it('are there, in order', () => {
    expect(lessons.map(({ lesson }) => lesson.order)).toEqual(lessons.map((_, i) => i + 1))
    expect(lessons.length).toBeGreaterThanOrEqual(5)
  })

  it.each(lessons.map((l) => [l.id, l] as const))(
    '%s needs no board, loads the live blocks and grades nothing',
    (_id, { lesson }) => {
      expect(lesson.board).toBe('none')
      expect(lesson.extensions).toContain('thingbotTelemetrix')
      expect(lesson.steps.flatMap((s) => s.rules)).toEqual([])
      expect(lesson.steps.length).toBeGreaterThanOrEqual(4)
    },
  )

  it.each(lessons.map((l) => [l.id, l] as const))('%s points only to examples that exist', (_id, { markdown }) => {
    const named = [...markdown.matchAll(/ThingBot Live → ([^*]+)\*\*/g)].map((m) => m[1].trim())
    expect(named.filter((title) => !exampleTitles.includes(title))).toEqual([])
  })
})
