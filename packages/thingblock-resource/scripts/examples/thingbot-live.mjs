// The "ThingBot Live" examples: programs that run in the editor and drive a ThingBot over Bluetooth with
// the ThingBot Telemetrix blocks, so nothing is compiled or uploaded. They need no board selected (the
// robot only has to run its live firmware), so build-examples.mjs writes them without `board` into their
// own folder, and the live-only tablet editor lists them. Each entry is an index.json record plus the
// program, in the scratch-blocks serialization tb-builder reads.
//
// Every block sends one Bluetooth message, so each loop waits a little between rounds: a loop with no
// wait would flood the link and the robot would lag behind the program.
import { cameraBlocks } from './camera-ai.mjs'

const N = (n) => ({ shadow: { type: 'math_number', fields: { NUM: String(n) } } })
const T = (s) => ({ shadow: { type: 'text', fields: { TEXT: s } } })
// A reporter dropped into a number or text input keeps the input's shadow underneath, as the editor saves it.
const num = (block) => ({ block, shadow: N(0).shadow })
const str = (block) => ({ block, shadow: T('').shadow })
const bool = (block) => ({ block })
const numIn = (x) => (typeof x === 'object' ? num(x) : N(x))
const textIn = (x) => (typeof x === 'object' ? str(x) : T(String(x)))

/**
 * Chain blocks into a stack: each one's `next` is the one after it.
 * @param {...object} blocks The blocks, top first.
 * @returns {object} The top block.
 */
const stack = (...blocks) => {
  for (let i = 0; i < blocks.length - 1; i++) blocks[i].next = { block: blocks[i + 1] }
  return blocks[0]
}
const body = (...blocks) => ({ block: stack(...blocks) })

// Events and control.
const whenFlag = (...then) => stack({ type: 'event_whenflagclicked' }, ...then)
const whenKey = (key, ...then) => stack({ type: 'event_whenkeypressed', fields: { KEY_OPTION: key } }, ...then)
const forever = (...then) => ({ type: 'control_forever', inputs: { SUBSTACK: body(...then) } })
const repeat = (n, ...then) => ({
  type: 'control_repeat',
  inputs: { TIMES: { shadow: { type: 'math_whole_number', fields: { NUM: String(n) } } }, SUBSTACK: body(...then) },
})
const wait = (s) => ({
  type: 'control_wait',
  inputs: { DURATION: { shadow: { type: 'math_positive_number', fields: { NUM: String(s) } } } },
})
const ifElse = (cond, then, otherwise) => ({
  type: 'control_if_else',
  inputs: { CONDITION: bool(cond), SUBSTACK: body(...then), SUBSTACK2: body(...otherwise) },
})
const print = (x) => ({ type: 'control_print', inputs: { STRING: textIn(x) } })

// Operators and data.
const lt = (a, b) => ({ type: 'operator_lt', inputs: { OPERAND1: textIn(a), OPERAND2: textIn(b) } })
const gt = (a, b) => ({ type: 'operator_gt', inputs: { OPERAND1: textIn(a), OPERAND2: textIn(b) } })
const eq = (a, b) => ({ type: 'operator_equals', inputs: { OPERAND1: textIn(a), OPERAND2: textIn(b) } })
const and = (a, b) => ({ type: 'operator_and', inputs: { OPERAND1: bool(a), OPERAND2: bool(b) } })
const join = (a, b) => ({ type: 'operator_join', inputs: { STRING1: textIn(a), STRING2: textIn(b) } })

// ThingBot Telemetrix. Menus are dropdown fields on the block itself, numbers are inputs.
const live = (op, fields = {}, inputs = {}) => ({ type: `thingbotTelemetrix_${op}`, fields, inputs })
const led = (n, on) => live('controlLED', { LED_ID: String(n), LED_STATE: on ? 'on' : 'off' })
const motor = (m, speed) => live('controlDC', { MOTOR_ID: String(m) }, { SPEED: numIn(speed) })
const servo = (s, angle) => live('servoWrite', { SERVO_ID: String(s) }, { ANGLE: numIn(angle) })
const buzzer = (freq) => live('controlBuzzer', {}, { FREQ: numIn(freq) })
const pinMode = (pin, mode) => live('setPinMode', { MODE: mode }, { PIN: N(pin) })
const digitalRead = (pin) => live('digitalRead', {}, { PIN: N(pin) })
const analogRead = (pin) => live('analogRead', {}, { PIN: N(pin) })
const setupUltrasonic = (trig, echo) => live('setupUltrasonic', {}, { TRIG: N(trig), ECHO: N(echo) })
const distance = () => live('readDistance')
const setupDHT = (type, pin) => live('setupDHT', { DHT_TYPE: type }, { PIN: N(pin) })
const temperature = (pin) => live('readTemperature', {}, { PIN: N(pin) })
const humidity = (pin) => live('readHumidity', {}, { PIN: N(pin) })
/**
 * Set both wheels: M1 turns the left wheel, M2 the right one; a negative speed runs a wheel backwards.
 * @param {number} left Left wheel speed, -100 to 100.
 * @param {number} right Right wheel speed, -100 to 100.
 * @returns {object[]} The two motor blocks.
 */
const drive = (left, right) => [motor(1, left), motor(2, right)]
const stop = () => drive(0, 0)

// Attach a Vietnamese note to a block (shown beside it in the editor).
const comment = (text, block) => ({ ...block, comment: text })

const GROUP = 'ThingBot Live'
/** The SW button on the ThingBot board. */
const SW_PIN = 3
/** How every example starts: the robot has its live firmware and is connected over Bluetooth. */
const LIVE_TIP =
  'Chế độ Live: chương trình chạy ngay trên máy tính hoặc máy tính bảng, gửi từng lệnh tới ThingBot qua Bluetooth, ' +
  'không cần nạp code. Bật ThingBot, bấm «Kết nối ThingBot», chọn ThingBot trong danh sách, rồi bấm lá cờ xanh. ' +
  'Bấm nút dừng (hình bát giác đỏ) là động cơ và còi tắt ngay.'
const note = (title, ...lines) => [`${title} · ThingBot Live`, ...lines, LIVE_TIP].join('\n')

export const THINGBOT_LIVE_EXAMPLES = [
  {
    id: 'live-01-den-nhap-nhay',
    title: 'Đèn nhấp nháy qua Bluetooth',
    level: 1,
    description: 'Bấm lá cờ: đèn L1 trên ThingBot sáng nửa giây, tắt nửa giây, lặp mãi.',
    hardware: ['ThingBot có firmware Live', 'Máy có Bluetooth'],
    note: note(
      'Đèn nhấp nháy qua Bluetooth',
      'Nhiệm vụ: điều khiển đèn trên robot từ xa, không dây.',
      'Mỗi khối «đèn» là một tin nhắn gửi qua Bluetooth. ThingBot nhận tin là bật hoặc tắt đèn ngay.',
      'Khối «đợi» giữ đèn ở trạng thái đó một lúc, nên mắt em kịp thấy đèn chớp.',
      'Thử: đổi 0,5 thành 0,1 xem đèn chớp nhanh thế nào. Đổi đèn 1 thành đèn 2.',
    ),
    stacks: [
      whenFlag(comment('Lặp mãi: bật, đợi, tắt, đợi.', forever(led(1, true), wait(0.5), led(1, false), wait(0.5)))),
    ],
  },
  {
    id: 'live-02-hai-den-va-coi',
    title: 'Hai đèn thay nhau và tiếng bíp',
    level: 1,
    description: 'Đèn L1 và L2 thay nhau sáng như đèn báo xe cứu thương; mỗi lần đổi đèn, còi kêu bíp.',
    hardware: ['ThingBot có firmware Live'],
    note: note(
      'Hai đèn thay nhau và tiếng bíp',
      'Nhiệm vụ: làm đèn báo của xe cứu thương: hai đèn thay nhau sáng, kèm tiếng bíp.',
      'Khối «còi tần số» nhận số từ 1 đến 100: số càng lớn tiếng càng cao. Số 0 là tắt còi.',
      'Thử: đổi 60 thành 20 rồi thành 90. Tiếng còi thay đổi thế nào?',
    ),
    stacks: [
      whenFlag(
        forever(
          led(1, true),
          led(2, false),
          comment('Bíp ngắn: bật còi 0,1 giây rồi tắt.', buzzer(60)),
          wait(0.1),
          buzzer(0),
          wait(0.4),
          led(1, false),
          led(2, true),
          buzzer(40),
          wait(0.1),
          buzzer(0),
          wait(0.4),
        ),
      ),
    ],
  },
  {
    id: 'live-03-coi-bao-thuc',
    title: 'Còi báo thức',
    level: 1,
    description: 'Bấm lá cờ: còi kêu ba hồi, tiếng to dần, rồi đèn L1 sáng báo "dậy thôi".',
    hardware: ['ThingBot có firmware Live'],
    note: note(
      'Còi báo thức',
      'Nhiệm vụ: làm đồng hồ báo thức. Còi kêu ba hồi, mỗi hồi cao hơn hồi trước.',
      'Khối «lặp lại 3» chạy ba lần những khối bên trong rồi mới đi tiếp, khác với «liên tục» lặp mãi.',
      'Thử: đổi 3 thành 5 hồi. Thêm một khối «đợi» dài hơn giữa các hồi.',
    ),
    stacks: [
      whenFlag(
        repeat(3, buzzer(30), wait(0.3), buzzer(0), wait(0.2), buzzer(60), wait(0.3), buzzer(0), wait(0.5)),
        led(1, true),
        print('Dậy thôi!'),
      ),
    ],
  },
  {
    id: 'live-04-xe-chay-thu',
    title: 'Xe chạy thử: tiến, xoay, lùi',
    level: 1,
    description: 'Xe tiến 1 giây, xoay tại chỗ, lùi về rồi dừng. Bánh trái là M1, bánh phải là M2.',
    hardware: ['ThingBot gắn hai bánh ở M1 (trái) và M2 (phải)'],
    note: note(
      'Xe chạy thử: tiến, xoay, lùi',
      'Nhiệm vụ: chạy thử chiếc xe trước khi giao hàng.',
      'Khối «động cơ tốc độ» nhận số từ -100 đến 100. Số dương quay tới, số âm quay lùi, 0 là dừng.',
      'Hai bánh cùng tốc độ thì xe đi thẳng. Một bánh tới, một bánh lùi thì xe xoay tại chỗ.',
      'Kê xe lên hộp để bánh không chạm bàn khi chạy thử lần đầu.',
      'Thử: đổi thời gian xoay để xe quay đúng nửa vòng.',
    ),
    stacks: [
      whenFlag(
        comment('Hai bánh cùng quay tới: xe đi thẳng.', motor(1, 60)),
        motor(2, 60),
        wait(1),
        comment('Bánh trái tới, bánh phải lùi: xe xoay sang phải tại chỗ.', motor(1, 50)),
        motor(2, -50),
        wait(0.6),
        comment('Hai bánh cùng lùi.', motor(1, -60)),
        motor(2, -60),
        wait(1),
        ...stop(),
      ),
    ],
  },
  {
    id: 'live-05-lai-xe-bang-phim',
    title: 'Lái xe bằng phím mũi tên',
    level: 2,
    description: 'Phím ↑ ↓ ← → lái xe, phím cách dừng xe. Dùng với máy tính có bàn phím.',
    hardware: ['ThingBot gắn hai bánh ở M1 (trái) và M2 (phải)', 'Bàn phím'],
    note: note(
      'Lái xe bằng phím mũi tên',
      'Nhiệm vụ: làm tay lái cho xe điều khiển từ xa.',
      'Mỗi khối «khi bấm phím» là một khối mũ: nó chờ em bấm đúng phím đó rồi mới chạy các khối bên dưới.',
      'Rẽ trái: bánh trái chậm lại, bánh phải nhanh hơn. Rẽ phải thì ngược lại.',
      'Máy tính bảng không có bàn phím: thử ví dụ «Tay em lái xe» với Camera AI.',
    ),
    stacks: [
      whenKey('up arrow', ...drive(70, 70)),
      whenKey('down arrow', ...drive(-60, -60)),
      whenKey('left arrow', ...drive(-40, 40)),
      whenKey('right arrow', ...drive(40, -40)),
      comment('Phím cách: dừng hai bánh.', whenKey('space', ...stop())),
    ],
  },
  {
    id: 'live-06-servo-vay-tay',
    title: 'Servo vẫy tay chào',
    level: 1,
    description: 'Servo S1 vẫy qua lại năm lần như cánh tay chào, rồi về giữa.',
    hardware: ['Servo cắm cổng S1'],
    note: note(
      'Servo vẫy tay chào',
      'Nhiệm vụ: làm cánh tay robot vẫy chào khách.',
      'Servo là động cơ biết đứng đúng góc: từ 0 độ đến 180 độ. Khối «servo góc» bảo servo quay tới góc đó rồi đứng yên.',
      'Khối «đợi» cho servo kịp quay tới nơi trước lệnh tiếp theo.',
      'Thử: vẫy rộng hơn (0 và 180) hoặc nhanh hơn (đợi 0,2).',
    ),
    stacks: [whenFlag(repeat(5, servo(1, 45), wait(0.4), servo(1, 135), wait(0.4)), servo(1, 90))],
  },
  {
    id: 'live-07-nut-sw-bat-den',
    title: 'Nút SW bật đèn',
    level: 2,
    description: 'Giữ nút SW trên ThingBot thì đèn L1 sáng và còi kêu khẽ, nhả ra thì tắt.',
    hardware: ['Nút SW trên mạch (chân IO3)'],
    note: note(
      'Nút SW bật đèn',
      'Nhiệm vụ: làm chuông cửa. Bấm nút trên robot thì đèn sáng, có tiếng kêu.',
      'Nút SW nối chân IO3. Khối «đặt chân 3 chế độ INPUT_PULLUP» bảo ThingBot đọc chân này và gửi kết quả về mỗi khi nó đổi.',
      'Nút chưa bấm thì chân đọc 1. Bấm xuống, chân nối đất nên đọc 0.',
      'Mỗi vòng, chương trình hỏi «chân 3 có bằng 0 không?»: có thì bật đèn, không thì tắt.',
    ),
    stacks: [
      whenFlag(
        comment('Báo ThingBot theo dõi chân 3, nơi nút SW nối vào.', pinMode(SW_PIN, 'INPUT_PULLUP')),
        forever(
          ifElse(eq(digitalRead(SW_PIN), 0), [led(1, true), buzzer(20)], [led(1, false), buzzer(0)]),
          wait(0.05),
        ),
      ),
    ],
  },
  {
    id: 'live-08-xe-tranh-vat-can',
    title: 'Xe tránh vật cản',
    level: 3,
    description: 'Cảm biến siêu âm đo khoảng cách; gặp vật gần hơn 20 cm thì xe lùi, xoay rồi đi tiếp.',
    hardware: ['ThingBot gắn hai bánh ở M1 (trái) và M2 (phải)', 'Cảm biến siêu âm HC-SR04: TRIG ở IO0, ECHO ở IO4'],
    note: note(
      'Xe tránh vật cản',
      'Nhiệm vụ: làm robot hút bụi. Robot tự đi, gặp tường thì quay đầu.',
      'Cảm biến siêu âm phát tiếng kêu rất cao (tai người không nghe được) rồi đo thời gian tiếng vọng quay về, như con dơi.',
      'Khối «khoảng cách siêu âm» cho số cm ThingBot vừa đo. Số 0 nghĩa là chưa đo được, nên chỉ coi là vật cản khi số lớn hơn 0.',
      'Thử: đổi 20 thành 40 để xe quay đầu sớm hơn.',
    ),
    stacks: [
      whenFlag(
        comment('Cảm biến siêu âm cắm cổng cảm biến: TRIG chân 0, ECHO chân 4.', setupUltrasonic(0, 4)),
        forever(
          ifElse(
            and(gt(distance(), 0), lt(distance(), 20)),
            [...drive(-50, -50), wait(0.4), ...drive(50, -50), wait(0.5)],
            drive(60, 60),
          ),
          wait(0.1),
        ),
      ),
    ],
  },
  {
    id: 'live-09-nhiet-ke-do-am',
    title: 'Nhiệt kế và độ ẩm',
    level: 2,
    description:
      'Cảm biến DHT11 đo nhiệt độ và độ ẩm, in ra khung Màn hình mỗi 2 giây; nóng quá 32 °C thì đèn L1 sáng.',
    hardware: ['Cảm biến DHT11 cắm chân IO4'],
    note: note(
      'Nhiệt kế và độ ẩm',
      'Nhiệm vụ: làm trạm thời tiết cho lớp học hoặc nhà nuôi tằm.',
      'DHT11 là cảm biến đo cả nhiệt độ (°C) và độ ẩm không khí (%). Nó đo chậm, khoảng 1 lần mỗi giây.',
      'Khối «in ra» viết số đo xuống khung Màn hình ở bên phải, để em đọc và ghi lại.',
      'Thử: hà hơi vào cảm biến. Độ ẩm tăng lên bao nhiêu?',
    ),
    stacks: [
      whenFlag(
        setupDHT('DHT11', 4),
        forever(
          print(join('Nhiệt độ (°C): ', temperature(4))),
          print(join('Độ ẩm (%): ', humidity(4))),
          ifElse(gt(temperature(4), 32), [led(1, true)], [led(1, false)]),
          wait(2),
        ),
      ),
    ],
  },
  {
    id: 'live-10-mat-hong-ngoai',
    title: 'Mắt hồng ngoại sáng hay tối',
    level: 2,
    description: 'Đọc mắt hồng ngoại ở IO4 và in số ra Màn hình; vật tối màu ở trước mắt thì đèn L1 sáng.',
    hardware: ['Mắt hồng ngoại cắm chân IO4'],
    note: note(
      'Mắt hồng ngoại sáng hay tối',
      'Nhiệm vụ: làm máy soi trứng hay máy chọn bóng: phân biệt vật sáng màu và vật tối màu.',
      'Mắt hồng ngoại chiếu ánh sáng vô hình vào vật rồi đo ánh sáng hắt lại. Vật sáng màu hắt nhiều, vật tối màu hắt ít.',
      'Khối «đọc analog chân 4» cho một số: số này đổi theo lượng ánh sáng hắt về.',
      'Thử: đưa giấy trắng rồi giấy đen trước mắt, ghi hai số. Chọn ngưỡng ở giữa hai số đó thay cho 2000.',
    ),
    stacks: [
      whenFlag(
        forever(
          print(join('Mắt hồng ngoại: ', analogRead(4))),
          comment(
            'Ngưỡng 2000 là để thử. Đo số với vật sáng và vật tối rồi chọn số ở giữa.',
            ifElse(lt(analogRead(4), 2000), [led(1, true)], [led(1, false)]),
          ),
          wait(0.2),
        ),
      ),
    ],
  },
  {
    id: 'live-11-tay-em-lai-xe',
    title: 'Tay em lái xe (Camera AI + ThingBot)',
    level: 3,
    description: 'Xoè tay trước webcam thì xe chạy tới, nắm tay thì xe dừng, giơ chữ V thì xe xoay một vòng.',
    hardware: ['ThingBot gắn hai bánh ở M1 (trái) và M2 (phải)', 'Webcam hoặc camera trước của máy tính bảng'],
    note: note(
      'Tay em lái xe',
      'Nhiệm vụ: lái xe bằng cử chỉ, không cần chạm vào máy.',
      'Camera AI nhìn bàn tay em qua webcam và nhận ra cử chỉ: xoè tay, nắm tay, chữ V.',
      'Mỗi cử chỉ là một khối mũ «khi tay bất kỳ làm cử chỉ …». Khối mũ gửi lệnh động cơ tới ThingBot qua Bluetooth.',
      'Thử: thêm cử chỉ «ngón cái lên» để bật đèn L1.',
    ),
    stacks: [
      cameraBlocks.whenFlag(cameraBlocks.cameraOn(), cameraBlocks.say('Xoè tay: chạy · Nắm tay: dừng · Chữ V: xoay')),
      cameraBlocks.whenGesture('OPEN', cameraBlocks.say('Chạy tới!'), ...drive(60, 60)),
      cameraBlocks.whenGesture('FIST', cameraBlocks.say('Dừng'), ...stop()),
      cameraBlocks.whenGesture('VICTORY', cameraBlocks.say('Xoay!'), ...drive(50, -50), wait(1.2), ...stop()),
    ],
  },
].map((example) => ({
  source: 'ThingBlock ThingBot Live',
  ...example,
  // Every line of the note wraps at about 60 characters, so it is sized to show all of them.
  noteHeight: 22 * example.note.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 60)), 0) + 24,
  group: GROUP,
  device: null,
}))
