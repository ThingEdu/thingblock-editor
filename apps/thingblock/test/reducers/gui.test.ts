import VM from '@thingblock/thingblock-vm'
import { expect, test } from 'vitest'
import guiReducer, { buildInitialState } from '../../src/reducers/gui'
import { setVM } from '../../src/reducers/vm'

test('the initial state has a VM and matches the reducer', () => {
  const state = buildInitialState()

  expect(state.vm).toBeInstanceOf(VM)
  expect(guiReducer(state, setVM(state.vm))).toEqual(state)
})
