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
  ma: string
  ten: string
  nhom: 'lam-quen' | 'dau-ra' | 'dong-co' | 'dau-vao' | 'camera-ai'
  thuTu: number
  bo: string
  batDau: string | null
  /** Extra packs the editor adds when the lesson opens (`thiet-bi:`). */
  thietBi: string[]
  /** Editor extensions the editor loads when the lesson opens (`mo-rong:`), e.g. `cameraAi`. */
  moRong: string[]
  thoiLuong: number | null
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
