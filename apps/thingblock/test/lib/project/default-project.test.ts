import VM from '@thingblock/thingblock-vm'
import { expect, test } from 'vitest'
import { LegacyStorage } from '../../../src/lib/project/legacy-storage'
import { defaultProjectId } from '../../../src/reducers/project-state'

test('the VM loads the default project from storage, which holds no costume or sound assets', async () => {
  const storage = new LegacyStorage()
  const { scratchStorage } = storage
  const asset = await scratchStorage.load(
    scratchStorage.AssetType.Project,
    defaultProjectId,
    scratchStorage.DataFormat.JSON,
  )
  if (!asset?.data) throw new Error('default project missing from storage')

  const vm = new VM()
  vm.attachStorage(scratchStorage)
  await vm.project.load(asset.data)

  const stage = vm.runtime.getTargetForStage()
  expect(stage?.lookupVariableByNameAndType('my variable')).toBeTruthy()
  expect(vm.runtime.targets.filter((target) => !target.isStage)).toHaveLength(1)
})

test('the default project is localized when storage gets a translator', async () => {
  const storage = new LegacyStorage()
  storage.setTranslatorFunction((message) => (message.id === 'gui.defaultProject.variable' ? 'biến của tôi' : ''))
  const { scratchStorage } = storage
  const asset = await scratchStorage.load(
    scratchStorage.AssetType.Project,
    defaultProjectId,
    scratchStorage.DataFormat.JSON,
  )
  expect(asset?.data).toContain('biến của tôi')
})
