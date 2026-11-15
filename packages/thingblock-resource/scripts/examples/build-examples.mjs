// Regenerate the bundled example projects: src/examples/<device>/*.tb and each folder's index.json.
//
//   node scripts/examples/build-examples.mjs
//
// The K12 and FanRoc programs live in lessons-k12.mjs, the music ones in music.mjs, the CoBot ones (written to
// src/examples/cobot/) in cobot.mjs, the Camera AI games (no board, written to src/examples/camera-ai/) in
// camera-ai.mjs. The ThingBot Sim programs are the reference solutions (`example`) of the ten thingbot-sim
// lessons, captured in sim-lessons.json.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
const SIM = 'Mô phỏng ThingBot Sim'

/** Extra metadata for the thingbot-sim lessons; the program and title come from the lesson itself. */
const SIM_META = {
  'bai-1': {
    slug: 'lam-quen-thingbot',
    hardware: ['Mạch ThingBot (não là chip ESP32-C3)'],
    description:
      'Khung của mọi chương trình: hai khối «khi Arduino khởi động» và «vòng lặp Arduino», cùng khối «khởi động ThingBot».',
    note: 'Nhiệm vụ: dựng khung của mọi chương trình, chưa cần làm gì thêm.\nMáy giặt, đèn giao thông, robot đều có hai phần việc: việc làm một lần lúc bật máy, và việc làm đi làm lại mãi.\nKhối «khi Arduino khởi động» chạy một lần lúc bật máy, như em thức dậy mở mắt.\nKhối «vòng lặp Arduino» chạy xong lại quay về đầu, chạy mãi, như tim em đập.\nNão của ThingBot là chip ESP32-C3. Khối «khởi động ThingBot» chuẩn bị các bộ phận của mạch trước khi dùng.',
  },
  'bai-2': {
    slug: 'den-nhap-nhay',
    hardware: ['Đèn L1 trên mạch'],
    description: 'Đèn báo nhấp nháy như đèn vàng ngã tư lúc nửa đêm: L1 sáng nửa giây, tắt nửa giây, lặp mãi.',
    note: 'Nhiệm vụ: làm đèn vàng ngã tư lúc nửa đêm. Đèn chớp đều để gây chú ý, như đèn xi nhan xe máy.\nBật đèn, đợi, tắt đèn, đợi: bốn việc này nằm trong «vòng lặp Arduino» nên lặp lại mãi.\nKhối «đợi» bảo não đứng yên một lúc rồi mới làm khối tiếp theo.\nNão ra lệnh, mạch công suất cấp điện cho đèn L1.\nThử: đổi 0,5 thành 0,1 xem đèn chớp nhanh thế nào.',
  },
  'bai-3': {
    slug: 'nut-bam-bat-den',
    hardware: ['Nút SW (nối chân IO3)', 'Đèn L1'],
    description: 'Đèn pin bấm giữ: giữ nút SW thì đèn sáng, nhả ra thì tắt (khối «nếu … thì … nếu không thì»).',
    note: 'Nhiệm vụ: làm đèn pin bấm giữ. Giữ nút SW thì đèn sáng, nhả ra thì tắt.\nĐèn pin, chuông cửa, nút thang máy: cách đơn giản nhất để người "nói" với máy là một nút bấm.\nNút SW giống làn da: nó là đầu vào, báo tin cho não qua chân IO3. Chân là sợi dây nối từ não ra ngoài, mỗi chân có một số.\nĐèn L1 là đầu ra, nhận lệnh từ não.\nMỗi vòng lặp, não hỏi "nút SW có đang được bấm không?": có thì bật đèn, không thì tắt.',
  },
  'bai-4': {
    slug: 'man-hinh-oled',
    hardware: ['Màn OLED (cắm cổng I2C)'],
    description: 'Bảng chào: khởi động màn OLED, in hai dòng chữ rồi đưa lên màn hình.',
    note: 'Nhiệm vụ: làm bảng chào trên màn hình nhỏ, như màn của nồi cơm điện hay đồng hồ điện tử.\nMàn OLED nối với não bằng hai sợi dây I2C (SDA ở IO8, SCL ở IO9), như hai người dùng chung một sợi dây điện thoại lon.\nNhiều thiết bị dùng chung hai dây này, nên mỗi thiết bị có một địa chỉ như số nhà. Màn OLED ở số nhà 0x3C.\nKhối «OLED in» viết chữ vào giấy nháp. Phải có khối «hiện lên màn OLED» thì nháp mới được chép lên màn thật.\nKhối «đặt con trỏ OLED» chọn chỗ đặt bút: x đếm từ trái sang, y đếm từ trên xuống. Màn chỉ hiện chữ không dấu.',
  },
  'bai-5': {
    slug: 'servo-quet',
    hardware: ['Servo S1'],
    description: 'Servo S1 quét qua lại giữa 0 và 180 độ, mỗi lượt 1 giây, như thanh chắn bãi xe nhấc lên hạ xuống.',
    note: 'Nhiệm vụ: làm thanh chắn bãi xe nhấc lên rồi hạ xuống, mãi.\nServo là động cơ biết quay đúng một góc rồi đứng lại, như khớp tay. Cánh tay robot gập khuỷu cũng nhờ servo.\nNão ra lệnh qua hai dây I2C, mạch công suất cấp điện cho servo.\nKhối «quay servo S1 tới góc … độ trong … giây» cho servo quay mượt tới góc đích. Quay xong mới làm khối tiếp theo.\nThử: đổi 180 thành 90 xem thanh chắn nhấc tới đâu.',
  },
  'bai-6': {
    slug: 'mat-hong-ngoai',
    hardware: ['Mắt hồng ngoại (cắm cổng cảm biến, chân tín hiệu IO4)', 'Đèn L1'],
    description: 'Mắt nhận bóng FanRoc: bóng tối màu (xanh dương, đen) thì đèn L1 sáng, bóng sáng màu thì tắt.',
    note: 'Nhiệm vụ: robot FanRoc phải biết quả bóng trước mặt là quả tối màu hay sáng màu. Tối màu thì đèn L1 sáng.\nMắt hồng ngoại giống em rọi đèn pin vào đồ vật trong phòng tối: đồ màu sáng hắt ánh sáng lại nhiều, đồ màu tối nuốt ánh sáng.\nMắt cắm ở cổng cảm biến, chân tín hiệu nối IO4. Nó đọc ra một số từ 0 tới 4095: bóng trắng khoảng 3500, bóng đen khoảng 300.\nNgưỡng là cái mốc để quyết định, như vạch mức trên cốc đo. Ngưỡng 1500: nhỏ hơn là bóng tối màu, đèn sáng.\nTrong mô phỏng, chọn quả bóng ở thanh bóng dưới mạch ảo.',
  },
  'bai-7': {
    slug: 'dong-co-m1',
    hardware: ['Động cơ M1'],
    description: 'Băng chuyền chạy tới 2 giây rồi lùi 2 giây: động cơ M1 đổi chiều, lặp mãi.',
    note: 'Nhiệm vụ: làm băng chuyền chạy tới 2 giây rồi lùi 2 giây, lặp mãi.\nQuạt, máy xay, băng chuyền đều quay nhờ động cơ. Động cơ là "cơ bắp" của robot.\nNão ra lệnh, mạch công suất cấp điện cho động cơ.\nTốc độ tính theo phần trăm, từ 0% (dừng) đến 100% (nhanh nhất). Mạch công suất bật tắt điện rất nhanh: bật càng lâu thì quay càng nhanh.\nBật công tắc nguồn động cơ trên mạch trước khi chạy.',
  },
  'bai-8': {
    slug: 'xe-di-thang-re',
    hardware: ['Động cơ M1 (bánh trái), M2 (bánh phải)'],
    description: 'Xe đi thẳng 2 giây rồi dừng. Thử đổi chiều một bánh để xe xoay tại chỗ.',
    note: 'Nhiệm vụ: cho xe đi thẳng 2 giây rồi dừng.\nXe lăn điện, robot hút bụi, xe tăng đồ chơi đều rẽ bằng cách cho hai bánh quay khác nhau.\nM1 là bánh trái, M2 là bánh phải. Hai bánh quay cùng chiều: xe đi thẳng. Ngược chiều: xe xoay tại chỗ.\nCác khối nằm trong «khi Arduino khởi động» nên xe chỉ chạy một lần lúc bật máy.\nThử: đổi "tiến" của M2 thành "lùi" xem xe xoay tại chỗ.',
  },
  'bai-9': {
    slug: 'tay-cam-ps2',
    hardware: ['Tay cầm PS2 (tay cầm chơi game không dây; bộ thu cắm cổng PS2)', 'Động cơ M1, M2'],
    description: 'Xe điều khiển từ xa: giữ nút ▲ thì xe đi tới, ▼ thì lùi, nhả ra thì dừng.',
    note: 'Nhiệm vụ: làm xe điều khiển từ xa. Giữ nút ▲ thì xe đi tới, ▼ thì lùi, nhả ra thì dừng.\nTay cầm PS2 là tay cầm chơi game không dây; bộ thu cắm cổng PS2 trên mạch.\nKhối «khởi động tay cầm PS2 trên ThingBot» dùng đúng chân của cổng PS2, em không phải chọn chân.\nĐầu mỗi vòng lặp, khối «đọc dữ liệu tay cầm PS2» hỏi tay cầm. Rồi khối «nút … của PS2 đang bấm?» trả lời đúng hoặc sai.\nThử: thêm nút ◀ và ▶ để xe rẽ.',
  },
  'bai-10': {
    slug: 'day-chuyen-phan-loai',
    hardware: ['Mắt hồng ngoại (chân tín hiệu IO4)', 'Động cơ M1 (kéo băng chuyền)', 'Servo S1 (cần gạt)'],
    description: 'Dự án máy soi trứng: băng chuyền chở trứng qua mắt hồng ngoại, trứng hỏng (tối) bị servo gạt ra.',
    note: 'Nhiệm vụ: làm máy soi trứng của trại gà. Quả tốt sáng trong, quả hỏng tối đục; máy gạt quả hỏng ra.\nDự án này ghép bài 5, bài 6 và bài 7: động cơ M1 kéo băng chuyền, mắt hồng ngoại IO4 nhìn từng quả, servo S1 làm cần gạt.\nSố đọc nhỏ hơn ngưỡng 1500 là trứng hỏng: servo hạ 90 độ, gạt trứng xuống thùng loại. Còn lại servo nhấc 0 độ cho trứng đi tiếp.\nKhối đợi phải thật ngắn để não kịp nhìn từng quả.\nTrong mô phỏng, chọn băng chuyền trứng ở thanh dưới mạch ảo.',
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
await writeFolder('cobot', ['CoBot'], COBOT_EXAMPLES)
