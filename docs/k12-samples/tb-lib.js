/**
 * Reusable .tb (sb3) project builder, lifted from the tram-quan-trac generator so several
 * lesson programs can share one compiler instead of each re-deriving the sb3 block shapes.
 */
'use strict';

let VARS = {};
const setVars = (v) => { VARS = v; };

const num = (n) => ({ kind: 'num', value: String(n) });
// Stock Scratch's own toolbox (packages/scratch-gui/src/lib/make-toolbox-xml.js) gives control_wait's
// DURATION a math_positive_number shadow and control_repeat's TIMES a math_whole_number shadow —
// confirmed against a real saved project (`BLUESILK Servo.tb`), which serializes DURATION as
// primitive constant 5, not the generic math_number (4) used everywhere else in this file.
const posnum = (n) => ({ kind: 'posnum', value: String(n) });
const wholenum = (n) => ({ kind: 'wholenum', value: String(n) });
const text = (s) => ({ kind: 'text', value: String(s) });
const varGet = (name) => ({ kind: 'varGet', name });
const VAR = (name) => ({ __var: name });
const reporter = (op, { fields = {}, inputs = {} } = {}) => ({ kind: 'reporter', op, fields, inputs });
const stmt = (op, { fields = {}, inputs = {}, statements = {} } = {}) => ({
  kind: 'stmt',
  op,
  fields,
  inputs,
  statements,
});

const totext = (v) => reporter('operator_totext', { inputs: { VALUE: v } });

/** Right-folds a list of text-producing nodes/literals into nested operator_join calls. */
const joinAll = (parts) => {
  const vals = parts.map((p) => (typeof p === 'string' ? text(p) : p));
  let node = vals[vals.length - 1];
  for (let i = vals.length - 2; i >= 0; i--) {
    node = reporter('operator_join', { inputs: { STRING1: vals[i], STRING2: node } });
  }
  return node;
};

// ---- the two reusable sub-sequences ----------------------------------------------------------

/** Reads both DHT11 sensors into variables, computes the difference, and draws all of it on the OLED. */
const makeDisplayUpdate = (line4) => [
  stmt('oled_clear'),
  stmt('data_setvariableto', {
    fields: { VARIABLE: VAR('nhietDoL1') },
    inputs: { VALUE: reporter('dht_readTemperature', { fields: { UNIT: 'false' }, inputs: { NO: num(1) } }) },
  }),
  stmt('data_setvariableto', {
    fields: { VARIABLE: VAR('doAmL1') },
    inputs: { VALUE: reporter('dht_readHumidity', { inputs: { NO: num(1) } }) },
  }),
  stmt('data_setvariableto', {
    fields: { VARIABLE: VAR('nhietDoL2') },
    inputs: { VALUE: reporter('dht_readTemperature', { fields: { UNIT: 'false' }, inputs: { NO: num(2) } }) },
  }),
  stmt('data_setvariableto', {
    fields: { VARIABLE: VAR('doAmL2') },
    inputs: { VALUE: reporter('dht_readHumidity', { inputs: { NO: num(2) } }) },
  }),
  stmt('data_setvariableto', {
    fields: { VARIABLE: VAR('chenhLech') },
    inputs: {
      VALUE: reporter('operator_subtract', { inputs: { NUM1: varGet('nhietDoL1'), NUM2: varGet('nhietDoL2') } }),
    },
  }),
  stmt('oled_setCursor', { inputs: { X: num(0), Y: num(0) } }),
  stmt('oled_print', {
    fields: { EOL: 'warp' },
    inputs: { DATA: joinAll(['L1 ', totext(varGet('nhietDoL1')), 'C ', totext(varGet('doAmL1')), '%']) },
  }),
  stmt('oled_setCursor', { inputs: { X: num(0), Y: num(12) } }),
  stmt('oled_print', {
    fields: { EOL: 'warp' },
    inputs: { DATA: joinAll(['L2 ', totext(varGet('nhietDoL2')), 'C ', totext(varGet('doAmL2')), '%']) },
  }),
  stmt('oled_setCursor', { inputs: { X: num(0), Y: num(24) } }),
  stmt('oled_print', {
    fields: { EOL: 'warp' },
    inputs: { DATA: joinAll(['Chenh ', totext(varGet('chenhLech')), 'C']) },
  }),
  stmt('oled_setCursor', { inputs: { X: num(0), Y: num(36) } }),
  stmt('oled_print', { fields: { EOL: 'warp' }, inputs: { DATA: line4 } }),
  stmt('oled_setCursor', { inputs: { X: num(0), Y: num(48) } }),
  stmt('oled_print', {
    fields: { EOL: 'warp' },
    inputs: { DATA: joinAll(['Quat ', totext(varGet('trangThaiQuat'))]) },
  }),
  stmt('oled_refresh'),
];

/**
 * Two-threshold fan hysteresis, exactly mirroring the sketch's `fanUpdate()`:
 *   fanOn ? (diff > FAN_OFF_DIFF) : (diff > FAN_ON_DIFF)
 * i.e. turn ON only from OFF when diff > 1.0; turn OFF only from ON when diff < 0.5.
 */
const makeFanRule = () => [
  stmt('control_if', {
    inputs: {
      CONDITION: reporter('operator_and', {
        inputs: {
          OPERAND1: reporter('operator_equals', { inputs: { OPERAND1: varGet('trangThaiQuat'), OPERAND2: num(0) } }),
          OPERAND2: reporter('operator_gt', { inputs: { OPERAND1: varGet('chenhLech'), OPERAND2: num(1) } }),
        },
      }),
    },
    statements: {
      SUBSTACK: [
        stmt('data_setvariableto', { fields: { VARIABLE: VAR('trangThaiQuat') }, inputs: { VALUE: num(1) } }),
        stmt('thingBotC3_setMotor', {
          fields: { MOTOR: '2', DIRECTION: 'forward' },
          inputs: { SPEED: num(100) },
        }),
      ],
    },
  }),
  stmt('control_if', {
    inputs: {
      CONDITION: reporter('operator_and', {
        inputs: {
          OPERAND1: reporter('operator_equals', { inputs: { OPERAND1: varGet('trangThaiQuat'), OPERAND2: num(1) } }),
          OPERAND2: reporter('operator_lt', { inputs: { OPERAND1: varGet('chenhLech'), OPERAND2: num(0.5) } }),
        },
      }),
    },
    statements: {
      SUBSTACK: [
        stmt('data_setvariableto', { fields: { VARIABLE: VAR('trangThaiQuat') }, inputs: { VALUE: num(0) } }),
        stmt('thingBotC3_setMotor', {
          fields: { MOTOR: '2', DIRECTION: 'forward' },
          inputs: { SPEED: num(0) },
        }),
      ],
    },
  }),
];

const servoStart = (servo, angle, seconds) =>
  stmt('thingBotC3_startServoAngle', {
    fields: { SERVO: servo },
    inputs: { ANGLE: num(angle), SECONDS: num(seconds) },
  });

// ---- the whole program under one hat -----------------------------------------------------------
const MAIN_STACK = [
  stmt('thingBotC3_init'),
  stmt('dht_init', { fields: { PIN: '4', MODEL: '11' }, inputs: { NO: num(1) } }),
  stmt('dht_init', { fields: { PIN: '0', MODEL: '11' }, inputs: { NO: num(2) } }),
  stmt('oled_init', { fields: { ADDR: '0x3c' }, inputs: { W: num(128), H: num(64) } }),
  // Stated explicitly so the project also works on an app build whose oled pack predates the
  // init-time default: without a text colour, Adafruit_SSD1306 silently draws nothing.
  stmt('oled_setText', { fields: { SIZE: '1', COLOUR: 'SSD1306_WHITE', BGCOLOR: 'SSD1306_BLACK' } }),
  stmt('data_setvariableto', { fields: { VARIABLE: VAR('trangThaiQuat') }, inputs: { VALUE: num(0) } }),
  // Change the wait here, in one named place. The loop runs until the counter reaches zero
  // instead of repeating a hardcoded count, so the number on screen and the number of
  // iterations can never drift apart.
  stmt('data_setvariableto', { fields: { VARIABLE: VAR('demNguoc') }, inputs: { VALUE: num(60) } }),
  stmt('control_repeat_until', {
    inputs: {
      CONDITION: reporter('operator_equals', { inputs: { OPERAND1: varGet('demNguoc'), OPERAND2: num(0) } }),
    },
    statements: {
      SUBSTACK: [
        ...makeDisplayUpdate(joinAll(['Con ', totext(varGet('demNguoc')), 's'])),
        ...makeFanRule(),
        stmt('control_wait', { inputs: { DURATION: posnum(1) } }),
        stmt('data_setvariableto', {
          fields: { VARIABLE: VAR('demNguoc') },
          inputs: {
            VALUE: reporter('operator_subtract', { inputs: { NUM1: varGet('demNguoc'), NUM2: num(1) } }),
          },
        }),
      ],
    },
  }),
  servoStart('1', 90, 2),
  servoStart('2', 90, 2),
  stmt('thingBotC3_waitServos'),
  stmt('control_wait', { inputs: { DURATION: posnum(5) } }),
  servoStart('1', 180, 2),
  servoStart('2', 180, 2),
  stmt('thingBotC3_waitServos'),
  stmt('control_forever', {
    statements: { SUBSTACK: [...makeDisplayUpdate(text('Dang do')), ...makeFanRule()] },
  }),
];

const HAT = stmt('event_whenarduinobegin');

// ---- sb3 compiler -----------------------------------------------------------------------------
let counter = 0;
const nextId = (prefix) => `${prefix}${counter++}`;

/**
 * Compiles the tree into an sb3 "blocks" map (the shape sb3.js's deserializeBlocks/deserializeInputs
 * expects: compact input arrays, primitives inlined where possible, real block entries for the rest).
 * @param {Array<object>} mainStack The top-level statement stack (following the hat).
 * @returns {object} The target's `blocks` map.
 */
function compileProject(mainStack) {
  const blocks = Object.create(null);

  const compileFields = (fieldsSpec) => {
    const out = {};
    for (const [name, val] of Object.entries(fieldsSpec)) {
      if (val && typeof val === 'object' && '__var' in val) {
        out[name] = [val.__var, VARS[val.__var]];
      } else {
        // Real saves always carry a second (field-id) slot, null for non-variable fields — see
        // serializeFields in sb3.js, which pushes it whenever the field object has an `id` key at
        // all (Blockly field models always do, even when unused).
        out[name] = [String(val), null];
      }
    }
    return out;
  };

  /** Compiles a value node into the compact array that goes directly into a parent's `inputs[name]`. */
  const compileValue = (node, parentId) => {
    if (node.kind === 'num') return [1, [4, node.value]];
    if (node.kind === 'posnum') return [1, [5, node.value]];
    if (node.kind === 'wholenum') return [1, [6, node.value]];
    if (node.kind === 'text') return [1, [10, node.value]];
    if (node.kind === 'varGet') return [1, [12, node.name, VARS[node.name]]];
    if (node.kind === 'reporter') {
      const id = nextId('r');
      blocks[id] = {
        opcode: node.op,
        next: null,
        parent: parentId,
        inputs: compileInputs(node.inputs, id),
        fields: compileFields(node.fields),
        shadow: false,
        topLevel: false,
      };
      return [2, id];
    }
    throw new Error(`Unknown value node kind: ${node.kind}`);
  };

  const compileInputs = (inputsSpec, parentId) => {
    const out = {};
    for (const [name, node] of Object.entries(inputsSpec)) {
      out[name] = compileValue(node, parentId);
    }
    return out;
  };

  /** Compiles a statement stack, linking next/parent, and returns the first block's id (or null). */
  const compileStack = (stack, parentId) => {
    let firstId = null;
    let prevId = null;
    for (const node of stack) {
      const id = nextId('b');
      if (firstId === null) firstId = id;
      const statements = {};
      for (const [name, substack] of Object.entries(node.statements)) {
        const childFirst = compileStack(substack, id);
        if (childFirst) statements[name] = childFirst;
      }
      blocks[id] = {
        opcode: node.op,
        next: null, // patched below once the following block's id is known
        parent: prevId !== null ? prevId : parentId,
        inputs: compileInputs(node.inputs, id),
        fields: compileFields(node.fields),
        shadow: false,
        topLevel: false,
      };
      for (const [name, childFirstId] of Object.entries(statements)) {
        blocks[id].inputs[name] = [2, childFirstId];
      }
      if (prevId !== null) blocks[prevId].next = id;
      prevId = id;
    }
    return firstId;
  };

  const hatId = nextId('b');
  blocks[hatId] = {
    opcode: HAT.op,
    next: null,
    parent: null,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: true,
    x: 0,
    y: 0,
  };
  const firstId = compileStack(mainStack, hatId);
  if (firstId) blocks[hatId].next = firstId;

  return blocks;
}


const PLACEHOLDER_COSTUME = {
  name: 'costume1',
  assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
  md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
  dataFormat: 'svg',
};

/** Wraps a compiled block map into a complete .tb project object. */
function makeProject({ board, varNames = [], mainStack }) {
  const VARS_LOCAL = {};
  for (const n of varNames) VARS_LOCAL[n] = 'var_' + n;
  setVars(VARS_LOCAL);
  const blocks = compileProject(mainStack);
  const variables = {};
  for (const [name, id] of Object.entries(VARS_LOCAL)) variables[id] = [name, 0];
  return {
    targets: [
      { isStage: true, name: 'Stage', variables: {}, lists: {}, broadcasts: {}, blocks: {},
        comments: {}, costumes: [PLACEHOLDER_COSTUME], sounds: [], volume: 100, tempo: 60,
        textToSpeechLanguage: null },
      { isStage: false, name: 'Sprite1', variables, lists: {}, broadcasts: {}, blocks,
        comments: {}, currentCostume: 0, costumes: [PLACEHOLDER_COSTUME], sounds: [],
        volume: 100, layerOrder: 1, visible: true, x: 0, y: 0, size: 100, direction: 90,
        draggable: false, rotationStyle: 'all around' },
    ],
    monitors: [],
    extensions: [],
    meta: { semver: '3.0.0', vm: '11.0.0', agent: '' },
    board,
  };
}

module.exports = { num, posnum, wholenum, text, varGet, VAR, reporter, stmt, totext, joinAll, makeProject };
