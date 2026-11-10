// Build `.tb` example projects from a compact authoring form.
//
// A program is written as scratch-blocks JSON serialization (the same shape thingbot-sim's lesson
// `example` field uses: `{type, fields, inputs: {NAME: {shadow, block}}, next: {block}}`), and this
// module converts it to the Scratch 3 `project.json` that ThingBlock saves: blocks in the sprite,
// variables (with their `variableTypes`) on the stage, `extensions` derived from the opcodes and the
// `board` the project targets. Two additions to the serialization: `comment` (a Vietnamese note
// attached to the block) and `extraState.proccode` on `procedures_definition` / `procedures_call`.
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const JSZip = require('jszip')

/** sb3 primitive codes for the shadow blocks that serialize inline. */
const PRIMITIVES = {
  math_number: [4, 'NUM'],
  math_positive_number: [5, 'NUM'],
  math_whole_number: [6, 'NUM'],
  math_integer: [7, 'NUM'],
  math_angle: [8, 'NUM'],
  colour_picker: [9, 'COLOUR'],
  text: [10, 'TEXT'],
}

/** Opcode prefixes of the built-in categories; anything else names an extension. */
const CORE_PREFIXES = new Set([
  'argument',
  'colour',
  'control',
  'data',
  'event',
  'looks',
  'math',
  'motion',
  'operator',
  'procedures',
  'sensing',
  'sound',
  'text',
])

/** Peripherals a device activates on its own (its manifest `extensions`); not saved in `board`. */
const DEVICE_AUTO_PERIPHERALS = { thingbot: ['thingBotC3', 'ps2'] }

/** The placeholder costume every ThingBlock save references (the editor ships the asset itself). */
const COSTUME = {
  name: 'costume1',
  assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
  md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
  dataFormat: 'svg',
}

/** Fixed zip entry date so rebuilding an unchanged example yields byte-identical files. */
const ZIP_DATE = new Date('2026-11-01T00:00:00Z')

const COLUMN_WIDTH = 760
const COMMENT_OFFSET_X = 420

/**
 * Convert one program to a ThingBlock `project.json` object.
 * @param {object} spec The example.
 * @param {Array<object>} spec.stacks Top-level blocks (hats, procedure definitions), serialization form.
 * @param {Array<{name: string, type?: 'int'|'float'|'string'}>} [spec.variables] Stage variables.
 * @param {Array<{name: string, items: string[]}>} [spec.lists] Stage lists.
 * @param {string|null} [spec.device] Target device id (default `thingbot`); null for a project that
 *   runs in the editor without a board (Camera AI), which saves no `board`.
 * @param {string} [spec.note] Workspace comment shown at the top-left (the lesson summary).
 * @returns {object} The `project.json` content, ready to zip.
 */
export function toProject({ stacks, variables = [], lists = [], device = 'thingbot', note }) {
  const blocks = {}
  const comments = {}
  let counter = 0
  const nextId = (prefix) => `${prefix}${++counter}`

  const varsByName = new Map()
  variables.forEach((v, i) => varsByName.set(v.name, { id: `var${i + 1}`, ...v }))
  const varById = new Map([...varsByName.values()].map((v) => [v.id, v]))
  const resolveVar = (ref) => {
    const v = varsByName.get(ref.name ?? ref.id) ?? varById.get(ref.id)
    if (!v) throw new Error(`Unknown variable ${JSON.stringify(ref)}`)
    return v
  }

  const listsByName = new Map(lists.map((l, i) => [l.name, { id: `list${i + 1}`, ...l }]))

  // A primitive shadow serializes inline; any other (an extension's menu) is a shadow block of its own.
  const shadowOf = (shadow, parent) => {
    const kind = PRIMITIVES[shadow.type]
    if (kind) return [kind[0], String(shadow.fields?.[kind[1]] ?? '')]
    const id = nextId('s')
    blocks[id] = {
      opcode: shadow.type,
      next: null,
      parent,
      inputs: {},
      fields: Object.fromEntries(Object.entries(shadow.fields ?? {}).map(([k, v]) => [k, [String(v), null]])),
      shadow: true,
      topLevel: false,
    }
    return id
  }

  /**
   * Add a block (and everything under it) to the map.
   * @param {object} b The serialized block.
   * @param {string|null} parent The parent block id.
   * @param {{x: number, y: number}|null} pos Position for a top-level block.
   * @param {{x: number, y: number}} anchor Where this stack's comments line up.
   * @returns {string} The new block id.
   */
  const add = (b, parent, pos, anchor) => {
    const id = nextId('b')
    const out = {
      opcode: b.type,
      next: null,
      parent,
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: pos !== null,
    }
    if (pos) {
      out.x = pos.x
      out.y = pos.y
    }
    blocks[id] = out

    for (const [name, value] of Object.entries(b.fields ?? {})) {
      if (name === 'VARIABLE') {
        const v = resolveVar(value)
        out.fields[name] = [v.name, v.id]
      } else if (name === 'LIST') {
        const l = listsByName.get(value.name)
        if (!l) throw new Error(`Unknown list ${JSON.stringify(value)}`)
        out.fields[name] = [l.name, l.id]
      } else {
        out.fields[name] = [String(value), null]
      }
    }

    if (b.type === 'procedures_definition') {
      const protoId = nextId('p')
      blocks[protoId] = {
        opcode: 'procedures_prototype',
        next: null,
        parent: id,
        inputs: {},
        fields: {},
        shadow: true,
        topLevel: false,
        mutation: {
          tagName: 'mutation',
          children: [],
          proccode: b.extraState.proccode,
          argumentids: '[]',
          argumentnames: '[]',
          argumentdefaults: '[]',
          warp: 'false',
        },
      }
      out.inputs.custom_block = [1, protoId]
    }
    if (b.type === 'procedures_call') {
      out.mutation = {
        tagName: 'mutation',
        children: [],
        proccode: b.extraState.proccode,
        argumentids: '[]',
        warp: 'false',
      }
    }

    for (const [name, input] of Object.entries(b.inputs ?? {})) {
      const shadow = input.shadow ? shadowOf(input.shadow, id) : null
      if (input.block) {
        let ref
        if (input.block.type === 'data_variable') {
          const v = resolveVar(input.block.fields.VARIABLE)
          ref = [12, v.name, v.id]
        } else {
          ref = add(input.block, id, null, anchor)
        }
        out.inputs[name] = shadow ? [3, ref, shadow] : [2, ref]
      } else if (shadow) {
        out.inputs[name] = [1, shadow]
      }
    }

    if (b.comment) {
      const commentId = nextId('c')
      comments[commentId] = {
        blockId: id,
        x: anchor.x + COMMENT_OFFSET_X,
        y: anchor.y,
        width: 300,
        height: Math.max(80, 24 * Math.ceil(b.comment.length / 34)),
        minimized: false,
        text: b.comment,
      }
      out.comment = commentId
      anchor.y += comments[commentId].height + 16
    }

    if (b.next?.block) out.next = add(b.next.block, id, null, anchor)
    return id
  }

  let y0 = 40
  if (note) {
    const height = Math.max(100, 22 * Math.ceil(note.length / 60))
    comments[nextId('c')] = { blockId: null, x: 40, y: 40, width: 640, height, minimized: false, text: note }
    y0 = 40 + height + 40
  }
  stacks.forEach((stack, i) => {
    const pos = { x: 40 + i * COLUMN_WIDTH, y: y0 }
    add(stack, null, pos, { x: pos.x, y: pos.y })
  })

  const { extensions, peripherals } = packsOf(Object.values(blocks), device)

  const stageLists = Object.fromEntries([...listsByName.values()].map((l) => [l.id, [l.name, l.items]]))
  const stageVariables = {}
  const variableTypes = {}
  for (const v of varsByName.values()) {
    stageVariables[v.id] = [v.name, v.type === 'string' ? '' : 0]
    if (v.type) variableTypes[v.id] = v.type
  }

  return {
    targets: [
      {
        isStage: true,
        name: 'Stage',
        variables: stageVariables,
        lists: stageLists,
        broadcasts: {},
        variableTypes,
        blocks: {},
        comments: {},
        currentCostume: 0,
        costumes: [COSTUME],
        sounds: [],
        volume: 100,
        layerOrder: 0,
        tempo: 60,
        videoTransparency: 50,
        videoState: 'on',
        textToSpeechLanguage: null,
      },
      {
        isStage: false,
        name: 'Sprite1',
        variables: {},
        lists: {},
        broadcasts: {},
        blocks,
        comments,
        currentCostume: 0,
        costumes: [COSTUME],
        sounds: [],
        volume: 100,
        layerOrder: 1,
        visible: true,
        x: 0,
        y: 0,
        size: 100,
        direction: 90,
        draggable: false,
        rotationStyle: 'all around',
      },
    ],
    monitors: [],
    extensions,
    meta: { semver: '3.0.0', vm: '14.1.0', agent: 'thingblock-resource/scripts/examples' },
    ...(device ? { board: { device, peripherals } } : {}),
  }
}

/**
 * The packs a set of blocks needs: every non-core opcode prefix, and of those the ones the board does
 * not add by itself.
 * @param {{opcode: string}[]} blocks Every block in the project, from all targets.
 * @param {string} device The board id.
 * @returns {{extensions: string[], peripherals: string[]}} The project's `extensions` and `board.peripherals`.
 */
export function packsOf(blocks, device) {
  const extensions = []
  for (const { opcode } of blocks) {
    const prefix = opcode.split('_')[0]
    if (!CORE_PREFIXES.has(prefix) && !extensions.includes(prefix)) extensions.push(prefix)
  }
  const auto = DEVICE_AUTO_PERIPHERALS[device] ?? []
  return { extensions, peripherals: extensions.filter((e) => !auto.includes(e)) }
}

/**
 * Fill in what a hand-written, blocks-only `project.json` leaves out so the editor opens it like one of
 * its own saves: the target fields the validator requires, the placeholder costume, `extensions` and
 * `board`. Fields already present are kept.
 * @param {object} project A project.json object, possibly minimal.
 * @param {string|null} device The board id the project targets; null for a boardless (Camera AI) project.
 * @param {string[]} [extraPeripherals] Packs to add to `board.peripherals` even when no block uses them.
 * @returns {object} A complete project.json object.
 */
export function completeProject(project, device = 'thingbot', extraPeripherals = []) {
  const stage = {
    isStage: true,
    name: 'Stage',
    variables: {},
    lists: {},
    broadcasts: {},
    blocks: {},
    comments: {},
    currentCostume: 0,
    costumes: [],
    sounds: [],
    volume: 100,
    layerOrder: 0,
    tempo: 60,
    videoTransparency: 50,
    videoState: 'on',
    textToSpeechLanguage: null,
  }
  const sprite = (layerOrder) => ({
    isStage: false,
    name: 'Sprite1',
    variables: {},
    lists: {},
    broadcasts: {},
    blocks: {},
    comments: {},
    currentCostume: 0,
    costumes: [],
    sounds: [],
    volume: 100,
    layerOrder,
    visible: true,
    x: 0,
    y: 0,
    size: 100,
    direction: 90,
    draggable: false,
    rotationStyle: 'all around',
  })
  const targets = project.targets.map((target, i) => {
    const full = { ...(target.isStage ? stage : sprite(i)), ...target }
    if (!full.costumes.length) full.costumes = [COSTUME]
    return full
  })
  const blocks = targets.flatMap((t) => Object.values(t.blocks).filter((b) => b && typeof b === 'object' && b.opcode))
  const { extensions, peripherals } = packsOf(blocks, device)
  return {
    ...project,
    targets,
    monitors: project.monitors ?? [],
    extensions: project.extensions ?? extensions,
    meta: project.meta ?? { semver: '3.0.0', vm: '14.1.0', agent: 'thingblock-resource/scripts/lessons' },
    ...(project.board || device
      ? { board: project.board ?? { device, peripherals: [...new Set([...peripherals, ...extraPeripherals])] } }
      : {}),
  }
}

/**
 * Zip a project into `.tb` bytes.
 * @param {object} project The project.json object.
 * @returns {Promise<Buffer>} The archive.
 */
export async function toTb(project) {
  const zip = new JSZip()
  zip.file('project.json', JSON.stringify(project), { date: ZIP_DATE })
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}
