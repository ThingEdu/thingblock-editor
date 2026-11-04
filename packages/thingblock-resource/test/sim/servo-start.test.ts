// Imports scratch-blocks source, whose `Order` enum is not erasable syntax, so the package's tsc excludes this
// file; it only runs under vitest, which strips types without checking them.
/**
 * "start servo" runs the motion in the background: the servo reaches its angle while the program goes on,
 * with no "wait for servos" block, in the simulator as on the board (generator.ts steps it from loop()).
 */
import * as Blockly from 'blockly/core'
import { expect, it } from 'vitest'
import { Order } from '../../../thingblock-blocks/src/generators/arduino/order'
import { SimGenerator } from '../../../thingblock-blocks/src/generators/sim'
import { loadProject, type Sb3Project } from '../../../thingblock-sim/src/headless'
import { Session } from '../../../thingblock-sim/src/session'
import { registerSimGenerators } from '../../src/extensions/peripheral/thingbot-core/sim'

const block = (opcode: string, extra: object = {}) => ({
  opcode,
  next: null,
  parent: null,
  inputs: {},
  fields: {},
  shadow: false,
  topLevel: false,
  ...extra,
})

it('a started servo reaches its angle without a wait block', () => {
  const project = {
    targets: [
      { isStage: true, name: 'Stage', variables: {}, lists: {}, blocks: {} },
      {
        isStage: false,
        name: 'Sprite1',
        variables: {},
        lists: {},
        blocks: {
          h: block('event_whenarduinobegin', { topLevel: true, next: 's', x: 0, y: 0 }),
          s: block('thingBotC3_startServoAngle', {
            parent: 'h',
            fields: { SERVO: ['1', null] },
            inputs: { ANGLE: [1, [4, '0']], SECONDS: [1, [4, '1']] },
          }),
        },
      },
    ],
  } as unknown as Sb3Project
  const generator = new SimGenerator()
  registerSimGenerators(generator as never, Order)
  const workspace = loadProject(Blockly, project)
  const code = generator.workspaceToCode(workspace)
  workspace.dispose()
  expect(generator.diagnostics).toEqual([])

  const session = new Session(code, { now: () => 0 })
  session.running = true
  for (let i = 0; i < 120; i++) session.tick(16) // ~2 s of virtual time
  const snapshot = session.snapshot()
  expect(snapshot.error).toBeUndefined()
  // S1 is PCA9685 channel 12; 0 degrees is the low end of the servo pulse range.
  const at0 = snapshot.pwm[12]
  expect(at0).toBeGreaterThan(0)
  expect(at0).toBeLessThan(150)
})
