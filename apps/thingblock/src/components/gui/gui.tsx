import classNames from 'classnames'
import { type MouseEvent, useEffect, useState } from 'react'
import { defineMessages, FormattedMessage, useIntl } from 'react-intl'
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { MenuRefProvider } from '../../contexts/menu-ref-context'
import { ModalFocusProvider } from '../../contexts/modal-focus-context'
import { activateTab } from '../../reducers/editor-tab'
import { closeDebugModal, closeSettingsModal } from '../../reducers/modals'
import { getIsAnyCreatingNewState, getIsLoading } from '../../reducers/project-state'
import Alerts from '../alerts/alerts'
import Blocks from '../blocks/blocks'
import Box from '../box/box'
import ButtonExtension from '../button-extension/button-extension'
import LibraryBoard from '../library-board/library-board'
import LibraryExample from '../library-example/library-example'
import LibraryPeripheral from '../library-peripheral/library-peripheral'
import Loader from '../loader/loader'
import MenuBar from '../menu-bar/menu-bar'
import ModalConnection from '../modal-connection/modal-connection'
import ModalDebug from '../modal-debug/modal-debug'
import ModalSettings from '../modal-settings/modal-settings'
import SidePanel from '../side-panel/side-panel'
import styles from './gui.module.css'
import codeIcon from './icon--code.svg'

const ariaMessages = defineMessages({
  editor: {
    id: 'gui.aria.editor',
    defaultMessage: 'Editor',
    description: 'accessibility label for the main editor area',
  },
  tabList: {
    id: 'gui.aria.tabList',
    defaultMessage: 'Tab list',
    description: 'accessibility label for the editor tab list',
  },
  codePanel: {
    id: 'gui.aria.codePanel',
    defaultMessage: 'Code editor panel',
    description: 'accessibility label for the code editor panel',
  },
})

const MIN_SIDE_PANEL_WIDTH = 360
const MAX_SIDE_PANEL_WIDTH = 700

/**
 * The editor's page: the menu bar, the blocks workspace in its tabs, the side panel beside it, which its left edge
 * resizes, and the libraries, modals and alerts over them.
 * @returns The page.
 */
const Gui = () => {
  const intl = useIntl()
  const dispatch = useAppDispatch()
  const activeTabIndex = useAppSelector((state) => state.scratchGui.editorTab.activeTabIndex)
  const alertsVisible = useAppSelector((state) => state.scratchGui.alerts.visible)
  const debugModalVisible = useAppSelector((state) => state.scratchGui.modals.debugModal)
  const settingsModalVisible = useAppSelector((state) => state.scratchGui.modals.settingsModal)
  const isRtl = useAppSelector((state) => state.locales.isRtl)
  const loading = useAppSelector(
    (state) => getIsLoading(state.scratchGui.projectState.loadingState) || state.scratchGui.modals.loadingProject,
  )
  const isCreating = useAppSelector((state) => getIsAnyCreatingNewState(state.scratchGui.projectState.loadingState))
  const [sidePanelWidth, setSidePanelWidth] = useState(540)

  // Blockly sizes its workspace on the window's resize
  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [sidePanelWidth])

  const handleResizeMouseDown = (e: MouseEvent) => {
    const startX = e.clientX
    const startWidth = sidePanelWidth
    const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const width = startWidth + startX - moveEvent.clientX
      setSidePanelWidth(Math.max(MIN_SIDE_PANEL_WIDTH, Math.min(MAX_SIDE_PANEL_WIDTH, width)))
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    e.preventDefault()
  }

  return (
    <ModalFocusProvider>
      <Box className={styles.pageWrapper} dir={isRtl ? 'rtl' : 'ltr'}>
        {loading ? <Loader /> : null}
        {isCreating ? <Loader messageId="gui.loader.creating" /> : null}
        <LibraryBoard />
        <LibraryExample />
        <LibraryPeripheral />
        {alertsVisible ? <Alerts className={styles.alertsContainer} /> : null}
        <ModalConnection />
        {debugModalVisible ? <ModalDebug onClose={() => dispatch(closeDebugModal())} /> : null}
        {settingsModalVisible ? <ModalSettings onRequestClose={() => dispatch(closeSettingsModal())} /> : null}
        <MenuRefProvider>
          <MenuBar className={styles.menuBarPosition} />
        </MenuRefProvider>
        <Box className={classNames(styles.bodyWrapper, styles.flexWrapper)}>
          <Box
            role="main"
            aria-label={intl.formatMessage(ariaMessages.editor)}
            className={styles.editorWrapper}
            element="main"
          >
            <Tabs
              forceRenderTabPanel
              className={styles.tabs}
              selectedIndex={activeTabIndex}
              selectedTabClassName={styles.isSelected}
              selectedTabPanelClassName={styles.isSelected}
              onSelect={(index) => {
                dispatch(activateTab(index))
              }}
            >
              <Box role="region" aria-label={intl.formatMessage(ariaMessages.tabList)}>
                <TabList className={styles.tabList}>
                  <Tab className={styles.tab}>
                    <img alt="" draggable={false} src={codeIcon} />
                    <FormattedMessage
                      defaultMessage="Code"
                      description="Button to get to the code panel"
                      id="gui.gui.codeTab"
                    />
                  </Tab>
                </TabList>
              </Box>
              <TabPanel className={styles.tabPanel}>
                <Box
                  className={styles.blocksWrapper}
                  role="region"
                  aria-label={intl.formatMessage(ariaMessages.codePanel)}
                  element="section"
                >
                  <Blocks />
                  <ButtonExtension />
                </Box>
              </TabPanel>
            </Tabs>
          </Box>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- a drag handle; the keyboard has no use for it */}
          <div className={styles.resizeHandle} onMouseDown={handleResizeMouseDown} />
          <SidePanel width={sidePanelWidth} />
        </Box>
      </Box>
    </ModalFocusProvider>
  )
}

export default Gui
