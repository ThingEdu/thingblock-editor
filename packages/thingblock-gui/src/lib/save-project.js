import log from './log';
import {saveProjectFile, showFileInWindowTitle} from './project-file';
import {getProjectTitleFromFilename} from './sb-file-uploader-utils';
import {showAlertWithTimeout} from '../reducers/alerts';
import {projectTitleInitialState, setProjectTitle} from '../reducers/project-title';

/**
 * The file name to offer for a project title, e.g. "Dự án ThingBlock.tb".
 * @param {?string} curTitle - the project title.
 * @param {string} [defaultTitle] - used when the title is empty.
 * @returns {string} the file name.
 */
const getProjectFilename = (curTitle, defaultTitle = projectTitleInitialState) => {
    let filenameTitle = curTitle;
    if (!filenameTitle || filenameTitle.length === 0) {
        filenameTitle = defaultTitle;
    }
    return `${filenameTitle.substring(0, 100)}.tb`;
};

/**
 * Save the project to a file the user can see: ask where the first time (or always, for "Save as"),
 * write it, then say where it went and name the project after the file.
 * @param {object} options - what to save and how.
 * @param {Function} options.saveProjectSb3 - resolves with the project as a Blob.
 * @param {?string} options.projectTitle - the current project title.
 * @param {Function} options.dispatch - redux dispatch.
 * @param {boolean} [options.saveAs] - always ask where to save.
 * @returns {Promise<?object>} where the project was saved, or null when cancelled or failed.
 */
const saveProject = async ({saveProjectSb3, projectTitle, dispatch, saveAs = false}) => {
    try {
        const content = await saveProjectSb3();
        const saved = await saveProjectFile(content, {
            suggestedName: getProjectFilename(projectTitle),
            saveAs
        });
        if (!saved) return null; // the user cancelled the dialog
        if (!saved.downloaded) {
            const title = getProjectTitleFromFilename(saved.name);
            if (title) dispatch(setProjectTitle(title));
            showFileInWindowTitle(saved.name);
            showAlertWithTimeout(dispatch, 'savedToFile', {path: saved.path || saved.name});
        }
        return saved;
    } catch (error) {
        log.warn(error);
        showAlertWithTimeout(dispatch, 'saveToFileError', {message: String((error && error.message) || error)});
        return null;
    }
};

export {
    saveProject as default,
    getProjectFilename
};
