/**
 * Lesson programs for the ThingEdu K1-K12 catalogue, grades K3-K6.
 *
 * Every program is built only from blocks that exist in the ThingBlock library today — verified
 * against the pack generators, not assumed — so each one opens, generates C++ and compiles without
 * waiting on a missing module. Where the catalogue names hardware ThingBlock has no block for, the
 * substitution is stated in the lesson's `note` and listed in the gap report instead of faked.
 */
'use strict';

const { num, posnum, text, varGet, VAR, reporter, stmt, totext, joinAll, makeProject } = require('./tb-lib');

const THINGBOT = { device: 'thingbot', peripherals: [] };
const withPeripherals = (...p) => ({ device: 'thingbot', peripherals: p });

const set = (name, value) => stmt('data_setvariableto', { fields: { VARIABLE: VAR(name) }, inputs: { VALUE: value } });
const wait = (s) => stmt('control_wait', { inputs: { DURATION: posnum(s) } });
const forever = (body) => stmt('control_forever', { statements: { SUBSTACK: body } });
const ifThen = (cond, body) => stmt('control_if', { inputs: { CONDITION: cond }, statements: { SUBSTACK: body } });
const ifElse = (cond, a, b) =>
  stmt('control_if_else', { inputs: { CONDITION: cond }, statements: { SUBSTACK: a, SUBSTACK2: b } });
const gt = (a, b) => reporter('operator_gt', { inputs: { OPERAND1: a, OPERAND2: b } });
const lt = (a, b) => reporter('operator_lt', { inputs: { OPERAND1: a, OPERAND2: b } });

const led = (which, brightness) =>
  stmt('thingBotC3_setLed', { fields: { LED: 'LED_' + which }, inputs: { BRIGHTNESS: num(brightness) } });
const note = (n, octave, beats) =>
  stmt('thingBotC3_playNote', { fields: { NOTE: n, OCTAVE: String(octave) }, inputs: { BEATS: num(beats) } });
const servoAngle = (s, deg, secs) =>
  stmt('thingBotC3_startServoAngle', { fields: { SERVO: s }, inputs: { ANGLE: num(deg), SECONDS: num(secs) } });
const waitServos = () => stmt('thingBotC3_waitServos');
const motor = (m, dir, speed) =>
  stmt('thingBotC3_setMotor', { fields: { MOTOR: m, DIRECTION: dir }, inputs: { SPEED: num(speed) } });

const oledInit = () => [
  stmt('oled_init', { fields: { ADDR: '0x3c' }, inputs: { W: num(128), H: num(64) } }),
  stmt('oled_setText', { fields: { SIZE: '1', COLOUR: 'SSD1306_WHITE', BGCOLOR: 'SSD1306_BLACK' } }),
];
const oledLine = (y, parts) => [
  stmt('oled_setCursor', { inputs: { X: num(0), Y: num(y) } }),
  stmt('oled_print', { fields: { EOL: 'warp' }, inputs: { DATA: joinAll(parts) } }),
];

// ─────────────────────────────────────────────────────────────────────────────────────────────
// K3 · M4 — Đèn giao thông ngã tư (THC + LED)
// One crossing, two directions. The lesson's idea is that a traffic light is a *sequence with
// durations*, so the program is a plain loop with named wait times rather than hidden constants.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const k3m4 = {
  file: 'K3-M4-den-giao-thong.tb',
  title: 'K3 · M4 — Đèn giao thông ngã tư',
  note: 'Dùng LED1/LED2 có sẵn trên ThingBot thay cho 2 cụm đèn rời; đổi thời gian ở 3 biến đầu bài.',
  board: THINGBOT,
  vars: ['giayXanh', 'giayVang', 'giayDo'],
  stack: [
    set('giayXanh', num(5)),
    set('giayVang', num(2)),
    set('giayDo', num(5)),
    forever([
      // Hướng A đi, hướng B dừng
      led(1, 100),
      led(2, 0),
      stmt('control_wait', { inputs: { DURATION: varGet('giayXanh') } }),
      // Vàng: nháy cảnh báo
      stmt('control_repeat', { inputs: { TIMES: varGet('giayVang') } , statements: { SUBSTACK: [
        led(1, 0), wait(0.5), led(1, 100), wait(0.5),
      ] } }),
      // Đổi hướng
      led(1, 0),
      led(2, 100),
      stmt('control_wait', { inputs: { DURATION: varGet('giayDo') } }),
    ]),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// K3 · M9 — Hộp mù bí ẩn (TB + SRV)
// A lid that opens, holds, closes. Uses start-servo + wait-for-servos so the two servos of a
// two-flap lid move together instead of one after the other.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const k3m9 = {
  file: 'K3-M9-hop-mu-bi-an.tb',
  title: 'K3 · M9 — Hộp mù bí ẩn',
  note: 'Hai cánh nắp mở cùng lúc nhờ "bắt đầu servo …" + "chờ các servo".',
  board: THINGBOT,
  vars: ['giayMo'],
  stack: [
    set('giayMo', num(3)),
    servoAngle('1', 0, 1),
    servoAngle('2', 180, 1),
    waitServos(),
    forever([
      // mở nắp
      servoAngle('1', 90, 1),
      servoAngle('2', 90, 1),
      waitServos(),
      note('C', 5, 1),
      stmt('control_wait', { inputs: { DURATION: varGet('giayMo') } }),
      // đóng nắp
      servoAngle('1', 0, 1),
      servoAngle('2', 180, 1),
      waitServos(),
      wait(2),
    ]),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// K4 · M5 — Tiết kiệm điện ở nhà (THC + LDR)
// Reads a light-dependent resistor on an analog pin and shows both the raw reading and the
// decision, so a child can see the threshold do its work instead of guessing at it.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const k4m5 = {
  file: 'K4-M5-tiet-kiem-dien.tb',
  title: 'K4 · M5 — Tiết kiệm điện ở nhà',
  note: 'Quang trở vào chân A0. Hai ngưỡng bật/tắt khác nhau để đèn không chớp liên tục khi trời nhập nhoạng.',
  board: withPeripherals('oled'),
  vars: ['anhSang', 'dangBat', 'nguongToi', 'nguongSang'],
  stack: [
    ...oledInit(),
    set('nguongToi', num(300)),
    set('nguongSang', num(500)),
    set('dangBat', num(0)),
    forever([
      set('anhSang', reporter('arduino_analogRead', { inputs: { PIN: num(0) } })),
      ifThen(reporter('operator_and', {
        inputs: {
          OPERAND1: reporter('operator_equals', { inputs: { OPERAND1: varGet('dangBat'), OPERAND2: num(0) } }),
          OPERAND2: lt(varGet('anhSang'), varGet('nguongToi')),
        },
      }), [set('dangBat', num(1)), led(1, 100)]),
      ifThen(reporter('operator_and', {
        inputs: {
          OPERAND1: reporter('operator_equals', { inputs: { OPERAND1: varGet('dangBat'), OPERAND2: num(1) } }),
          OPERAND2: gt(varGet('anhSang'), varGet('nguongSang')),
        },
      }), [set('dangBat', num(0)), led(1, 0)]),
      stmt('oled_clear'),
      ...oledLine(0, ['Anh sang: ', totext(varGet('anhSang'))]),
      ...oledLine(16, ['Nguong: ', totext(varGet('nguongToi')), ' - ', totext(varGet('nguongSang'))]),
      ...oledLine(32, ['Den: ', totext(varGet('dangBat'))]),
      stmt('oled_refresh'),
      wait(0.5),
    ]),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// K4 · M9 — Chuông cửa thông minh (THC + PIR + SPK)
// PIR on a digital pin; the chime is a real two-note phrase using the music blocks rather than a
// raw buzzer pulse. A re-arm delay keeps one visitor from triggering a dozen chimes.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const k4m9 = {
  file: 'K4-M9-chuong-cua.tb',
  title: 'K4 · M9 — Chuông cửa thông minh',
  note: 'PIR vào chân số 2 (đọc digital). ThingBlock chưa có khối PIR riêng nên dùng "đọc chân số"; xem báo cáo thiếu module.',
  board: withPeripherals('oled'),
  vars: ['coNguoi', 'soLanKeu'],
  stack: [
    ...oledInit(),
    set('soLanKeu', num(0)),
    stmt('thingBotC3_setTempo', { inputs: { TEMPO: num(120) } }),
    forever([
      set('coNguoi', reporter('arduino_digitalRead', { inputs: { PIN: num(2) } })),
      ifThen(reporter('operator_equals', { inputs: { OPERAND1: varGet('coNguoi'), OPERAND2: num(1) } }), [
        set('soLanKeu', reporter('operator_add', { inputs: { NUM1: varGet('soLanKeu'), NUM2: num(1) } })),
        led(1, 100),
        note('E', 5, 0.5),
        note('C', 5, 1),
        led(1, 0),
        // chờ cho khách đi qua rồi mới nhận lượt mới
        wait(5),
      ]),
      stmt('oled_clear'),
      ...oledLine(0, ['CHUONG CUA']),
      ...oledLine(20, ['Luot khach: ', totext(varGet('soLanKeu'))]),
      stmt('oled_refresh'),
      wait(0.2),
    ]),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// K5 · M7 — Xe điều khiển từ xa (TB + RC)
// PS2 joystick drives two motors. Mixing is explicit: forward speed plus a turn term, so the
// steering is something a child can read and change, not a black box.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const k5m7 = {
  file: 'K5-M7-xe-dieu-khien-tu-xa.tb',
  title: 'K5 · M7 — Xe điều khiển từ xa',
  note: 'Tay cầm PS2. Cần trục Y (tiến/lùi) và trục X (rẽ) trộn lại thành tốc độ hai bánh.',
  board: withPeripherals('ps2'),
  vars: ['truocSau', 'traiPhai', 'tocDoTrai', 'tocDoPhai'],
  stack: [
    stmt('thingBotC3_initPS2'),
    forever([
      stmt('ps2_readData'),
      set('truocSau', reporter('ps2_GetJoystick', { fields: { AXIS: 'PSS_LY' } })),
      set('traiPhai', reporter('ps2_GetJoystick', { fields: { AXIS: 'PSS_LX' } })),
      // cần ở giữa là 128 -> đưa về khoảng -100..100
      set('truocSau', reporter('operator_divide', {
        inputs: {
          NUM1: reporter('operator_subtract', { inputs: { NUM1: num(128), NUM2: varGet('truocSau') } }),
          NUM2: num(1.28),
        },
      })),
      set('traiPhai', reporter('operator_divide', {
        inputs: {
          NUM1: reporter('operator_subtract', { inputs: { NUM1: varGet('traiPhai'), NUM2: num(128) } }),
          NUM2: num(1.28),
        },
      })),
      set('tocDoTrai', reporter('operator_add', { inputs: { NUM1: varGet('truocSau'), NUM2: varGet('traiPhai') } })),
      set('tocDoPhai', reporter('operator_subtract', { inputs: { NUM1: varGet('truocSau'), NUM2: varGet('traiPhai') } })),
      ifElse(gt(varGet('tocDoTrai'), num(0)),
        [stmt('thingBotC3_setMotor', { fields: { MOTOR: '1', DIRECTION: 'forward' }, inputs: { SPEED: varGet('tocDoTrai') } })],
        [stmt('thingBotC3_setMotor', { fields: { MOTOR: '1', DIRECTION: 'backward' }, inputs: {
          SPEED: reporter('operator_subtract', { inputs: { NUM1: num(0), NUM2: varGet('tocDoTrai') } }) } })]),
      ifElse(gt(varGet('tocDoPhai'), num(0)),
        [stmt('thingBotC3_setMotor', { fields: { MOTOR: '2', DIRECTION: 'forward' }, inputs: { SPEED: varGet('tocDoPhai') } })],
        [stmt('thingBotC3_setMotor', { fields: { MOTOR: '2', DIRECTION: 'backward' }, inputs: {
          SPEED: reporter('operator_subtract', { inputs: { NUM1: num(0), NUM2: varGet('tocDoPhai') } }) } })]),
      wait(0.05),
    ]),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// K6 · M9 — Cửa siêu thị tự mở (THC + US + SRV)
// Ultrasonic distance opens a servo door, with two thresholds so someone standing near the edge
// does not make the door flutter — the same hysteresis idea as the K4 lamp, met again on purpose.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const k6m9 = {
  file: 'K6-M9-cua-sieu-thi.tb',
  title: 'K6 · M9 — Cửa siêu thị tự mở',
  note: 'HC-SR04: TRIG chân 6, ECHO chân 7. Ngưỡng mở 40cm, ngưỡng đóng 60cm.',
  board: withPeripherals('ultrasonic', 'oled'),
  vars: ['khoangCach', 'cuaDangMo', 'nguongMo', 'nguongDong'],
  stack: [
    ...oledInit(),
    set('nguongMo', num(40)),
    set('nguongDong', num(60)),
    set('cuaDangMo', num(0)),
    servoAngle('1', 0, 1),
    waitServos(),
    forever([
      set('khoangCach', reporter('ultrasonic_readDistance', { fields: { TRIG: '6', ECHO: '7', UNIT: 'CM' } })),
      ifThen(reporter('operator_and', {
        inputs: {
          OPERAND1: reporter('operator_equals', { inputs: { OPERAND1: varGet('cuaDangMo'), OPERAND2: num(0) } }),
          OPERAND2: lt(varGet('khoangCach'), varGet('nguongMo')),
        },
      }), [
        set('cuaDangMo', num(1)),
        note('G', 5, 0.5),
        servoAngle('1', 90, 1),
        waitServos(),
      ]),
      ifThen(reporter('operator_and', {
        inputs: {
          OPERAND1: reporter('operator_equals', { inputs: { OPERAND1: varGet('cuaDangMo'), OPERAND2: num(1) } }),
          OPERAND2: gt(varGet('khoangCach'), varGet('nguongDong')),
        },
      }), [
        set('cuaDangMo', num(0)),
        servoAngle('1', 0, 1),
        waitServos(),
      ]),
      stmt('oled_clear'),
      ...oledLine(0, ['CUA TU DONG']),
      ...oledLine(20, ['Khoang cach: ', totext(varGet('khoangCach')), 'cm']),
      ...oledLine(40, ['Cua mo: ', totext(varGet('cuaDangMo'))]),
      stmt('oled_refresh'),
      wait(0.2),
    ]),
  ],
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// K8 · M1 — Cú va chạm an toàn (THC + ACC)
// Reads the MPU6050 and latches the largest impact seen, which is the measurement the lesson is
// actually about: a crash is a peak, not a level you can watch go by.
// ─────────────────────────────────────────────────────────────────────────────────────────────
const k8m1 = {
  file: 'K8-M1-cu-va-cham-an-toan.tb',
  title: 'K8 · M1 — Cú va chạm an toàn',
  note: 'MPU6050 qua I2C. Giữ lại giá trị va chạm lớn nhất để so sánh giữa các lần thử mẫu xe.',
  board: withPeripherals('mpu6050', 'oled'),
  vars: ['ax', 'ay', 'az', 'doLon', 'kyLuc'],
  stack: [
    ...oledInit(),
    stmt('mpu6050_init'),
    set('kyLuc', num(0)),
    forever([
      stmt('mpu6050_readData'),
      set('ax', reporter('mpu6050_acceleration', { fields: { AXIS: 'x' } })),
      set('ay', reporter('mpu6050_acceleration', { fields: { AXIS: 'y' } })),
      set('az', reporter('mpu6050_acceleration', { fields: { AXIS: 'z' } })),
      // độ lớn gia tốc = căn(ax² + ay² + az²)
      set('doLon', reporter('operator_mathop', {
        fields: { OPERATOR: 'sqrt' },
        inputs: {
          NUM: reporter('operator_add', {
            inputs: {
              NUM1: reporter('operator_add', {
                inputs: {
                  NUM1: reporter('operator_multiply', { inputs: { NUM1: varGet('ax'), NUM2: varGet('ax') } }),
                  NUM2: reporter('operator_multiply', { inputs: { NUM1: varGet('ay'), NUM2: varGet('ay') } }),
                },
              }),
              NUM2: reporter('operator_multiply', { inputs: { NUM1: varGet('az'), NUM2: varGet('az') } }),
            },
          }),
        },
      })),
      ifThen(gt(varGet('doLon'), varGet('kyLuc')), [
        set('kyLuc', varGet('doLon')),
        led(1, 100),
        wait(0.2),
        led(1, 0),
      ]),
      stmt('oled_clear'),
      ...oledLine(0, ['VA CHAM']),
      ...oledLine(20, ['Hien tai: ', totext(varGet('doLon'))]),
      ...oledLine(40, ['Ky luc:   ', totext(varGet('kyLuc'))]),
      stmt('oled_refresh'),
      wait(0.1),
    ]),
  ],
};

module.exports = [k3m4, k3m9, k4m5, k4m9, k5m7, k6m9, k8m1];

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const outDir = process.argv[2] || '.';
  for (const l of module.exports) {
    const project = makeProject({ board: l.board, varNames: l.vars, mainStack: l.stack });
    const jsonPath = path.join(outDir, l.file.replace(/\.tb$/, '.json'));
    fs.writeFileSync(jsonPath, JSON.stringify(project, null, 2));
    const n = Object.keys(project.targets[1].blocks).length;
    console.log(`${l.file.padEnd(34)} ${String(n).padStart(4)} blocks  ${l.title}`);
  }
}
