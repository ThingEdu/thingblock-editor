// Regenerate the bundled example projects: src/examples/<device>/*.tb and each folder's index.json.
//
//   node scripts/examples/build-examples.mjs
//
// The K12 and FanRoc programs live in lessons-k12.mjs, the music ones in music.mjs, the CoBot ones (written to
// src/examples/cobot/) in cobot.mjs, the Camera AI games (no board, written to src/examples/camera-ai/) in
// camera-ai.mjs.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as prettier from 'prettier'
import { CAMERA_AI_EXAMPLES } from './camera-ai.mjs'
import { COBOT_EXAMPLES } from './cobot.mjs'
import { K12_LESSONS } from './lessons-k12.mjs'
import { MUSIC_LESSONS } from './music.mjs'
import { toProject, toTb } from './tb-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const EXAMPLES = resolve(HERE, '..', '..', 'src', 'examples')
/**
 * Write one device folder: its `.tb` files and its index.json.
 * @param {string} folder The folder under src/examples.
 * @param {string[]} groups The groups, in the order the library shows them.
 * @param {object[]} programs The examples, each an index record plus its program.
 */
async function writeFolder(folder, groups, programs) {
  const out = join(EXAMPLES, folder)
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  const examples = []
  for (const lesson of programs) {
    const project = toProject(lesson)
    const file = `${lesson.id}.tb`
    writeFileSync(join(out, file), await toTb(project))
    examples.push({
      id: lesson.id,
      file,
      title: lesson.title,
      group: lesson.group,
      level: lesson.level,
      description: lesson.description,
      device: project.board?.device ?? null,
      peripherals: project.board?.peripherals ?? [],
      hardware: lesson.hardware,
      source: lesson.source,
    })
  }
  // Format with the package's Prettier config so the generated index passes `npm run lint` as written.
  const prettierOptions = await prettier.resolveConfig(join(out, 'index.json'))
  writeFileSync(
    join(out, 'index.json'),
    await prettier.format(JSON.stringify({ groups, examples }), { ...prettierOptions, parser: 'json' }),
  )
  console.log(`Wrote ${examples.length} examples to ${out}`)
}

await writeFolder('thingbot', ['K12 cơ bản', 'Âm nhạc', 'FanRoc'], [...K12_LESSONS, ...MUSIC_LESSONS])
// Camera AI runs in the editor without a board, so its projects save none and live in their own folder.
await writeFolder('camera-ai', ['Camera AI'], CAMERA_AI_EXAMPLES)
await writeFolder('cobot', ['CoBot'], COBOT_EXAMPLES)
