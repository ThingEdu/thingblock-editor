// A lesson is Markdown a teacher writes: front matter, one `##` per step, `> hint:` hints, `check:`
// rules and an optional `point at:` tour anchor. The build turns it into JSON the editor renders, and
// every authoring mistake fails here, not on a learner's screen.
import { readdirSync } from 'node:fs'
import { parseRule, RuleSyntaxError } from '../../../thingblock-sim/src/checker/rules.ts'
import { TOUR_MARKERS } from './tour-markers.mjs'

const GROUPS = ['getting-started', 'outputs', 'motors', 'inputs']
const HINT_START = /^>\s*hint:\s*(.+)$/i
const REQUIRED = ['id', 'name', 'group', 'order', 'board']
const IMAGE_FILE = /\.(png|gif)$/
/** Peripheral packs a lesson can name in `peripherals:`, by folder name. */
const PERIPHERALS = readdirSync(new URL('../../src/extensions/peripheral/', import.meta.url), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

export class LessonError extends Error {
  /** @param {{line: number, message: string}[]} problems Every authoring problem found, with its line. */
  constructor(problems) {
    super(problems.map((p) => `line ${p.line}: ${p.message}`).join('\n'))
    this.name = 'LessonError'
    this.problems = problems
  }
}

/**
 * Split inline Markdown into runs: bold (`**x**`, `__x__`) and italic (`*x*`, `_x_`) only. Underscore
 * markers must sit at a word edge so `snake_case_names` stay plain.
 * @param {string} text One line of Markdown.
 * @returns {{text: string, bold?: true, italic?: true}[]} The runs, in order.
 */
export function parseRuns(text) {
  const runs = []
  const edge = String.raw`(?<![\p{L}\p{N}_])`
  const after = String.raw`(?![\p{L}\p{N}_])`
  const re = new RegExp(String.raw`\*\*(.+?)\*\*|${edge}__(.+?)__${after}|\*(.+?)\*|${edge}_(.+?)_${after}`, 'gu')
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) })
    const bold = m[1] ?? m[2]
    if (bold !== undefined) runs.push({ text: bold, bold: true })
    else runs.push({ text: m[3] ?? m[4], italic: true })
    last = m.index + m[0].length
  }
  if (last < text.length) runs.push({ text: text.slice(last) })
  return runs
}

const parseFrontMatter = (lines, problems) => {
  const meta = {}
  const metaLine = {}
  if (lines[0] !== '---') {
    problems.push({ line: 1, message: 'the file must start with "---" (front matter)' })
    return { meta, metaLine, end: 0 }
  }
  let i = 1
  for (; i < lines.length && lines[i] !== '---'; i++) {
    const m = lines[i].match(/^([a-z-]+):\s*(.*?)\s*(?:\s#(?:\s.*)?)?$/)
    if (m) {
      meta[m[1]] = m[2]
      metaLine[m[1]] = i + 1
    } else if (lines[i].trim()) {
      problems.push({ line: i + 1, message: `cannot parse front matter line "${lines[i]}"` })
    }
  }
  return { meta, metaLine, end: i + 1 }
}

/**
 * Parse one lesson, throwing a LessonError that lists every authoring problem with its line number.
 * @param {string} markdown The lesson file's text.
 * @param {{ dirName: string, lang: string, files: string[] }} ctx The lesson folder name, language
 *   and the file names in it (images and the starter project are checked against them).
 * @returns {{ lesson: object, warnings: string[] }} The Lesson JSON the editor renders.
 */
export function parseLesson(markdown, ctx) {
  const problems = []
  const warnings = []
  const lines = markdown
    .normalize('NFC')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
  const { meta, metaLine, end } = parseFrontMatter(lines, problems)

  for (const key of REQUIRED) {
    if (!meta[key]) problems.push({ line: 1, message: `missing "${key}" in front matter` })
  }
  if (meta.id && meta.id !== ctx.dirName) {
    problems.push({ line: metaLine.id, message: `id "${meta.id}" differs from the folder name "${ctx.dirName}"` })
  }
  if (meta.group && !GROUPS.includes(meta.group)) {
    problems.push({ line: metaLine.group, message: `group "${meta.group}" is not one of ${GROUPS.join('|')}` })
  }
  if (meta.start && !ctx.files.includes(meta.start)) {
    problems.push({ line: metaLine.start, message: `start file "${meta.start}" not found` })
  }
  if (meta.image && !(IMAGE_FILE.test(meta.image) && ctx.files.includes(meta.image))) {
    problems.push({
      line: metaLine.image,
      message: `image "${meta.image}" must be a .png or .gif file in the lesson folder`,
    })
  }

  const peripherals = meta.peripherals
    ? meta.peripherals
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : []
  for (const id of peripherals) {
    if (!PERIPHERALS.includes(id)) {
      problems.push({
        line: metaLine.peripherals,
        message: `peripheral "${id}" is not one of ${PERIPHERALS.join('|')}`,
      })
    }
  }

  for (const key of ['order', 'duration']) {
    if (meta[key] && !/^\d+$/.test(meta[key])) {
      problems.push({ line: metaLine[key], message: `${key} must be a number` })
    }
  }

  const steps = []
  let hintText = null
  let step = null
  let paragraph = []
  let list = null
  const flushParagraph = () => {
    if (paragraph.length) step.body.push({ type: 'p', runs: parseRuns(paragraph.join(' ')) })
    paragraph = []
  }
  const flushList = () => {
    if (list) step.body.push({ type: 'list', items: list })
    list = null
  }

  for (let i = end; i < lines.length; i++) {
    const line = lines[i]
    const lineNo = i + 1
    let m
    if (hintText !== null && !HINT_START.test(line) && (m = line.match(/^>\s?(.*)$/)) && m[1].trim()) {
      hintText += ` ${m[1].trim()}`
      step.hints[step.hints.length - 1] = parseRuns(hintText)
      continue
    }
    hintText = null
    if ((m = line.match(/^(#{3,})\s/))) {
      problems.push({ line: lineNo, message: 'use ## for steps, not ###' })
      continue
    }
    if ((m = line.match(/^##\s+(.+?)\s*$/))) {
      if (step) {
        flushParagraph()
        flushList()
      }
      step = { title: m[1], body: [], hints: [], rules: [], pointAt: null }
      steps.push(step)
      continue
    }
    if (!step) {
      if (line.trim()) {
        problems.push({ line: lineNo, message: 'content must come after a step heading "## …"' })
      }
      continue
    }
    if ((m = line.match(/^check:\s*(.+)$/i))) {
      flushParagraph()
      flushList()
      try {
        step.rules.push(parseRule(m[1]))
      } catch (e) {
        problems.push({
          line: lineNo,
          message: e instanceof RuleSyntaxError ? e.message : String(e),
        })
      }
      continue
    }
    if ((m = line.match(/^point at:\s*(\S+)\s*$/i))) {
      flushParagraph()
      flushList()
      if (TOUR_MARKERS.includes(m[1])) step.pointAt = m[1]
      else {
        problems.push({
          line: lineNo,
          message: `unknown anchor "${m[1]}"; anchors: ${TOUR_MARKERS.join(', ')}`,
        })
      }
      continue
    }
    if ((m = line.match(HINT_START))) {
      flushParagraph()
      flushList()
      hintText = m[1].trim()
      step.hints.push(parseRuns(hintText))
      continue
    }
    if ((m = line.match(/^!\[(.*?)\]\((.+?)\)\s*$/))) {
      flushParagraph()
      flushList()
      if (!ctx.files.includes(m[2])) {
        problems.push({ line: lineNo, message: `image "${m[2]}" not found` })
      }
      step.body.push({ type: 'img', src: m[2], alt: m[1] })
      continue
    }
    if ((m = line.match(/^(?:[-*]|\d+\.)\s+(.+)$/))) {
      flushParagraph()
      ;(list ??= []).push(parseRuns(m[1]))
      continue
    }
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    flushList()
    paragraph.push(line.trim())
  }
  if (step) {
    flushParagraph()
    flushList()
  }
  if (!steps.length) problems.push({ line: lines.length, message: 'the lesson has no steps ("## …")' })

  if (problems.length) throw new LessonError(problems)

  return {
    lesson: {
      id: meta.id,
      name: meta.name,
      group: meta.group,
      order: Number(meta.order),
      board: meta.board,
      start: meta.start ?? null,
      image: meta.image ?? null,
      peripherals,
      duration: meta.duration ? Number(meta.duration) : null,
      lang: ctx.lang,
      steps,
    },
    warnings,
  }
}
