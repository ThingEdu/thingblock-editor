// Build every lesson under src/tutorials/<ma>/ into dist/thingblock-resource/tutorials/<ma>/bai.<lang>.json,
// copy its images, and write tutorials/index.json for the editor's lesson library. Any authoring error
// fails the pack build with file and line. Run after copy-assets, before zip-pack.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LessonError, parseLesson } from './lessons/parse-lesson.mjs'

const GROUP_ORDER = ['lam-quen', 'dau-ra', 'dong-co', 'dau-vao']
const LESSON_FILE = /^bai\.([a-z]{2})\.md$/
const IMAGE_FILE = /\.(png|gif)$/

/**
 * Build all lessons found in `srcDir` into `outDir` and write the lesson index.
 * @param {string} srcDir Folder holding one sub-folder per lesson (`kiem-thu/` folders inside them are skipped).
 * @param {string} outDir Folder receiving `<ma>/bai.<lang>.json`, the lesson images and `index.json`.
 * @returns {{lessons: {ma: string, ten: string, nhom: string, thuTu: number, thoiLuong: number | null,
 *   langs: string[], stepCount: number, gradedCount: number}[]}} The written index.
 * @throws {Error} A lesson failed to parse; the message names the file, `file` and `problems` carry the detail.
 */
export function buildLessons(srcDir, outDir) {
  const lessons = []
  const dirs = existsSync(srcDir) ? readdirSync(srcDir, { withFileTypes: true }).filter((d) => d.isDirectory()) : []

  for (const dir of dirs) {
    const lessonDir = join(srcDir, dir.name)
    const files = readdirSync(lessonDir)
    const langs = []
    let summary = null
    for (const file of files) {
      const lang = file.match(LESSON_FILE)?.[1]
      if (!lang) continue
      const parsed = parseFile(join(lessonDir, file), `${dir.name}/${file}`, { dirName: dir.name, lang, files })
      mkdirSync(join(outDir, dir.name), { recursive: true })
      writeFileSync(join(outDir, dir.name, `bai.${lang}.json`), `${JSON.stringify(parsed.lesson, null, 2)}\n`)
      langs.push(lang)
      const { ma, ten, nhom, thuTu, thoiLuong, steps } = parsed.lesson
      summary ??= {
        ma,
        ten,
        nhom,
        thuTu,
        thoiLuong,
        stepCount: steps.length,
        gradedCount: steps.filter((s) => s.rules.length > 0).length,
      }
    }
    if (!summary) continue
    for (const file of files.filter((f) => IMAGE_FILE.test(f))) {
      cpSync(join(lessonDir, file), join(outDir, dir.name, file))
    }
    lessons.push({
      ma: summary.ma,
      ten: summary.ten,
      nhom: summary.nhom,
      thuTu: summary.thuTu,
      thoiLuong: summary.thoiLuong,
      langs: langs.sort(),
      stepCount: summary.stepCount,
      gradedCount: summary.gradedCount,
    })
  }

  lessons.sort((a, b) => GROUP_ORDER.indexOf(a.nhom) - GROUP_ORDER.indexOf(b.nhom) || a.thuTu - b.thuTu)
  const index = { lessons }
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`)
  return index
}

/**
 * Parse one lesson file, rethrowing a `LessonError` with the file name attached.
 * @param {string} path Absolute or relative path to read.
 * @param {string} label File name shown in errors (`<ma>/<file>`).
 * @param {{dirName: string, lang: string, files: string[]}} ctx Parser context.
 * @returns {{lesson: import('./lessons/parse-lesson.mjs').Lesson, warnings: string[]}} The parsed lesson.
 */
function parseFile(path, label, ctx) {
  try {
    return parseLesson(readFileSync(path, 'utf8'), ctx)
  } catch (e) {
    if (!(e instanceof LessonError)) throw e
    const error = new Error(`${label}:\n${e.message}`)
    error.file = label
    error.problems = e.problems
    throw error
  }
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
