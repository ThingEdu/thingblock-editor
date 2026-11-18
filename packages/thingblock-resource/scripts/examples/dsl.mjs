// Short helpers that write scratch-blocks serialization for the example programs (see tb-builder.mjs).
// A stack is an array of statements; `seq` links it through `next`. A value argument is a number or
// string literal (becomes the input's shadow) or a reporter block (placed over an empty shadow).

const SHADOW = {
  num: (v) => ({ type: 'math_number', fields: { NUM: v } }),
  pos: (v) => ({ type: 'math_positive_number', fields: { NUM: v } }),
  whole: (v) => ({ type: 'math_whole_number', fields: { NUM: v } }),
  text: (v) => ({ type: 'text', fields: { TEXT: v } }),
}

const isBlock = (x) => x !== null && typeof x === 'object'

// A value input: a literal shadow, or a reporter over an empty shadow of the same kind.
const value = (kind, x) => {
  if (kind === null) return { block: x }
  if (isBlock(x)) return { shadow: SHADOW[kind](kind === 'text' ? '' : 0), block: x }
  return { shadow: SHADOW[kind](x) }
}

// A value for a board block's number input (declared `check: 'Number'`). The editor's variable
// reporter outputs a String and Blockly refuses to connect it there, so a variable goes in through
// «round», whose output is a Number.
const numberValue = (x) =>
  value('num', isBlock(x) && x.type === 'data_variable' ? stmt('operator_round', null, { NUM: value('num', x) }) : x)

// Link statements (nested arrays are flattened, falsy entries dropped) and return the first one.
export const seq = (...stmts) => {
  const list = stmts.flat(Infinity).filter(Boolean)
  for (let i = list.length - 2; i >= 0; i--) list[i] = { ...list[i], next: { block: list[i + 1] } }
  return list[0]
}

const stmt = (type, fields, inputs) => ({ type, ...(fields ? { fields } : {}), ...(inputs ? { inputs } : {}) })
const branch = (stmts) => {
  const first = seq(stmts)
  return first ? { block: first } : undefined
}
const withBranches = (block, branches) => {
  for (const [name, stmts] of Object.entries(branches)) {
    const b = branch(stmts)
    if (b) block.inputs[name] = b
  }
  return block
}

// Attach a Vietnamese note to a block.
export const note = (text, block) => ({ ...block, comment: text })

// ---- hats and custom blocks ------------------------------------------------------------------
export const whenBegin = (...body) => seq({ type: 'event_whenarduinobegin' }, body)
export const whenLoop = (...body) => seq({ type: 'event_whenarduinoloop' }, body)
export const define = (proccode, ...body) => seq({ type: 'procedures_definition', extraState: { proccode } }, body)
export const call = (proccode) => ({ type: 'procedures_call', extraState: { proccode } })

// ---- control ---------------------------------------------------------------------------------
export const wait = (s) => stmt('control_wait', null, { DURATION: value('pos', s) })
export const forever = (...body) => withBranches(stmt('control_forever', null, {}), { SUBSTACK: body })
export const repeat = (n, ...body) =>
  withBranches(stmt('control_repeat', null, { TIMES: value('whole', n) }), { SUBSTACK: body })
export const repeatUntil = (cond, ...body) =>
  withBranches(stmt('control_repeat_until', null, { CONDITION: value(null, cond) }), { SUBSTACK: body })
export const waitUntil = (cond) => stmt('control_wait_until', null, { CONDITION: value(null, cond) })
export const ifThen = (cond, ...body) =>
  withBranches(stmt('control_if', null, { CONDITION: value(null, cond) }), { SUBSTACK: body })
export const ifElse = (cond, then, otherwise) =>
  withBranches(stmt('control_if_else', null, { CONDITION: value(null, cond) }), {
    SUBSTACK: then,
    SUBSTACK2: otherwise,
  })

// ---- variables -------------------------------------------------------------------------------
export const v = (name) => ({ type: 'data_variable', fields: { VARIABLE: { name } } })
export const set = (name, x) => stmt('data_setvariableto', { VARIABLE: { name } }, { VALUE: value('text', x) })
export const change = (name, x) => stmt('data_changevariableby', { VARIABLE: { name } }, { VALUE: value('num', x) })

// ---- operators -------------------------------------------------------------------------------
const arith = (type) => (a, b) => stmt(type, null, { NUM1: value('num', a), NUM2: value('num', b) })
export const add = arith('operator_add')
export const sub = arith('operator_subtract')
export const mul = arith('operator_multiply')
export const div = arith('operator_divide')
export const mod = arith('operator_mod')
const compare = (type) => (a, b) => stmt(type, null, { OPERAND1: value('text', a), OPERAND2: value('text', b) })
export const gt = compare('operator_gt')
export const lt = compare('operator_lt')
export const eq = compare('operator_equals')
export const and = (a, b) => stmt('operator_and', null, { OPERAND1: value(null, a), OPERAND2: value(null, b) })
export const or = (a, b) => stmt('operator_or', null, { OPERAND1: value(null, a), OPERAND2: value(null, b) })
export const not = (a) => stmt('operator_not', null, { OPERAND: value(null, a) })
export const join = (a, b) => stmt('operator_join', null, { STRING1: value('text', a), STRING2: value('text', b) })
export const mathop = (op, x) => stmt('operator_mathop', { OPERATOR: op }, { NUM: value('num', x) })
export const round = (x) => stmt('operator_round', null, { NUM: value('num', x) })
export const random = (from, to) => stmt('operator_random', null, { FROM: value('num', from), TO: value('num', to) })

// ---- ThingBot board --------------------------------------------------------------------------
export const init = () => stmt('thingBotC3_init')
export const motor = (m, dir, speed) =>
  stmt('thingBotC3_setMotor', { MOTOR: String(m), DIRECTION: dir }, { SPEED: numberValue(speed) })
export const led = (n, brightness) =>
  stmt('thingBotC3_setLed', { LED: `LED_${n}` }, { BRIGHTNESS: numberValue(brightness) })
export const tempo = (bpm) => stmt('thingBotC3_setTempo', null, { TEMPO: numberValue(bpm) })
export const playNote = (noteName, octave, beats) =>
  stmt('thingBotC3_playNote', { NOTE: noteName, OCTAVE: String(octave) }, { BEATS: numberValue(beats) })
export const rest = (beats) => stmt('thingBotC3_rest', null, { BEATS: numberValue(beats) })
export const servo = (s, angle) =>
  stmt('thingBotC3_setServoAngle', { SERVO: String(s) }, { ANGLE: numberValue(angle) })
export const moveServo = (s, angle, seconds) =>
  stmt(
    'thingBotC3_moveServoAngle',
    { SERVO: String(s) },
    { ANGLE: numberValue(angle), SECONDS: numberValue(seconds) },
  )
export const startServo = (s, angle, seconds) =>
  stmt(
    'thingBotC3_startServoAngle',
    { SERVO: String(s) },
    { ANGLE: numberValue(angle), SECONDS: numberValue(seconds) },
  )
export const waitServos = () => stmt('thingBotC3_waitServos')
export const releaseServo = (s) => stmt('thingBotC3_releaseServo', { SERVO: String(s) })
export const pressed = () => stmt('thingBotC3_switch')
export const initPS2 = () => stmt('thingBotC3_initPS2')

// ---- PS2 receiver ----------------------------------------------------------------------------
export const ps2Read = () => stmt('ps2_readData')
export const button = (name) => stmt('ps2_getButton', { BUTTON: `PSB_${name}` })
export const joystick = (axis) => stmt('ps2_GetJoystick', { JOYSTICK: `PSS_${axis}` })

// ---- OLED ------------------------------------------------------------------------------------
export const oledInit = () =>
  stmt('oled_init', { ADDR: '0x3c', CHIP: 'SSD1306' }, { W: numberValue(128), H: numberValue(64) })
export const oledText = (size) =>
  stmt('oled_setText', { SIZE: String(size), COLOUR: 'SSD1306_WHITE', BGCOLOR: 'SSD1306_BLACK' })
export const oledClear = () => stmt('oled_clear')
export const oledRefresh = () => stmt('oled_refresh')
export const oledCursor = (x, y) => stmt('oled_setCursor', null, { X: numberValue(x), Y: numberValue(y) })
export const oledPrint = (data, newline = true) =>
  stmt('oled_print', { EOL: newline ? 'warp' : 'noWarp' }, { DATA: value('text', data) })

// ---- sensors ---------------------------------------------------------------------------------
// HC-SR04 on the ThingBot sensor port: TRIG IO0, ECHO IO4.
export const distance = () => stmt('ultrasonic_readDistance', { TRIG: '0', ECHO: '4', UNIT: 'CM' })
export const dhtInit = (pin = 4) => stmt('dht_init', { PIN: String(pin), MODEL: '11' }, { NO: numberValue(1) })
export const temperature = () => stmt('dht_readTemperature', { UNIT: 'false' }, { NO: numberValue(1) })
export const humidity = () => stmt('dht_readHumidity', null, { NO: numberValue(1) })
export const mpuInit = () =>
  stmt('mpu6050_init', { AR: 'MPU6050_RANGE_8_G', GR: 'MPU6050_RANGE_500_DEG', FB: 'MPU6050_BAND_21_HZ' })
export const mpuRead = () => stmt('mpu6050_readData')
export const acceleration = (axis) => stmt('mpu6050_acceleration', { AXIS: axis })

// ---- Serial ----------------------------------------------------------------------------------
export const serialBegin = (baud = 115200) => stmt('serial_begin', { BAUD: String(baud) })
export const serialPrint = (x) => stmt('serial_print', null, { VALUE: value('text', x) })
export const serialPrintln = (x) => stmt('serial_println', null, { VALUE: value('text', x) })

// ---- CoBot board -----------------------------------------------------------------------------
// The car moves: forward, backward, turnLeft, turnRight, spinLeft, spinRight.
export const cobotInit = () => stmt('cobotC3_init')
export const cobotDrive = (move, speed) => stmt('cobotC3_drive', { MOVE: move }, { SPEED: numberValue(speed) })
export const cobotStop = () => stmt('cobotC3_stop')
export const cobotMotor = (side, speed) => stmt('cobotC3_setMotor', { MOTOR: side }, { SPEED: numberValue(speed) })
export const cobotTrim = (percent) => stmt('cobotC3_setTrim', null, { PERCENT: numberValue(percent) })
export const eye = (n) => stmt('cobotC3_readEye', { EYE: String(n) })
export const onLine = (n) => stmt('cobotC3_onLine', { EYE: String(n) })
export const lineWhen = (side, threshold) =>
  stmt('cobotC3_setLine', { SIDE: side }, { THRESHOLD: numberValue(threshold) })
export const pattern = () => stmt('cobotC3_pattern')
export const patternIs = (p) => stmt('cobotC3_patternIs', null, { PATTERN: value('text', p) })
export const irLight = (on) => stmt('cobotC3_irLight', { STATE: on ? 'HIGH' : 'LOW' })
export const whiteLight = (on) => stmt('cobotC3_whiteLight', { STATE: on ? 'HIGH' : 'LOW' })

// ---- colour sensor ---------------------------------------------------------------------------
// Colour codes: 0 black, 1 red, 2 green, 3 blue, 4 yellow, 5 white.
export const colourInit = () => stmt('colourSensor_init')
export const colourRead = (channel) => stmt('colourSensor_read', { CHANNEL: String(channel) })
export const colourIs = (code) => stmt('colourSensor_is', { COLOUR: String(code) })
export const colourName = () => stmt('colourSensor_name')
