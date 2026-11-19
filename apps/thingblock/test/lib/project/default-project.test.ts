import VM from '@thingblock/thingblock-vm'
import { expect, test } from 'vitest'
import defaultProject from '../../../src/lib/project/default-project'

test('the VM loads the default project without storage or assets', async () => {
  const vm = new VM()
  await vm.project.load(JSON.stringify(defaultProject()))

  const stage = vm.runtime.getTargetForStage()
  expect(stage?.lookupVariableByNameAndType('my variable')).toBeTruthy()
  expect(vm.runtime.targets.filter((target) => !target.isStage)).toHaveLength(1)
})

test('the default project is localized by the translator', () => {
  const project = defaultProject((message) => (message.id === 'gui.defaultProject.variable' ? 'biến của tôi' : ''))

  expect(JSON.stringify(project)).toContain('biến của tôi')
})
