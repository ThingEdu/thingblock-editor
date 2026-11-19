import type { ComponentProps } from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import { Blocks } from '../../../src/components/blocks/blocks'
import { vmOf } from '../render-in-editor'

// onWorkspaceUpdate runs on an unmounted instance, with just enough of Blockly and the workspace mocked: jsdom
// cannot inject a real workspace
let blocks: Blocks
let scratchBlocks: {
  Events: { disable: () => void; enable: () => void }
  utils: { xml: { textToDom: (xml: string) => Element } }
  clearWorkspaceAndLoadFromXml: (dom: Element) => void
  arduinoGenerator: { workspaceToCode: () => string }
}
let onSetGeneratedCode: ReturnType<typeof vi.fn>

beforeEach(() => {
  onSetGeneratedCode = vi.fn()
  const props = {
    vm: vmOf(createEditorStore()),
    selectedDeviceId: 'arduino_uno',
    colorMode: 'default',
    workspaceMetrics: { targets: {} },
    updateToolboxState: vi.fn(),
    onSetGeneratedCode,
  } as Partial<ComponentProps<typeof Blocks>> as ComponentProps<typeof Blocks>
  blocks = new Blocks(props)
  scratchBlocks = {
    Events: { disable: vi.fn(), enable: vi.fn() },
    utils: { xml: { textToDom: vi.fn(() => document.createElement('xml')) } },
    clearWorkspaceAndLoadFromXml: vi.fn(),
    arduinoGenerator: { workspaceToCode: vi.fn(() => 'void loop() {}') },
  }
  blocks.ScratchBlocks = scratchBlocks as unknown as Blocks['ScratchBlocks']
  blocks.workspace = {
    removeChangeListener: vi.fn(),
    addChangeListener: vi.fn(),
    clearUndo: vi.fn(),
  } as unknown as Blocks['workspace']
})

test('Blockly events are enabled again even when the load throws', () => {
  vi.mocked(scratchBlocks.clearWorkspaceAndLoadFromXml).mockImplementation(() => {
    throw new Error('workspace load failed')
  })

  blocks.onWorkspaceUpdate({ xml: '<xml/>' })

  expect(scratchBlocks.Events.disable).toHaveBeenCalled()
  expect(scratchBlocks.Events.enable).toHaveBeenCalled()
})

test('regenerates the code for the loaded blocks', () => {
  // Blockly events are off while the project loads, so the change listener never sees it; the
  // code view (and Upload, which sends that code) would otherwise keep the previous project.
  vi.mocked(scratchBlocks.clearWorkspaceAndLoadFromXml).mockImplementation(() => {
    expect(onSetGeneratedCode).not.toHaveBeenCalled()
  })

  blocks.onWorkspaceUpdate({ xml: '<xml/>' })

  expect(onSetGeneratedCode).toHaveBeenCalledTimes(1)
  expect(onSetGeneratedCode).toHaveBeenCalledWith('void loop() {}')
})
