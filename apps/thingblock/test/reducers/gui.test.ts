import { ScratchStorage } from '@thingblock/thingblock-storage'
import { expect, test } from 'vitest'
import type { GUIConfig } from '../../src/gui-config'
import guiReducer, { buildInitialState } from '../../src/reducers/gui'

test('the initial state has a VM attached to the host storage', () => {
  const config: GUIConfig = {
    storage: { scratchStorage: new ScratchStorage(), saveProject: () => Promise.resolve({ id: '1' }) },
  }

  const state = buildInitialState(config)

  expect(state.vm.runtime.storage).toBe(config.storage.scratchStorage)
  expect(guiReducer(state, { type: 'anything' })).toEqual(state)
})
