import * as ScratchBlocks from '@thingblock/thingblock-blocks'
import type VM from '@thingblock/thingblock-vm'
import { Component, createRef } from 'react'
import { connect, type ConnectedProps } from 'react-redux'
import { type EditorStore, type RootState, useAppSelector } from '../../app/store'
import { makeBlocksTheme } from '../../lib/blocks/blocks-theme'
import { BOARD_ONLY_CATEGORY_IDS } from '../../lib/blocks/board-mode'
import { registerCodeFlush } from '../../lib/blocks/code-flush'
import connectBlocks from '../../lib/blocks/connect-blocks'
import { packCategoryToToolboxXML, type ToolboxCategory } from '../../lib/blocks/device-toolbox-xml'
import makeToolboxXML from '../../lib/blocks/make-toolbox-xml'
import log from '../../lib/log'
import { savePreference } from '../../lib/preferences/user-preferences'
import { type ColorMode, DEFAULT_MODE, getBlocksMediaPath, getColorsForMode } from '../../lib/settings/color-mode'
import { getExtensionColors, injectExtensionCategoryMode } from '../../lib/settings/color-mode/block-helpers'
import { CAT_BLOCKS_THEME } from '../../lib/settings/theme'
import { BLOCKS_DEFAULT_SCALE } from '../../lib/ui/layout-constants'
import { setGeneratedCode } from '../../reducers/code'
import { setConnectionModalExtensionId } from '../../reducers/connection-modal'
import {
  activateCustomProcedures,
  type CustomProceduresCallback,
  deactivateCustomProcedures,
} from '../../reducers/custom-procedures'
import { BLOCKS_TAB_INDEX } from '../../reducers/editor-tab'
import { openConnectionModal } from '../../reducers/modals'
import { updateToolbox } from '../../reducers/toolbox'
import { updateMetrics, type WorkspaceMetrics } from '../../reducers/workspace-metrics'
import Box from '../box/box'
import LibraryExtension from '../library-extension/library-extension'
import ModalCustomProcedures from '../modal-custom-procedures/modal-custom-procedures'
import ModalPrompt, { type VariableOptions } from '../modal-prompt/modal-prompt'
import styles from './blocks.module.css'

/** An extension's palette category, as the VM's `EXTENSION_ADDED` and `BLOCKSINFO_UPDATE` send it. */
type CategoryInfo = VM['runtime']['_blockInfo'][number]

/** A monitor record (an Immutable map), as the VM's `MONITORS_UPDATE` sends it. */
interface MonitorRecord {
  get(key: 'id'): string
  get(key: 'visible'): boolean
}

/** The toolbox `thingblock-blocks` installs, which adds rerendering to Blockly's. */
interface ScratchToolbox extends ScratchBlocks.Toolbox {
  forceRerender: () => void
  runAfterRerender: (callback: () => void) => void
  selectCategoryByName: (name: string) => void
}

type PromptCallback = Parameters<Parameters<typeof ScratchBlocks.ScratchVariables.setPromptHandler>[0]>[2]

type VariableType = Parameters<VM['runtime']['getAllVarNamesOfType']>[0]

// The VM types the Blockly events it listens to by their JSON shape, which Blockly's event classes have only at
// runtime
const blocklyListener = (listener: (event: never) => void) =>
  listener as (event: ScratchBlocks.Events.Abstract) => void

interface PromptState {
  callback: PromptCallback
  defaultValue: string
  message: string
  showTypeOption: boolean
  title: string
  varType: VariableType
}

const defaultOptions = {
  zoom: {
    controls: true,
    wheel: true,
    pinch: true,
    startScale: BLOCKS_DEFAULT_SCALE,
  },
  move: {
    wheel: true,
  },
  grid: {
    spacing: 40,
    length: 2,
    colour: '#ddd',
  },
  comments: true,
  collapse: false,
  sounds: false,
  trashcan: false,
  modalInputs: false,
}

const mapStateToProps = (state: RootState) => ({
  anyModalVisible: Object.values(state.scratchGui.modals).some(Boolean),
  customProceduresVisible: state.scratchGui.customProcedures.active,
  isRtl: state.locales.isRtl,
  isVisible: state.scratchGui.editorTab.activeTabIndex === BLOCKS_TAB_INDEX,
  locale: state.locales.locale,
  messages: state.locales.messages,
  selectedDeviceId: state.scratchGui.board.selectedDeviceId,
  toolboxXML: state.scratchGui.toolbox.toolboxXML,
  vm: state.scratchGui.vm,
  workspaceMetrics: state.scratchGui.workspaceMetrics,
})

const mapDispatchToProps = (dispatch: EditorStore['dispatch']) => ({
  onActivateCustomProcedures: (mutation: Element, callback: CustomProceduresCallback) =>
    dispatch(activateCustomProcedures(mutation, callback)),
  onOpenConnectionModal: (extensionId: string) => {
    dispatch(setConnectionModalExtensionId(extensionId))
    dispatch(openConnectionModal())
  },
  onRequestCloseCustomProcedures: (mutation: Element | null) => dispatch(deactivateCustomProcedures(mutation)),
  onSetGeneratedCode: (code: string) => dispatch(setGeneratedCode(code)),
  updateMetrics: (metrics: Parameters<typeof updateMetrics>[0]) => dispatch(updateMetrics(metrics)),
  updateToolboxState: (toolboxXML: string) => dispatch(updateToolbox(toolboxXML)),
})

const connector = connect(mapStateToProps, mapDispatchToProps)

interface BlocksProps extends ConnectedProps<typeof connector> {
  colorMode: ColorMode
  useCatBlocks: boolean
}

/**
 * The Blockly workspace, with the prompt and "Make a Block" modals it opens and the extension library that adds to
 * its palette. It keeps the VM and the workspace in step: blocks and variables, the palette, glows and reports, the
 * locale, and the generated code.
 */
export class Blocks extends Component<BlocksProps, { prompt: PromptState | null }> {
  state = { prompt: null as PromptState | null }

  ScratchBlocks = connectBlocks(this.vmOf())
  workspace!: ScratchBlocks.WorkspaceSvg
  private blocksRef = createRef<HTMLElement>()
  private lastGeneratedCode: { generatedCode: string } | null = null
  // The toolbox XML the workspace shows, which can lag the store's while the blocks are hidden
  private renderedToolboxXML = ''
  private toolboxUpdateQueue: (() => void)[] = []
  private toolboxUpdateTimeout: ReturnType<typeof setTimeout> | null = null
  private generatedCodeTimeout: ReturnType<typeof setTimeout> | undefined
  private unregisterCodeFlush: (() => void) | null = null

  constructor(props: BlocksProps) {
    super(props)
    this.ScratchBlocks.dialog.setPrompt(this.handlePromptStart)
    this.ScratchBlocks.ScratchVariables.setPromptHandler(this.handlePromptStart)
    this.ScratchBlocks.StatusIndicatorLabel.statusButtonCallback = this.handleConnectionModalStart
  }

  componentDidMount() {
    const container = this.blocksRef.current
    if (!container) throw new Error('Blocks: mounted without its container')
    const { vm } = this.props
    if (!vm) throw new Error('Blocks: the store has no VM')

    // Share the live scratch-blocks handle so device selection can register pack-served device
    // extension blocks and codegen against the same singleton this workspace generates from.
    vm.devices.setScratchBlocks(this.ScratchBlocks)
    // Activate the hidden extension of an already-selected device (e.g. a restored selection) and
    // surface its toolbox categories.
    if (this.props.selectedDeviceId) {
      void this.activateSelectedDevice()
    }

    this.ScratchBlocks.ScratchProcedures.externalProcedureDefCallback = (mutation, callback) => {
      this.props.onActivateCustomProcedures(mutation, callback)
    }
    this.ScratchBlocks.ScratchMsgs.setLocale(this.props.locale)

    this.workspace = this.ScratchBlocks.inject(container, {
      ...defaultOptions,
      media: getBlocksMediaPath(this.props.colorMode),
      rtl: this.props.isRtl,
      toolbox: this.props.toolboxXML,
      theme: makeBlocksTheme(this.props.colorMode),
      scratchTheme: this.props.useCatBlocks
        ? this.ScratchBlocks.ScratchBlocksTheme.CAT_BLOCKS
        : this.ScratchBlocks.ScratchBlocksTheme.CLASSIC,
    })
    this.workspace.registerToolboxCategoryCallback(
      'VARIABLE',
      this.ScratchBlocks.ScratchVariables.getVariablesCategory,
    )
    this.workspace.registerToolboxCategoryCallback(
      'PROCEDURE',
      this.ScratchBlocks.ScratchProcedures.getProceduresCategory,
    )

    this.workspace.addChangeListener(this.toolboxUpdateChangeListener)

    // Regenerate the firmware code view whenever the workspace changes.
    this.workspace.addChangeListener(this.requestGeneratedCodeUpdate)
    this.updateGeneratedCode()
    // Run and Upload regenerate through this before using the code, so a click inside the
    // debounce never acts on the code from before an edit.
    this.unregisterCodeFlush = registerCodeFlush(() => {
      clearTimeout(this.generatedCodeTimeout)
      return this.updateGeneratedCode()
    })

    // Register buttons under new callback keys for creating variables,
    // lists, and procedures from extensions.
    const toolboxWorkspace = this.flyout().getWorkspace()
    const varListButtonCallback = (type: string) => () => {
      this.ScratchBlocks.ScratchVariables.createVariable(this.workspace, undefined, type)
    }
    toolboxWorkspace.registerButtonCallback('MAKE_A_VARIABLE', varListButtonCallback(''))
    toolboxWorkspace.registerButtonCallback('MAKE_A_LIST', varListButtonCallback('list'))
    toolboxWorkspace.registerButtonCallback('MAKE_A_PROCEDURE', () => {
      this.ScratchBlocks.ScratchProcedures.createProcedureDefCallback(this.workspace)
    })

    this.renderedToolboxXML = this.props.toolboxXML

    // @todo change this when blockly supports UI events
    const translate = this.workspace.translate.bind(this.workspace)
    const zoom = this.workspace.zoom.bind(this.workspace)
    this.workspace.translate = (x, y) => {
      translate(x, y)
      this.onWorkspaceMetricsChange()
    }
    this.workspace.zoom = (x, y, amount) => {
      zoom(x, y, amount)
      this.onWorkspaceMetricsChange()
    }
    this.toolbox().selectItemByPosition(0)

    this.attachVM()
    // Only update blocks/vm locale when visible to avoid sizing issues
    // If locale changes while not visible it will get handled in didUpdate
    if (this.props.isVisible) {
      this.setLocale()
    }
  }

  shouldComponentUpdate(nextProps: BlocksProps, nextState: { prompt: PromptState | null }) {
    return (
      this.state.prompt !== nextState.prompt ||
      this.props.isVisible !== nextProps.isVisible ||
      this.renderedToolboxXML !== nextProps.toolboxXML ||
      this.props.customProceduresVisible !== nextProps.customProceduresVisible ||
      this.props.locale !== nextProps.locale ||
      this.props.anyModalVisible !== nextProps.anyModalVisible
    )
  }

  componentDidUpdate(prevProps: BlocksProps) {
    // If any modals are open, call hideChaff to close z-indexed field editors
    if (this.props.anyModalVisible && !prevProps.anyModalVisible) {
      this.ScratchBlocks.hideChaff()
    }

    // Rebuild the toolbox when board selection changes, since board mode gates which
    // blocks and extension categories appear in the palette.
    if (prevProps.selectedDeviceId !== this.props.selectedDeviceId) {
      // Remembered per machine, so the next new project opens on the same board.
      savePreference('device', this.props.selectedDeviceId)
      void this.activateSelectedDevice()
    }

    // Only rerender the toolbox when the blocks are visible and the xml is
    // different from the previously rendered toolbox xml.
    // Do not check against prevProps.toolboxXML because that may not have been rendered.
    if (this.props.isVisible && this.props.toolboxXML !== this.renderedToolboxXML) {
      this.requestToolboxUpdate()
    }

    if (this.props.isVisible === prevProps.isVisible) return

    // @todo hack to resize blockly manually in case resize happened while hidden
    // @todo hack to reload the workspace due to gui bug #413
    if (this.props.isVisible) {
      // Scripts tab
      this.workspace.setVisible(true)
      if (prevProps.locale !== this.props.locale || this.props.locale !== this.vmOf().getLocale()) {
        // call setLocale if the locale has changed, or changed while the blocks were hidden.
        // vm.getLocale() will be out of sync if locale was changed while not visible
        this.setLocale()
      } else {
        this.vmOf().workspace.refreshWorkspace()
      }

      window.dispatchEvent(new Event('resize'))
    } else {
      this.workspace.setVisible(false)
    }
  }

  componentWillUnmount() {
    clearTimeout(this.generatedCodeTimeout)
    this.unregisterCodeFlush?.()
    this.detachVM()
    // Hide any open field editor and move Blockly focus to the workspace
    // root before disposing. Without this, BlockSvg.dispose() detects the
    // focused element is inside a block and schedules a stale
    // setTimeout(() => focusTree(workspace)), which fires after the
    // workspace is unregistered and throws
    // "Attempted to focus unregistered tree" (scratch-blocks#3460).
    //
    // focusNode(workspace) — not focusTree(workspace) — is used here
    // because focusTree would restore focus to whatever was previously
    // focused in this workspace (likely the same block about to be
    // disposed). focusNode pins focus to the workspace root directly,
    // ensuring no block is focused when dispose() runs.
    this.ScratchBlocks.WidgetDiv.hide()
    this.ScratchBlocks.getFocusManager().focusNode(this.workspace)
    this.workspace.dispose()
    if (this.toolboxUpdateTimeout) clearTimeout(this.toolboxUpdateTimeout)

    // Clear the flyout blocks so that they can be recreated on mount.
    this.vmOf().workspace.clearFlyoutBlocks()
  }

  private vmOf() {
    if (!this.props.vm) throw new Error('Blocks: the store has no VM')
    return this.props.vm
  }

  private flyout() {
    return this.workspace.getFlyout() as ScratchBlocks.CheckableContinuousFlyout
  }

  private toolbox() {
    return this.workspace.getToolbox() as ScratchToolbox
  }

  private toolboxUpdateChangeListener = (event: ScratchBlocks.Events.Abstract) => {
    const { Events } = this.ScratchBlocks
    if (
      event instanceof Events.VarCreate ||
      event instanceof Events.VarRename ||
      event instanceof Events.VarDelete ||
      (event instanceof Events.BlockDelete && event.oldJson?.type === 'procedures_definition') ||
      // Only refresh the toolbox when procedure block creations are
      // triggered by undoing a deletion (implied by recordUndo being
      // false on the event).
      (event instanceof Events.BlockCreate && event.json?.type === 'procedures_definition' && !event.recordUndo)
    ) {
      this.requestToolboxUpdate()
    }
  }

  private requestToolboxUpdate() {
    if (this.toolboxUpdateTimeout) clearTimeout(this.toolboxUpdateTimeout)
    this.toolboxUpdateTimeout = setTimeout(() => {
      this.updateToolbox()
    }, 0)
  }

  // Regenerates the Arduino code view off the workspace, coalescing the burst of events a single edit produces
  private requestGeneratedCodeUpdate = () => {
    clearTimeout(this.generatedCodeTimeout)
    this.generatedCodeTimeout = setTimeout(this.updateGeneratedCode, 200)
  }

  private setLocale() {
    this.ScratchBlocks.ScratchMsgs.setLocale(this.props.locale)
    void this.vmOf()
      .setLocale(this.props.locale, this.props.messages)
      .then(() => {
        this.flyout().setRecyclingEnabled(false)
        this.vmOf().workspace.refreshWorkspace()
        this.requestToolboxUpdate()
        this.withToolboxUpdates(() => {
          this.flyout().setRecyclingEnabled(true)
        })
      })
  }

  private updateToolbox() {
    this.toolboxUpdateTimeout = null

    const flyout = this.flyout()
    const toolbox = this.toolbox()
    const scale = flyout.getWorkspace().scale
    const selectedItem = toolbox.getSelectedItem()
    if (!selectedItem) throw new Error('Blocks.updateToolbox: no toolbox category is selected')
    const selectedCategoryName = selectedItem.getName()
    const selectedCategoryScrollPosition = (flyout.getCategoryScrollPosition(selectedCategoryName) ?? 0) * scale
    const offsetWithinCategory = flyout.getWorkspace().getMetrics().viewTop - selectedCategoryScrollPosition

    this.workspace.updateToolbox(this.props.toolboxXML)
    toolbox.runAfterRerender(() => {
      const newCategoryScrollPosition = flyout.getCategoryScrollPosition(selectedCategoryName)
      if (newCategoryScrollPosition) {
        flyout.getWorkspace().scrollbar?.setY(newCategoryScrollPosition * scale + offsetWithinCategory)
      }
    })
    toolbox.forceRerender()
    this.renderedToolboxXML = this.props.toolboxXML

    const queue = this.toolboxUpdateQueue
    this.toolboxUpdateQueue = []
    queue.forEach((fn) => fn())
  }

  private withToolboxUpdates(fn: () => void) {
    // if there is a queued toolbox update, we need to wait
    if (this.toolboxUpdateTimeout) {
      this.toolboxUpdateQueue.push(fn)
    } else {
      fn()
    }
  }

  private attachVM() {
    const vm = this.vmOf()
    this.workspace.addChangeListener(blocklyListener((event) => vm.workspace.blockListener(event)))
    const flyoutWorkspace = this.flyout().getWorkspace()
    flyoutWorkspace.addChangeListener(blocklyListener((event) => vm.workspace.flyoutBlockListener(event)))
    flyoutWorkspace.addChangeListener(blocklyListener((event) => vm.workspace.monitorBlockListener(event)))
    for (const [name, handler] of Object.entries(this.vmHandlers)) vm.events.on(name, handler)
  }

  private detachVM() {
    const vm = this.vmOf()
    for (const [name, handler] of Object.entries(this.vmHandlers)) vm.events.off(name, handler)
  }

  private onWorkspaceMetricsChange = () => {
    const target = this.vmOf().workspace.editingTarget
    if (target?.id) {
      // Dispatch updateMetrics later, since onWorkspaceMetricsChange may be (very indirectly)
      // called from a reducer, i.e. when you create a custom procedure.
      // TODO: Is this a vehement hack?
      setTimeout(() => {
        this.props.updateMetrics({
          targetID: target.id,
          scrollX: this.workspace.scrollX,
          scrollY: this.workspace.scrollY,
          scale: this.workspace.scale,
        })
      }, 0)
    }
  }

  private updateGeneratedCode = () => {
    // Code generation only applies in board mode; host mode has no code view.
    if (!this.props.selectedDeviceId) {
      this.lastGeneratedCode = { generatedCode: '' }
      this.props.onSetGeneratedCode('')
      return this.lastGeneratedCode
    }
    // A block left mid-edit (e.g. an unsupported host block) makes the
    // generator throw; keep the last good output rather than blanking the view.
    let generatedCode = this.lastGeneratedCode?.generatedCode ?? ''
    try {
      generatedCode = this.ScratchBlocks.arduinoGenerator.workspaceToCode(this.workspace)
      this.props.onSetGeneratedCode(generatedCode)
    } catch (e) {
      log.warn('Arduino code generation failed', e)
    }
    this.lastGeneratedCode = { generatedCode }
    return this.lastGeneratedCode
  }

  private getToolboxXML() {
    const vm = this.vmOf()
    const boardMode = Boolean(this.props.selectedDeviceId)
    const dynamicBlocksXML = injectExtensionCategoryMode(
      vm.runtime.getBlocksXML(vm.workspace.editingTarget),
      this.props.colorMode,
    ).filter((category) => boardMode || !BOARD_ONLY_CATEGORY_IDS.includes(category.id))
    // Append the selected device's active peripheral categories, in the device's `extensions`
    // order (its own hidden pack first). Empty in host mode, since the registry clears when no
    // device is selected.
    for (const category of vm.devices.getActivePeripheralToolboxCategories() as ToolboxCategory[]) {
      dynamicBlocksXML.push(packCategoryToToolboxXML(category, 'peripheral'))
    }
    return makeToolboxXML(false, dynamicBlocksXML, getColorsForMode(this.props.colorMode), boardMode)
  }

  private activateSelectedDevice() {
    // Activate the device's hidden extension first (registers its blocks/codegen), then rebuild the
    // toolbox so the device's categories appear. selectDevice(null) clears, rebuilding to host mode.
    return this.vmOf()
      .devices.selectDevice(this.props.selectedDeviceId)
      .then(() => {
        this.props.updateToolboxState(this.getToolboxXML())
        // Selecting a board enables the code view; deselecting clears it.
        this.updateGeneratedCode()
      })
  }

  private handlePeripheralsChanged = () => {
    // The user added or removed a peripheral (or a loaded project restored one); the VM already
    // updated the active set, so just rebuild the palette and regenerate code to match.
    this.props.updateToolboxState(this.getToolboxXML())
    this.updateGeneratedCode()
  }

  onWorkspaceUpdate = (data: { xml: string }) => {
    const editingTarget = this.vmOf().workspace.editingTarget
    // When the editing target changes, update the toolbox to have its blocks
    this.props.updateToolboxState(this.getToolboxXML())

    if (editingTarget && !(editingTarget.id in this.props.workspaceMetrics.targets)) {
      this.onWorkspaceMetricsChange()
    }

    // Disable Blockly events during workspace reload. In Blockly v2, Events.fire()
    // enqueues events for async dispatch (after rendering), so the old pattern of
    // removing and re-adding the blockListener no longer prevents spurious events
    // from reaching the VM — the queued events fire after the listener is re-added.
    // Disabling events entirely during the load ensures nothing is queued.
    this.workspace.removeChangeListener(this.toolboxUpdateChangeListener)
    try {
      this.ScratchBlocks.Events.disable()
      const dom = this.ScratchBlocks.utils.xml.textToDom(data.xml)
      this.ScratchBlocks.clearWorkspaceAndLoadFromXml(dom, this.workspace)
    } catch (error) {
      // The workspace is likely incomplete. What did update should be
      // functional.
      //
      // Instead of throwing the error, by logging it and continuing as
      // normal lets the other workspace update processes complete in the
      // gui and vm, which lets the vm run even if the workspace is
      // incomplete. Throwing the error would keep things like setting the
      // correct editing target from happening which can interfere with
      // some blocks and processes in the vm.
      log.error('Workspace Update Error:', error)
    } finally {
      this.ScratchBlocks.Events.enable()
    }

    // The load ran with events off, so the change listener never saw it: regenerate now, or the code
    // view and Upload keep the previous project's code until the next edit.
    clearTimeout(this.generatedCodeTimeout)
    this.updateGeneratedCode()

    const metrics: WorkspaceMetrics | undefined = editingTarget
      ? this.props.workspaceMetrics.targets[editingTarget.id]
      : undefined
    if (metrics) {
      this.workspace.scrollX = metrics.scrollX
      this.workspace.scrollY = metrics.scrollY
      this.workspace.scale = metrics.scale
      this.workspace.resize()
    }

    // Clear the undo state of the workspace since this is a
    // fresh workspace and we don't want any changes made to another
    // target's workspace to be 'undone' here.
    this.workspace.clearUndo()
    // Let events get flushed before readding the toolbox-updater listener
    // to avoid unneeded refreshes.
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.workspace.addChangeListener(this.toolboxUpdateChangeListener)
      })
    })
  }

  private handleMonitorsUpdate = (monitors: { values: () => Iterable<MonitorRecord> }) => {
    // Update the checkboxes of the relevant monitors.
    // TODO: What about monitors that have fields? See todo in scratch-vm blocks.js changeBlock:
    // https://github.com/LLK/scratch-vm/blob/2373f9483edaf705f11d62662f7bb2a57fbb5e28/src/engine/blocks.js#L569-L576
    const flyout = this.flyout()
    for (const monitor of monitors.values()) {
      const blockId = monitor.get('id')
      const isVisible = monitor.get('visible')
      flyout.setCheckboxState(blockId, isVisible)
      // We also need to update the isMonitored flag for this block on the VM, since it's used to determine
      // whether the checkbox is activated or not when the checkbox is re-displayed (e.g. local variables/blocks
      // when switching between sprites).
      const block = this.vmOf().runtime.monitorBlocks.getBlock(blockId)
      if (block) {
        block.isMonitored = isVisible
      }
    }
  }

  private handleExtensionAdded = (categoryInfo: CategoryInfo) => {
    // scratch-blocks implements a menu or custom field as a special kind of block ("shadow" block)
    // these actually define blocks and MUST run regardless of the UI state
    const blockInfos = [
      ...Object.values(categoryInfo.customFieldTypes).map((fieldType) => fieldType.scratchBlocksDefinition),
      ...categoryInfo.menus,
      ...categoryInfo.blocks,
    ]
    // An entry without JSON is a separator ('---'), not a block
    this.ScratchBlocks.defineBlocksWithJsonArray(blockInfos.flatMap((blockInfo) => blockInfo.json ?? []))

    // Note that Blockly uses the UK spelling of "colour", so fields that
    // interact directly with Blockly follow that convention, while Scratch
    // code uses the US spelling of "color".
    let colourPrimary = categoryInfo.color1
    let colourSecondary = categoryInfo.color2
    let colourTertiary = categoryInfo.color3
    let colourQuaternary = categoryInfo.color3
    if (this.props.colorMode !== DEFAULT_MODE) {
      const colors = getExtensionColors(this.props.colorMode)
      colourPrimary = colors.colourPrimary
      colourSecondary = colors.colourSecondary
      colourTertiary = colors.colourTertiary
      colourQuaternary = colors.colourQuaternary
    }
    // Blockly's block style has no quaternary color, which thingblock-blocks reads when there is one
    const style: ScratchBlocks.Theme.BlockStyle & { colourQuaternary: string } = {
      colourPrimary,
      colourSecondary,
      colourTertiary,
      colourQuaternary,
      hat: '',
    }
    const selectedStyle: ScratchBlocks.Theme.BlockStyle & { colourQuaternary: string } = {
      colourPrimary: colourQuaternary,
      colourSecondary: colourQuaternary,
      colourTertiary: colourQuaternary,
      colourQuaternary: colourQuaternary,
      hat: '',
    }
    const theme = this.workspace.getTheme()
    theme.setBlockStyle(categoryInfo.id, style)
    theme.setBlockStyle(`${categoryInfo.id}_selected`, selectedStyle)
    this.workspace.setTheme(theme)
    // Update the toolbox with new blocks if possible
    this.props.updateToolboxState(this.getToolboxXML())
  }

  private handleCategorySelected = (categoryId: string) => {
    this.withToolboxUpdates(() => {
      const toolbox = this.toolbox()
      toolbox.setSelectedItem(toolbox.getToolboxItemById(categoryId))
    })
  }

  private handlePromptStart = (
    message: string,
    defaultValue: string,
    callback: PromptCallback,
    optTitle?: string,
    optVarType?: string,
  ) => {
    const title = optTitle ?? this.ScratchBlocks.Msg.VARIABLE_MODAL_TITLE
    const varType = (optVarType ?? this.ScratchBlocks.SCALAR_VARIABLE_TYPE) as VariableType
    this.setState({
      prompt: {
        callback,
        message,
        defaultValue,
        title,
        varType,
        // The value-type chooser only applies when creating a new scalar variable
        // (not lists, broadcasts, or renames).
        showTypeOption:
          varType === this.ScratchBlocks.SCALAR_VARIABLE_TYPE &&
          title !== this.ScratchBlocks.Msg.RENAME_VARIABLE_MODAL_TITLE,
      },
    })
  }

  private handleConnectionModalStart = (extensionId: string) => {
    this.props.onOpenConnectionModal(extensionId)
  }

  private handleStatusButtonUpdate = () => {
    this.flyout().refreshStatusButtons()
  }

  // Passes the name, the VM's names that could conflict with it, and the prompt's variable options to the
  // validation callback scratch-blocks gave the prompt
  private handlePromptCallback = (input: string, variableOptions: VariableOptions) => {
    const { prompt } = this.state
    if (!prompt) throw new Error('Blocks.handlePromptCallback: no prompt is open')
    prompt.callback(input, this.vmOf().runtime.getAllVarNamesOfType(prompt.varType), variableOptions)
    this.handlePromptClose()
  }

  private handlePromptClose = () => {
    this.setState({ prompt: null })
  }

  private handleCustomProceduresClose = (mutation: Element | null) => {
    this.props.onRequestCloseCustomProcedures(mutation)
    this.updateToolbox()
    this.toolbox().selectCategoryByName('myBlocks')
  }

  private vmHandlers: Record<string, Parameters<VM['events']['on']>[1]> = {
    SCRIPT_GLOW_ON: (data: { id: string }) => this.ScratchBlocks.glowStack(data.id, true),
    SCRIPT_GLOW_OFF: (data: { id: string }) => this.ScratchBlocks.glowStack(data.id, false),
    VISUAL_REPORT: (data: { id: string; value: string }) => this.ScratchBlocks.reportValue(data.id, data.value),
    workspaceUpdate: this.onWorkspaceUpdate,
    MONITORS_UPDATE: this.handleMonitorsUpdate,
    EXTENSION_ADDED: this.handleExtensionAdded,
    // @todo Later we should replace this to avoid all the warnings from redefining blocks.
    BLOCKSINFO_UPDATE: this.handleExtensionAdded,
    PERIPHERAL_CONNECTED: this.handleStatusButtonUpdate,
    PERIPHERAL_DISCONNECTED: this.handleStatusButtonUpdate,
    PERIPHERALS_CHANGED: this.handlePeripheralsChanged,
  }

  render() {
    const { prompt } = this.state
    return (
      <>
        <Box className={styles.blocks} componentRef={this.blocksRef} />
        {prompt ? (
          <ModalPrompt
            defaultValue={prompt.defaultValue}
            label={prompt.message}
            showTypeOption={prompt.showTypeOption}
            title={prompt.title}
            onCancel={this.handlePromptClose}
            onOk={this.handlePromptCallback}
          />
        ) : null}
        <LibraryExtension onCategorySelected={this.handleCategorySelected} />
        {this.props.customProceduresVisible ? (
          <ModalCustomProcedures onRequestClose={this.handleCustomProceduresClose} />
        ) : null}
      </>
    )
  }
}

const ConnectedBlocks = connector(Blocks)

/**
 * The blocks workspace, created anew when the color mode or the block theme changes, since Blockly reads them only
 * when it creates a workspace.
 * @returns The connected `Blocks`, keyed by the color mode and theme.
 */
const BlocksWorkspace = () => {
  const colorMode = useAppSelector((state) => state.scratchGui.settings.colorMode)
  const theme = useAppSelector((state) => state.scratchGui.settings.theme)
  return (
    <ConnectedBlocks key={`${colorMode}/${theme}`} colorMode={colorMode} useCatBlocks={theme === CAT_BLOCKS_THEME} />
  )
}

export default BlocksWorkspace
