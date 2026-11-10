// Wrap a project.json into the .tb (sb3 zip) the editor saves, for lesson test fixtures:
//   node scripts/lessons/make-tb.mjs in.project.json out.tb
// The project.json may be blocks-only; the .tb gets the rest of an editor save (costume, board, packs)
// so a teacher can open it. The board and extra devices come from the lesson's `bai.vi.md` next to
// `kiem-thu/`, when there is one.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { completeProject, toTb } from '../examples/tb-builder.mjs'

const [, , input, output] = process.argv
const lessonFile = join(dirname(input), '..', 'bai.vi.md')
let device = 'thingbot'
let devices = []
if (existsSync(lessonFile)) {
  const front = /^---\n([\s\S]*?)\n---/.exec(readFileSync(lessonFile, 'utf8'))?.[1] ?? ''
  device = /^bo:\s*(\S+)/m.exec(front)?.[1] ?? device
  devices = (/^thiet-bi:\s*(.+)$/m.exec(front)?.[1] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
// `bo: khong` lessons (Camera AI) run without a board, so their fixtures save none.
const project = completeProject(JSON.parse(readFileSync(input, 'utf8')), device === 'khong' ? null : device, devices)
writeFileSync(output, await toTb(project))
