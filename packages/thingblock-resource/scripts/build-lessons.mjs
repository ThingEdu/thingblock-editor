// Build every lesson under src/tutorials/<id>/ into dist/thingblock-resource/tutorials/<id>/lesson.<lang>.json,
// copy its images, and write tutorials/index.json for the editor's lesson library. Any authoring error
// fails the pack build with file and line. Run after copy-assets, before zip-pack.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LessonError, parseLesson } from './lessons/parse-lesson.mjs'

const GROUP_ORDER = ['getting-started', 'outputs', 'motors', 'inputs', 'camera-ai']
const LESSON_FILE = /^lesson\.([a-z]{2})\.md$/
const IMAGE_FILE = /\.(png|gif)$/

/**
 * Build all lessons found in `srcDir` into `outDir` and write the lesson index.
 * @param {string} srcDir Folder holding one sub-folder per lesson (`solutions/` folders inside them are skipped).
 * @param {string} outDir Folder receiving `<id>/lesson.<lang>.json`, the lesson images and `index.json`.
 * @returns {{lessons: {id: string, name: string, group: string, order: number, image: string | null, duration: number | null,
 *   langs: string[], stepCount: number, gradedCount: number}[]}} The written index.
 * @throws {Error} A lesson failed to parse, or two lessons share `order` within a `group`; the message names
 *   the file, `file` and `problems` carry the detail.
 */
export function buildLessons(srcDir, outDir) {
  const lessons = []
  const dirs = existsSync(srcDir) ? readdirSync(srcDir, { withFileTypes: true }).filter((d) => d.isDirectory()) : []
  dirs.sort((a, b) => a.name.localeCompare(b.name))
  /** First lesson seen at each `<group>/<order>`. */
  const byOrder = new Map()

  for (const dir of dirs) {
    const lessonDir = join(srcDir, dir.name)
    const files = readdirSync(lessonDir)
    const langs = []
    let summary = null
    let firstFile = null
    for (const file of files) {
      const lang = file.match(LESSON_FILE)?.[1]
      if (!lang) continue
      const parsed = parseFile(join(lessonDir, file), `${dir.name}/${file}`, { dirName: dir.name, lang, files })
      mkdirSync(join(outDir, dir.name), { recursive: true })
      writeFileSync(join(outDir, dir.name, `lesson.${lang}.json`), `${JSON.stringify(parsed.lesson, null, 2)}\n`)
      langs.push(lang)
      firstFile ??= file
      const { id, name, group, order, image, duration, steps } = parsed.lesson
      summary ??= {
        id,
        name,
        group,
        order,
        image,
        duration,
        stepCount: steps.length,
        gradedCount: steps.filter((s) => s.rules.length > 0).length,
      }
    }
    if (!summary) continue
    const orderKey = `${summary.group}/${summary.order}`
    const sameOrder = byOrder.get(orderKey)
    if (sameOrder) {
      const lines = readFileSync(join(lessonDir, firstFile), 'utf8').split('\n')
      const line = lines.findIndex((l) => l.startsWith('order:')) + 1
      throw fileError(`${dir.name}/${firstFile}`, [
        { line, message: `order ${summary.order} in group ${summary.group} is already used by ${sameOrder}` },
      ])
    }
    byOrder.set(orderKey, summary.id)
    for (const file of files.filter((f) => IMAGE_FILE.test(f))) {
      cpSync(join(lessonDir, file), join(outDir, dir.name, file))
    }
    lessons.push({
      id: summary.id,
      name: summary.name,
      group: summary.group,
      order: summary.order,
      image: summary.image,
      duration: summary.duration,
      langs: langs.sort(),
      stepCount: summary.stepCount,
      gradedCount: summary.gradedCount,
    })
  }

  lessons.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.order - b.order)
  const index = { lessons }
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`)
  return index
}

/**
 * Parse one lesson file, rethrowing a `LessonError` with the file name attached.
 * @param {string} path Absolute or relative path to read.
 * @param {string} label File name shown in errors (`<id>/<file>`).
 * @param {{dirName: string, lang: string, files: string[]}} ctx Parser context.
 * @returns {{lesson: import('./lessons/parse-lesson.mjs').Lesson, warnings: string[]}} The parsed lesson.
 */
function parseFile(path, label, ctx) {
  try {
    return parseLesson(readFileSync(path, 'utf8'), ctx)
  } catch (e) {
    if (!(e instanceof LessonError)) throw e
    throw fileError(label, e.problems)
  }
}

/**
 * The build's error for authoring problems in one file.
 * @param {string} label File name shown in errors (`<id>/<file>`).
 * @param {{line: number, message: string}[]} problems The problems, with their lines.
 * @returns {Error & {file: string, problems: {line: number, message: string}[]}} The error to throw.
 */
function fileError(label, problems) {
  const error = new Error(`${label}:\n${new LessonError(problems).message}`)
  error.file = label
  error.problems = problems
  return error
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const index = buildLessons(join('src', 'tutorials'), join('dist', 'thingblock-resource', 'tutorials'))
    console.log(`Built ${index.lessons.length} lesson(s)`)
  } catch (e) {
    if (e.problems) for (const p of e.problems) console.error(`${e.file}:${p.line}: ${p.message}`)
    else console.error(e)
    process.exit(1)
  }
}
