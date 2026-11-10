// Regenerate the bundled example projects: src/examples/thingbot/*.tb and its index.json.
//
//   node scripts/examples/build-examples.mjs
//
// The K12 and FanRoc programs live in lessons-k12.mjs, the music ones in music.mjs. The ThingBot Sim programs are the reference
// solutions (`example`) of the ten thingbot-sim lessons, captured in sim-lessons.json.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as prettier from 'prettier'
import { K12_LESSONS } from './lessons-k12.mjs'
import { MUSIC_LESSONS } from './music.mjs'
import { toProject, toTb } from './tb-builder.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '..', '..', 'src', 'examples', 'thingbot')
const SIM = 'Mô phỏng ThingBot Sim'

/** Extra metadata for the thingbot-sim lessons; the program and title come from the lesson itself. */
const SIM_META = {
  'bai-1': {
    slug: 'lam-quen-thingbot',
    hardware: ['Mạch ThingBot (não là chip ESP32-C3)'],
    description:
      'Khung của mọi chương trình: hai khối «khi Arduino khởi động» và «vòng lặp Arduino», cùng khối «khởi động ThingBot».',
    note: 'Máy giặt, đèn giao thông, robot đều có hai phần việc: việc làm một lần lúc bật máy, và việc làm đi làm lại mãi. Khối «khi Arduino khởi động» chạy một lần lúc bật máy, như em thức dậy mở mắt. Khối «vòng lặp Arduino» chạy xong lại quay về đầu, chạy mãi mãi, như tim em đập. Não của ThingBot là chip ESP32-C3; khối «khởi động ThingBot» chuẩn bị các bộ phận của mạch trước khi dùng.',
  },
  'bai-2': {
    slug: 'den-nhap-nhay',
    hardware: ['Đèn L1 trên mạch'],
    description: 'Đèn báo nhấp nháy như đèn vàng ngã tư lúc nửa đêm: L1 sáng nửa giây, tắt nửa giây, lặp mãi.',
    note: 'Đèn vàng ngã tư lúc nửa đêm, đèn xi nhan xe máy đều chớp đều để gây chú ý. Bật đèn, đợi, tắt đèn, đợi: bốn việc này nằm trong «vòng lặp Arduino» nên lặp lại mãi. Khối «đợi» bảo não đứng yên một lúc rồi mới làm khối tiếp theo. Não ra lệnh, mạch công suất cấp điện cho đèn L1.',
  },
  'bai-3': {
    slug: 'nut-bam-bat-den',
    hardware: ['Nút SW (nối chân IO3)', 'Đèn L1'],
    description: 'Đèn pin bấm giữ: giữ nút SW thì đèn sáng, nhả ra thì tắt (khối «nếu … thì … nếu không thì»).',
    note: 'Đèn pin, chuông cửa, nút thang máy: cách đơn giản nhất để người "nói" với máy là một nút bấm. Nút SW giống làn da: nó là đầu vào, báo tin cho não qua chân IO3. Chân là sợi dây nối từ não ra ngoài, mỗi chân có một số. Đèn L1 là đầu ra, nhận lệnh từ não. Mỗi vòng lặp, não hỏi "nút SW có đang được bấm không?": có thì bật đèn, không thì tắt.',
  },
  'bai-4': {
    slug: 'man-hinh-oled',
    hardware: ['Màn OLED (cắm cổng I2C: hai dây để não nói chuyện với màn)'],
    description: 'Bảng chào: khởi động màn OLED, in hai dòng chữ rồi đưa lên màn hình.',
    note: 'Nồi cơm điện, đồng hồ điện tử, máy giặt đều có màn hình nhỏ để báo cho người dùng. Màn OLED nối với não bằng hai sợi dây I2C (SDA ở IO8, SCL ở IO9). Nhiều thiết bị dùng chung hai dây này, nên mỗi thiết bị có một địa chỉ như số nhà; màn OLED ở số nhà 0x3C. Khối «OLED in» viết chữ vào giấy nháp; phải có khối «hiện lên màn OLED» thì nháp mới được chép lên màn thật. Khối «đặt con trỏ OLED» chọn chỗ đặt bút: x đếm từ trái sang, y đếm từ trên xuống.',
  },
  'bai-5': {
    slug: 'servo-quet',
    hardware: ['Servo S1 (động cơ quay đúng một góc rồi đứng lại)'],
    description: 'Servo S1 quét qua lại giữa 0 và 180 độ, mỗi lượt 1 giây, như thanh chắn bãi xe nhấc lên hạ xuống.',
    note: 'Thanh chắn bãi xe nhấc lên rồi hạ xuống, cánh tay robot gập khuỷu. Servo làm được kiểu chuyển động này: nó là động cơ biết quay đúng một góc rồi đứng lại, như khớp tay. Não ra lệnh qua hai dây I2C, mạch công suất cấp điện cho servo. Khối «quay servo S1 tới góc … độ trong … giây» cho servo quay mượt tới góc đích, quay xong mới làm khối tiếp theo.',
  },
  'bai-6': {
    slug: 'cam-bien-khoang-cach',
    hardware: ['Cảm biến siêu âm đo khoảng cách (chân TRIG IO0, ECHO IO4)', 'Đèn L1'],
    description: 'Cảm biến lùi xe: vật lại gần hơn 20 cm thì đèn L1 sáng báo động.',
    note: 'Ô tô có cảm biến lùi: xe tới gần tường thì kêu báo. Cảm biến siêu âm phát tiếng kêu rất cao (tai người không nghe được) rồi đo thời gian tiếng vang dội lại, như con dơi. Chân TRIG (IO0) ra lệnh phát tiếng, chân ECHO (IO4) nghe tiếng vang. Ngưỡng là cái mốc để quyết định: vật gần hơn 20 cm thì đèn sáng, xa hơn thì tắt.',
  },
  'bai-7': {
    slug: 'dong-co-m1',
    hardware: ['Động cơ M1'],
    description: 'Băng chuyền chạy tới 2 giây rồi lùi 2 giây: động cơ M1 đổi chiều, lặp mãi.',
    note: 'Quạt, máy xay, băng chuyền đều quay nhờ động cơ. Động cơ là "cơ bắp" của robot. Não ra lệnh, mạch công suất cấp điện cho động cơ. Tốc độ tính theo phần trăm, từ 0% (dừng) đến 100% (nhanh nhất): mạch công suất bật tắt điện rất nhanh, bật càng lâu thì quay càng nhanh. Bật công tắc nguồn động cơ trên mạch trước khi chạy.',
  },
  'bai-8': {
    slug: 'xe-di-thang-re',
    hardware: ['Động cơ M1 (bánh trái), M2 (bánh phải)'],
    description: 'Xe đi thẳng 2 giây rồi dừng; đổi chiều một bánh để xe xoay tại chỗ.',
    note: 'Xe lăn điện, robot hút bụi, xe tăng đồ chơi đều rẽ bằng cách cho hai bánh quay khác nhau. M1 là bánh trái, M2 là bánh phải. Hai bánh quay cùng chiều: xe đi thẳng. Ngược chiều: xe xoay tại chỗ. Các khối nằm trong «khi Arduino khởi động» nên xe chỉ chạy một lần lúc bật máy.',
  },
  'bai-9': {
    slug: 'tay-cam-ps2',
    hardware: ['Tay cầm PS2 (tay cầm chơi game không dây; bộ thu cắm cổng PS2)', 'Động cơ M1, M2'],
    description: 'Xe điều khiển từ xa: giữ nút ▲ thì xe đi tới, ▼ thì lùi, nhả ra thì dừng.',
    note: 'Xe đồ chơi điều khiển từ xa nghe lệnh từ tay cầm. Tay cầm PS2 là tay cầm chơi game không dây; bộ thu cắm cổng PS2 trên mạch. Khối «khởi động tay cầm PS2 trên ThingBot» dùng đúng chân của cổng PS2, em không phải chọn chân. Đầu mỗi vòng lặp, khối «đọc dữ liệu tay cầm PS2» hỏi tay cầm, rồi khối «nút … của PS2 đang bấm?» trả lời đúng hoặc sai.',
  },
  'bai-10': {
    slug: 'xe-tranh-vat-can',
    hardware: ['Cảm biến siêu âm đo khoảng cách (chân TRIG IO0, ECHO IO4)', 'Động cơ M1, M2'],
    description: 'Dự án robot tự lái: xe tự đi thẳng, gặp vật cản gần hơn 25 cm thì xoay né.',
    note: 'Robot hút bụi, xe tự hành trong nhà kho tự tránh vật cản. Dự án này ghép bài 6 và bài 8: cảm biến siêu âm là đôi mắt đo khoảng cách bằng tiếng vang, hai bánh M1, M2 là đôi chân. Ngưỡng 25 cm là cái mốc để quyết định: vật ở gần hơn thì xoay, không thì đi thẳng.',
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

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const examples = []
for (const lesson of [...K12_LESSONS, ...MUSIC_LESSONS, ...simExamples]) {
  const project = toProject(lesson)
  const file = `${lesson.id}.tb`
  writeFileSync(join(OUT, file), await toTb(project))
  examples.push({
    id: lesson.id,
    file,
    title: lesson.title,
    group: lesson.group,
    level: lesson.level,
    description: lesson.description,
    device: project.board.device,
    peripherals: project.board.peripherals,
    hardware: lesson.hardware,
    source: lesson.source,
  })
}

const index = { groups: ['K12 cơ bản', 'Âm nhạc', SIM, 'FanRoc'], examples }
// Format with the package's Prettier config so the generated index passes `npm run lint` as written.
const prettierOptions = await prettier.resolveConfig(join(OUT, 'index.json'))
writeFileSync(
  join(OUT, 'index.json'),
  await prettier.format(JSON.stringify(index), { ...prettierOptions, parser: 'json' }),
)
console.log(`Wrote ${examples.length} examples to ${OUT}`)
