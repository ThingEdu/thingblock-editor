import classNames from 'classnames'
import { useCallback, useEffect } from 'react'
import { defineMessage, FormattedMessage, useIntl } from 'react-intl'
import { useStore } from 'react-redux'
import { type RootState, useAppDispatch, useAppSelector } from '../../app/store'
import { useFileUploader } from '../../hooks/use-file-uploader'
import { useMenuNavigation } from '../../hooks/use-menu-navigation'
import { useVm } from '../../hooks/use-vm'
import dropdownCaret from '../../lib/assets/icon--dropdown-caret.svg'
import { confirmReplaceProject } from '../../lib/project/native-dialogs'
import { showFileInWindowTitle, trackProjectLoads } from '../../lib/project/project-file'
import saveProject from '../../lib/project/save-project'
import sharedMessages from '../../lib/shared-messages'
import { requestNewProject } from '../../reducers/project-state'
import menuBarStyles from '../menu-bar/menu-bar.module.css'
import Menu, { MenuItem, MenuSection } from '../menu/menu'
import fileIcon from './icon--file.svg'

const fileMenu = defineMessage({
  id: 'gui.aria.fileMenu',
  defaultMessage: 'File menu',
  description: 'accessibility label for file menu',
})

const isMac = navigator.platform.includes('Mac')

/**
 * The menu bar's File menu: a new project, loading a file, and saving to one. It also handles Ctrl+S
 * (Cmd+S on a Mac), and forgets the project's file whenever another project loads.
 * @returns The menu's button, with the menu while it is open.
 */
const MenuFile = () => {
  const intl = useIntl()
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()
  const vm = useVm()
  const isRtl = useAppSelector((state) => state.locales.isRtl)
  const { loadFromComputer } = useFileUploader()
  const { menuRef, isExpanded, handleKeyDown, handleKeyDownOpenMenu, handleOnOpen, handleOnClose } =
    useMenuNavigation<HTMLButtonElement>()

  // Saves to the project's file, asking where the first time, or always with `saveAs`
  const save = useCallback(
    (saveAs: boolean) =>
      saveProject({
        saveProjectSb3: () => vm.project.saveSb3(),
        projectTitle: store.getState().scratchGui.projectTitle,
        dispatch,
        saveAs,
      }),
    [vm, store, dispatch],
  )

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const modifier = isMac ? event.metaKey : event.ctrlKey
      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault()
        // Shift turns it into "Save as"
        void save(event.shiftKey)
      }
    }
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [save])

  useEffect(() => {
    // Every project load (New, a file) forgets which file the previous
    // project was saved in, so Ctrl+S never overwrites another project's file.
    const stopTrackingProjectLoads = trackProjectLoads(vm.events)
    const handleProjectLoaded = () => showFileInWindowTitle(null)
    vm.events.on('PROJECT_LOADED', handleProjectLoaded)
    return () => {
      stopTrackingProjectLoads()
      vm.events.off('PROJECT_LOADED', handleProjectLoaded)
    }
  }, [vm])

  const handleClickNew = async () => {
    if (store.getState().scratchGui.projectChanged && !(await confirmReplaceProject(intl))) return
    dispatch(requestNewProject())
  }

  return (
    <button
      className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable, {
        [menuBarStyles.active]: isExpanded(),
      })}
      onClick={handleOnOpen}
      aria-label={intl.formatMessage(fileMenu)}
      aria-expanded={isExpanded()}
      ref={menuRef}
      onKeyDown={handleKeyDown}
    >
      <img alt="" src={fileIcon} />
      <span className={menuBarStyles.collapsibleLabel}>
        <FormattedMessage defaultMessage="File" description="Text for file dropdown menu" id="gui.menuBar.file" />
      </span>
      <img alt="" src={dropdownCaret} />
      <div className={menuBarStyles.menuBarMenu}>
        <Menu open={isExpanded()} place={isRtl ? 'left' : 'right'} onRequestClose={handleOnClose}>
          <MenuSection>
            <MenuItem onClick={() => void handleClickNew()} isDataMenuItem onParentKeyDown={handleKeyDownOpenMenu}>
              <FormattedMessage
                defaultMessage="New"
                description="Menu bar item for creating a new project"
                id="gui.menuBar.new"
              />
            </MenuItem>
          </MenuSection>
          <MenuSection>
            <MenuItem onClick={() => void loadFromComputer()} isDataMenuItem onParentKeyDown={handleKeyDownOpenMenu}>
              {intl.formatMessage(sharedMessages.loadFromComputerTitle)}
            </MenuItem>
            <MenuItem onClick={() => void save(false)} isDataMenuItem onParentKeyDown={handleKeyDownOpenMenu}>
              <FormattedMessage
                defaultMessage="Save"
                description="Menu bar item for saving the project to its file on the computer (asks where the first time)"
                id="gui.menuBar.saveToFile"
              />
              <span className={menuBarStyles.menuShortcut}>{isMac ? '⌘S' : 'Ctrl+S'}</span>
            </MenuItem>
            <MenuItem onClick={() => void save(true)} isDataMenuItem onParentKeyDown={handleKeyDownOpenMenu}>
              <FormattedMessage
                defaultMessage="Save as…"
                description="Menu bar item for saving the project to a new file chosen on the computer"
                id="gui.menuBar.saveToFileAs"
              />
            </MenuItem>
          </MenuSection>
        </Menu>
      </div>
    </button>
  )
}

export default MenuFile
