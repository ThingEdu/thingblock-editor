// Regenerate the bundled example projects: src/examples/thingbot/*.tb and its index.json.
//
//   node scripts/examples/build-examples.mjs
//
// The K12 and FanRoc programs live in lessons-k12.mjs, the music ones in music.mjs, the Camera AI games
// (no board, written to src/examples/camera-ai/) in camera-ai.mjs. The ThingBot Sim programs are the reference
// solutions (`example`) of the ten thingbot-sim lessons, captured in sim-lessons.json.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as prettier from 'prettier'
import { CAMERA_AI_EXAMPLES } from './camera-ai.mjs'
import { K12_LESSONS } from './lessons-k12.mjs'
import { MUSIC_LESSONS } from './music.mjs'
import { toProject, toTb } from './tb-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const EXAMPLES = resolve(HERE, '..', '..', 'src', 'examples')
const SIM = 'Mô phỏng ThingBot Sim'

/** Extra metadata for the thingbot-sim lessons; the program and title come from the lesson itself. */
const SIM_META = {
  'bai-1': {
    slug: 'lam-quen-thingbot',
    hardware: ['Mạch ThingBot'],
    description: 'Hai khối mũ "khi Arduino khởi động" và "vòng lặp Arduino", khởi động ThingBot.',
    note: 'Khung của mọi chương trình ThingBot: khối "khi Arduino khởi động" chạy một lần, khối "vòng lặp Arduino" chạy mãi mãi.',
  },
  'bai-2': {
    slug: 'den-nhap-nhay',
    hardware: ['LED_1 trên mạch'],
    description: 'Đèn LED_1 sáng nửa giây, tắt nửa giây, lặp mãi.',
    note: 'Bật đèn, chờ, tắt đèn, chờ: vòng lặp làm đèn nhấp nháy mãi.',
  },
  'bai-3': {
    slug: 'nut-bam-bat-den',
    hardware: ['Nút SW', 'LED_1'],
    description: 'Giữ nút SW thì đèn sáng, nhả ra thì tắt (nếu … thì … nếu không thì).',
    note: 'Mỗi vòng lặp, mạch hỏi "nút SW có đang được bấm không?" rồi bật hoặc tắt đèn.',
  },
  'bai-4': {
    slug: 'man-hinh-oled',
    hardware: ['Màn OLED I2C'],
    description: 'Khởi động màn OLED, in hai dòng chữ rồi làm mới màn hình.',
    note: 'Màn OLED cắm cổng I2C. Viết chữ vào bộ nhớ màn hình rồi phải "refresh" thì chữ mới hiện ra.',
  },
  'bai-5': {
    slug: 'servo-quet',
    hardware: ['Servo S1'],
    description: 'Servo S1 quay qua lại giữa 0 và 180 độ, mỗi lượt trong 1 giây.',
    note: 'Khối "move servo … over … seconds" cho servo quay mượt tới góc đích.',
  },
  'bai-6': {
    slug: 'cam-bien-khoang-cach',
    hardware: ['Cảm biến siêu âm: TRIG IO0, ECHO IO4', 'LED_1'],
    description: 'Vật lại gần hơn 20 cm thì đèn LED_1 sáng báo động.',
    note: 'Cảm biến siêu âm cắm TRIG IO0, ECHO IO4. Vật gần hơn ngưỡng thì đèn sáng, xa thì tắt.',
  },
  'bai-7': {
    slug: 'dong-co-m1',
    hardware: ['Động cơ M1'],
    description: 'Động cơ M1 quay tới 2 giây rồi quay lùi 2 giây, lặp mãi.',
    note: 'Bật công tắc nguồn động cơ trên mạch trước khi chạy. Tốc độ từ 0% (dừng) đến 100% (nhanh nhất).',
  },
  'bai-8': {
    slug: 'xe-di-thang-re',
    hardware: ['Động cơ M1 (bánh trái), M2 (bánh phải)'],
    description: 'Hai bánh cùng quay tới 2 giây cho xe đi thẳng rồi dừng; đổi chiều một bánh để xe xoay.',
    note: 'Hai bánh quay cùng chiều: xe đi thẳng. Ngược chiều: xe xoay tại chỗ.',
  },
  'bai-9': {
    slug: 'tay-cam-ps2',
    hardware: ['Bộ thu tay cầm PS2 ở cổng PS2', 'Động cơ M1, M2'],
    description: 'Giữ nút ▲ thì xe đi tới, ▼ thì lùi, nhả ra thì dừng.',
    note: 'Khối "init PS2 on ThingBot" dùng đúng chân cổng PS2 của mạch. Đọc tay cầm ở đầu mỗi vòng lặp.',
  },
  'bai-10': {
    slug: 'xe-tranh-vat-can',
    hardware: ['Cảm biến siêu âm: TRIG IO0, ECHO IO4', 'Động cơ M1, M2'],
    description: 'Dự án: xe tự đi thẳng, gặp vật cản gần hơn 25 cm thì xoay né.',
    note: 'Ghép bài 6 và bài 8: vật ở gần thì xoay, không thì đi thẳng.',
  },
}

const simLessons = JSON.parse(readFileSync(join(HERE, 'sim-lessons.json'), 'utf8'))
const simExamples = Object.entries(simLessons.lessons).map(([key, lesson]) => {
  const meta = SIM_META[key]
  const no = String(lesson.no).padStart(2, '0')
  return {
    id: `sim-${no}-${meta.slug}`,
    title: lesson.title,
    group: SIM,
    level: lesson.no <= 5 ? 1 : 2,
    source: `thingbot-sim bài ${lesson.no}`,
    hardware: meta.hardware,
    description: meta.description,
    note: `ThingBot Sim · Bài ${lesson.no}: ${lesson.title}\n${meta.note}`,
    variables: [],
    stacks: lesson.example.blocks.blocks,
  }
})

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

await writeFolder(
  'thingbot',
  ['K12 cơ bản', 'Âm nhạc', SIM, 'FanRoc'],
  [...K12_LESSONS, ...MUSIC_LESSONS, ...simExamples],
)
// Camera AI runs in the editor without a board, so its projects save none and live in their own folder.
await writeFolder('camera-ai', ['Camera AI'], CAMERA_AI_EXAMPLES)
