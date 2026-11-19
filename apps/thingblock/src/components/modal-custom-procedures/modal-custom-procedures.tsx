import * as ScratchBlocks from '@thingblock/thingblock-blocks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { defineMessages, FormattedMessage, useIntl } from 'react-intl'
import { useAppSelector } from '../../app/store'
import { makeBlocksTheme } from '../../lib/blocks/blocks-theme'
import { getBlocksMediaPath } from '../../lib/settings/color-mode'
import Box from '../box/box'
import Modal from '../modal/modal'
import booleanInputIcon from './icon--boolean-input.svg'
import labelIcon from './icon--label.svg'
import textInputIcon from './icon--text-input.svg'
import styles from './modal-custom-procedures.module.css'

const messages = defineMessages({
  myblockModalTitle: {
    defaultMessage: 'Make a Block',
    description: 'Title for the modal where you create a custom block.',
    id: 'gui.customProcedures.myblockModalTitle',
  },
})

/** The `procedures_declaration` block, which `thingblock-blocks` defines but does not export a type for. */
interface ProcedureDeclarationBlock extends ScratchBlocks.BlockSvg {
  addBooleanExternal: () => void
  addLabelExternal: () => void
  addStringNumberExternal: () => void
  domToMutation: (xmlElement: Element) => void
  focusLastEditor_: () => void
  getWarp: () => boolean
  mutationToDom: (generateShadows?: boolean) => Element
  onChangeFn: () => void
  setWarp: (warp: boolean) => void
}

const workspaceOptions = {
  zoom: {
    controls: false,
    wheel: false,
    startScale: 0.9,
  },
  comments: false,
  collapse: false,
  scrollbars: true,
  modalInputs: false,
  sounds: false,
}

/**
 * The "Make a Block" modal, which edits the procedure in the store's custom procedures state on a workspace of
 * its own.
 * @param props - React props.
 * @param props.onRequestClose - Called with the edited procedure's mutation, or null when it is cancelled.
 * @returns The modal, with the procedure's declaration block and the buttons that add to it.
 */
const ModalCustomProcedures = ({ onRequestClose }: { onRequestClose: (mutation: Element | null) => void }) => {
  const intl = useIntl()
  const isRtl = useAppSelector((state) => state.locales.isRtl)
  const mutator = useAppSelector((state) => state.scratchGui.customProcedures.mutator)
  const colorMode = useAppSelector((state) => state.scratchGui.settings.colorMode)
  const [warp, setWarp] = useState(false)
  const workspaceRef = useRef<ScratchBlocks.WorkspaceSvg | null>(null)
  const mutationRootRef = useRef<ProcedureDeclarationBlock | null>(null)

  // The modal renders its content after it mounts, so the workspace is created when its element arrives
  const setBlocks = useCallback(
    (element: HTMLElement | null) => {
      if (!element || workspaceRef.current) return
      if (!mutator) throw new Error('ModalCustomProcedures: opened with no procedure to edit')

      const workspace = ScratchBlocks.inject(element, {
        ...workspaceOptions,
        media: getBlocksMediaPath(colorMode),
        rtl: isRtl,
        theme: makeBlocksTheme(colorMode),
      })
      workspaceRef.current = workspace

      // Create the procedure declaration block for editing the mutation.
      const mutationRoot = workspace.newBlock('procedures_declaration') as ProcedureDeclarationBlock
      mutationRootRef.current = mutationRoot
      // Make the declaration immovable, undeletable and have no context menu
      mutationRoot.setMovable(false)
      mutationRoot.setDeletable(false)
      mutationRoot.contextMenu = false

      let rtlOffset = 0
      workspace.addChangeListener(() => {
        mutationRoot.onChangeFn()
        // Keep the block centered on the workspace
        const metrics = workspace.getMetrics()
        const { x, y } = mutationRoot.getRelativeToSurfaceXY()
        const dy = metrics.viewHeight / 2 - mutationRoot.height / 2 - y
        let dx
        if (isRtl) {
          // // TODO: https://github.com/LLK/scratch-gui/issues/2838
          // This is temporary until we can figure out what's going on width
          // block positioning on the workspace for RTL.
          // Workspace is always origin top-left, with x increasing to the right
          // Calculate initial starting offset and save it, every other move
          // has to take the original offset into account.
          // Calculate a new left postion based on new width
          // Convert current x position into LTR (mirror) x position (uses original offset)
          // Use the difference between ltrX and mirrorX as the amount to move
          const ltrX = metrics.viewWidth / 2 - mutationRoot.width / 2 + 25
          const mirrorX = x - (x - rtlOffset) * 2
          if (mirrorX === ltrX) {
            return
          }
          dx = mirrorX - ltrX
          const midPoint = metrics.viewWidth / 2
          if (x === 0) {
            // if it's the first time positioning, it should always move right
            if (mutationRoot.width < midPoint) {
              dx = ltrX
            } else if (mutationRoot.width < metrics.viewWidth) {
              dx = midPoint - (metrics.viewWidth - mutationRoot.width) / 2
            } else {
              dx = midPoint + (mutationRoot.width - metrics.viewWidth)
            }
            mutationRoot.moveBy(dx, dy)
            rtlOffset = mutationRoot.getRelativeToSurfaceXY().x
            return
          }
          if (mutationRoot.width > metrics.viewWidth) {
            dx = dx + mutationRoot.width - metrics.viewWidth
          }
        } else {
          dx = metrics.viewWidth / 2 - mutationRoot.width / 2 - x
          // If the procedure declaration is wider than the view width,
          // keep the right-hand side of the procedure in view.
          if (mutationRoot.width > metrics.viewWidth) {
            dx = metrics.viewWidth - mutationRoot.width - x
          }
        }
        mutationRoot.moveBy(dx, dy)
      })
      mutationRoot.domToMutation(mutator)
      mutationRoot.initSvg()
      mutationRoot.render()
      setWarp(mutationRoot.getWarp())
      // Allow the initial events to run to position this block, then focus.
      setTimeout(() => {
        mutationRoot.focusLastEditor_()
      })
    },
    [colorMode, isRtl, mutator],
  )

  useEffect(
    () => () => {
      const workspace = workspaceRef.current
      if (!workspace) return
      // When BlockSvg.dispose() runs with the focused element inside the
      // block, it schedules setTimeout(() => focusTree(workspace)) to
      // return focus somewhere sensible.  For procedures_declaration
      // (no parent block), that setTimeout fires *after* the workspace
      // is unregistered, throwing "Attempted to focus unregistered tree".
      //
      // Fix: hide any open field editor (releases ephemeral focus) then
      // move Blockly focus to the main workspace before disposing.
      // BlockSvg.dispose() then sees the focused element is not inside
      // any dialog block and skips the stale focusTree setTimeout.
      ScratchBlocks.WidgetDiv.hide()
      ScratchBlocks.getFocusManager().focusTree(ScratchBlocks.getMainWorkspace() as ScratchBlocks.WorkspaceSvg)
      workspace.dispose()
    },
    [],
  )

  const handleCancel = () => onRequestClose(null)
  const handleOk = () => onRequestClose(mutationRootRef.current ? mutationRootRef.current.mutationToDom(true) : null)
  const handleToggleWarp = () => {
    const mutationRoot = mutationRootRef.current
    if (!mutationRoot) return
    const newWarp = !mutationRoot.getWarp()
    mutationRoot.setWarp(newWarp)
    setWarp(newWarp)
  }

  return (
    <Modal
      className={styles.modalContent}
      contentLabel={intl.formatMessage(messages.myblockModalTitle)}
      id="customProceduresModal"
      onRequestClose={handleCancel}
    >
      <Box className={styles.workspace} componentRef={setBlocks} />
      <Box className={styles.body}>
        <div className={styles.optionsRow}>
          <button
            className={styles.optionCard}
            type="button"
            onClick={() => mutationRootRef.current?.addStringNumberExternal()}
          >
            <img alt="" className={styles.optionIcon} src={textInputIcon} />
            <span className={styles.optionTitle}>
              <FormattedMessage
                defaultMessage="Add an input"
                description="Label for button to add a number/text input"
                id="gui.customProcedures.addAnInputNumberText"
              />
            </span>
            <span className={styles.optionDescription}>
              <FormattedMessage
                defaultMessage="number or text"
                description="Description of the number/text input type"
                id="gui.customProcedures.numberTextType"
              />
            </span>
          </button>
          <button
            className={styles.optionCard}
            type="button"
            onClick={() => mutationRootRef.current?.addBooleanExternal()}
          >
            <img alt="" className={styles.optionIcon} src={booleanInputIcon} />
            <span className={styles.optionTitle}>
              <FormattedMessage
                defaultMessage="Add an input"
                description="Label for button to add a boolean input"
                id="gui.customProcedures.addAnInputBoolean"
              />
            </span>
            <span className={styles.optionDescription}>
              <FormattedMessage
                defaultMessage="boolean"
                description="Description of the boolean input type"
                id="gui.customProcedures.booleanType"
              />
            </span>
          </button>
          <button
            className={styles.optionCard}
            type="button"
            onClick={() => mutationRootRef.current?.addLabelExternal()}
          >
            <img alt="" className={styles.optionIcon} src={labelIcon} />
            <span className={styles.optionTitle}>
              <FormattedMessage
                defaultMessage="Add a label"
                description="Label for button to add a label"
                id="gui.customProcedures.addALabel"
              />
            </span>
          </button>
        </div>
        <div className={styles.checkboxRow}>
          <label>
            <input checked={warp} type="checkbox" onChange={handleToggleWarp} />
            <FormattedMessage
              defaultMessage="Run without screen refresh"
              description="Label for checkbox to run without screen refresh"
              id="gui.customProcedures.runWithoutScreenRefresh"
            />
          </label>
        </div>
        <Box className={styles.buttonRow}>
          <button onClick={handleCancel}>
            <FormattedMessage
              defaultMessage="Cancel"
              description="Label for button to cancel custom procedure edits"
              id="gui.customProcedures.cancel"
            />
          </button>
          <button className={styles.okButton} onClick={handleOk}>
            <FormattedMessage
              defaultMessage="OK"
              description="Label for button to save new custom procedure"
              id="gui.customProcedures.ok"
            />
          </button>
        </Box>
      </Box>
    </Modal>
  )
}

export default ModalCustomProcedures
