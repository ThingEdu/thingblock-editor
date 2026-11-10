// Type declaration for parse-lesson.mjs, consumed only by test/lessons/parse-lesson.test.ts.
// TypeScript resolves this sibling `.d.mts` for the `.mjs` import automatically; the script itself
// stays plain ESM. The `Lesson` JSON is the contract with the editor's lesson panel.
import type { Rule } from '../../../thingblock-sim/src/checker/rules.ts'

export interface Run {
  text: string
  bold?: true
  italic?: true
}

export type Segment =
  | { type: 'p'; runs: Run[] }
  | { type: 'img'; src: string; alt: string }
  | { type: 'list'; items: Run[][] }

export interface Step {
  title: string
  body: Segment[]
  hints: Run[][]
  rules: Rule[]
  pointAt: string | null
}

export interface Lesson {
  id: string
  name: string
  group: 'getting-started' | 'outputs' | 'motors' | 'inputs'
  order: number
  board: string
  start: string | null
  /** The lesson's library image, a file in the lesson folder. */
  image: string | null
  /** Extra packs the editor adds when the lesson opens (`peripherals:`). */
  peripherals: string[]
  duration: number | null
  lang: string
  steps: Step[]
}

export class LessonError extends Error {
  problems: { line: number; message: string }[]
  constructor(problems: { line: number; message: string }[])
}

export function parseRuns(text: string): Run[]

export function parseLesson(
  markdown: string,
  ctx: { dirName: string; lang: string; files: string[] },
): { lesson: Lesson; warnings: string[] }
