// A lesson is Markdown a teacher writes: front matter, one `##` per step, `> gợi ý:` hints, `kiểm:`
// rules and an optional `chỉ vào:` tour anchor. The build turns it into JSON the editor renders, and
// every authoring mistake fails here, not on a learner's screen.
import { parseRule, RuleSyntaxError } from '../../../thingblock-sim/src/checker/rules.ts'
import { TOUR_MARKERS } from './tour-markers.mjs'

const GROUPS = ['lam-quen', 'dau-ra', 'dong-co', 'dau-vao']
const HINT_START = /^>\s*gợi ý:\s*(.+)$/i
const REQUIRED = ['ma', 'ten', 'nhom', 'thu-tu', 'bo']

export class LessonError extends Error {
  /** @param {{line: number, message: string}[]} problems Every authoring problem found, with its line. */
  constructor(problems) {
    super(problems.map((p) => `dòng ${p.line}: ${p.message}`).join('\n'))
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
    problems.push({ line: 1, message: 'tệp phải bắt đầu bằng "---" (front matter)' })
    return { meta, metaLine, end: 0 }
  }
  let i = 1
  for (; i < lines.length && lines[i] !== '---'; i++) {
    const m = lines[i].match(/^([a-z-]+):\s*(.*?)\s*(?:\s#(?:\s.*)?)?$/)
    if (m) {
      meta[m[1]] = m[2]
      metaLine[m[1]] = i + 1
    } else if (lines[i].trim()) {
      problems.push({ line: i + 1, message: `không hiểu dòng front matter "${lines[i]}"` })
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
    if (!meta[key]) problems.push({ line: 1, message: `thiếu "${key}" trong front matter` })
  }
  if (meta.ma && meta.ma !== ctx.dirName) {
    problems.push({ line: metaLine.ma, message: `ma "${meta.ma}" khác tên thư mục "${ctx.dirName}"` })
  }
  if (meta.nhom && !GROUPS.includes(meta.nhom)) {
    problems.push({ line: metaLine.nhom, message: `nhom "${meta.nhom}" không thuộc ${GROUPS.join('|')}` })
  }
  if (meta['bat-dau'] && !ctx.files.includes(meta['bat-dau'])) {
    problems.push({ line: metaLine['bat-dau'], message: `không thấy tệp bat-dau "${meta['bat-dau']}"` })
  }

  for (const key of ['thu-tu', 'thoi-luong']) {
    if (meta[key] && !/^\d+$/.test(meta[key])) {
      problems.push({ line: metaLine[key], message: `${key} phải là số` })
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
      problems.push({ line: lineNo, message: 'chỉ dùng ## cho bước, không dùng ###' })
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
        problems.push({ line: lineNo, message: 'nội dung phải nằm sau một tiêu đề bước "## …"' })
      }
      continue
    }
    if ((m = line.match(/^kiểm:\s*(.+)$/i))) {
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
    if ((m = line.match(/^chỉ vào:\s*(\S+)\s*$/i))) {
      flushParagraph()
      flushList()
      if (TOUR_MARKERS.includes(m[1])) step.pointAt = m[1]
      else {
        problems.push({
          line: lineNo,
          message: `mốc "${m[1]}" không có; các mốc: ${TOUR_MARKERS.join(', ')}`,
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
        problems.push({ line: lineNo, message: `không thấy ảnh "${m[2]}"` })
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
  if (!steps.length) problems.push({ line: lines.length, message: 'bài không có bước nào ("## …")' })

  if (problems.length) throw new LessonError(problems)

  return {
    lesson: {
      ma: meta.ma,
      ten: meta.ten,
      nhom: meta.nhom,
      thuTu: Number(meta['thu-tu']),
      bo: meta.bo,
      batDau: meta['bat-dau'] ?? null,
      thoiLuong: meta['thoi-luong'] ? Number(meta['thoi-luong']) : null,
      lang: ctx.lang,
      steps,
    },
    warnings,
  }
}
