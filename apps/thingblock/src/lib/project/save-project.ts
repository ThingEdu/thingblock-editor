import type { Dispatch } from 'redux'
import { showAlertWithTimeout } from '../../reducers/alerts'
import { projectTitleInitialState, setProjectTitle } from '../../reducers/project-title'
import log from '../log'
import { type SavedProjectFile, saveProjectFile, showFileInWindowTitle } from './project-file'
import { getProjectTitleFromFilename } from './sb-file-uploader-utils'

/**
 * @param curTitle The title the project has now.
 * @param defaultTitle Used when the title is empty.
 * @returns The file name to offer, e.g. "Dự án ThingBlock.tb".
 */
export const getProjectFilename = (curTitle: string | null, defaultTitle = projectTitleInitialState): string => {
  const filenameTitle = curTitle === null || curTitle === '' ? defaultTitle : curTitle
  return `${filenameTitle.substring(0, 100)}.tb`
}

/**
 * Saves the project to a file the user can see: asks where the first time (or always, for "Save as"),
 * writes it, then says where it went and names the project after the file.
 * @param options What to save and how.
 * @param options.saveProjectSb3 Resolves with the project as a Blob.
 * @param options.projectTitle The current project title.
 * @param options.dispatch Redux dispatch.
 * @param options.saveAs Always ask where to save.
 * @returns Where the project was saved, or null when cancelled or failed.
 */
const saveProject = async (options: {
  saveProjectSb3: () => Promise<Blob>
  projectTitle: string | null
  dispatch: Dispatch
  saveAs?: boolean
}): Promise<SavedProjectFile | null> => {
  const { saveProjectSb3, projectTitle, dispatch, saveAs = false } = options
  try {
    const content = await saveProjectSb3()
    const saved = await saveProjectFile(content, {
      suggestedName: getProjectFilename(projectTitle),
      saveAs,
    })
    if (!saved) return null // the user cancelled the dialog
    if (!saved.downloaded) {
      const title = getProjectTitleFromFilename(saved.name)
      if (title) dispatch(setProjectTitle(title))
      showFileInWindowTitle(saved.name)
      showAlertWithTimeout(dispatch, 'savedToFile', { path: saved.path ?? saved.name })
    }
    return saved
  } catch (error) {
    log.warn(error)
    showAlertWithTimeout(dispatch, 'saveToFileError', {
      message: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export default saveProject
