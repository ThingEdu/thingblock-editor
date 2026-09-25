const OPEN_MODAL = 'scratch-gui/modals/OPEN_MODAL';
const CLOSE_MODAL = 'scratch-gui/modals/CLOSE_MODAL';

const MODAL_BOARD_LIBRARY = 'boardLibrary';
const MODAL_DEBUG = 'debugModal';
const MODAL_EXTENSION_LIBRARY = 'extensionLibrary';
const MODAL_LOADING_PROJECT = 'loadingProject';
const MODAL_PERIPHERAL_LIBRARY = 'peripheralLibrary';
const MODAL_TELEMETRY = 'telemetryModal';
const MODAL_CONNECTION = 'connectionModal';
const MODAL_SETTINGS = 'settingsModal';
const MODAL_TIPS_LIBRARY = 'tipsLibrary';

const initialState = {
    [MODAL_BOARD_LIBRARY]: false,
    [MODAL_DEBUG]: false,
    [MODAL_EXTENSION_LIBRARY]: false,
    [MODAL_LOADING_PROJECT]: false,
    [MODAL_PERIPHERAL_LIBRARY]: false,
    [MODAL_TELEMETRY]: false,
    [MODAL_CONNECTION]: false,
    [MODAL_SETTINGS]: false,
    [MODAL_TIPS_LIBRARY]: false
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case OPEN_MODAL:
        return Object.assign({}, state, {
            [action.modal]: true
        });
    case CLOSE_MODAL:
        return Object.assign({}, state, {
            [action.modal]: false
        });
    default:
        return state;
    }
};
const openModal = function (modal) {
    return {
        type: OPEN_MODAL,
        modal: modal
    };
};
const closeModal = function (modal) {
    return {
        type: CLOSE_MODAL,
        modal: modal
    };
};
const openBoardLibrary = function () {
    return openModal(MODAL_BOARD_LIBRARY);
};
const openDebugModal = function () {
    return openModal(MODAL_DEBUG);
};
const openExtensionLibrary = function () {
    return openModal(MODAL_EXTENSION_LIBRARY);
};
const openLoadingProject = function () {
    return openModal(MODAL_LOADING_PROJECT);
};
const openPeripheralLibrary = function () {
    return openModal(MODAL_PERIPHERAL_LIBRARY);
};
const openTelemetryModal = function () {
    return openModal(MODAL_TELEMETRY);
};
const openConnectionModal = function () {
    return openModal(MODAL_CONNECTION);
};
const openSettingsModal = function () {
    return openModal(MODAL_SETTINGS);
};
const openTipsLibrary = function () {
    return openModal(MODAL_TIPS_LIBRARY);
};
const closeBoardLibrary = function () {
    return closeModal(MODAL_BOARD_LIBRARY);
};
const closeDebugModal = function () {
    return closeModal(MODAL_DEBUG);
};
const closeExtensionLibrary = function () {
    return closeModal(MODAL_EXTENSION_LIBRARY);
};
const closeLoadingProject = function () {
    return closeModal(MODAL_LOADING_PROJECT);
};
const closePeripheralLibrary = function () {
    return closeModal(MODAL_PERIPHERAL_LIBRARY);
};
const closeTelemetryModal = function () {
    return closeModal(MODAL_TELEMETRY);
};
const closeTipsLibrary = function () {
    return closeModal(MODAL_TIPS_LIBRARY);
};
const closeConnectionModal = function () {
    return closeModal(MODAL_CONNECTION);
};
const closeSettingsModal = function () {
    return closeModal(MODAL_SETTINGS);
};
export {
    reducer as default,
    initialState as modalsInitialState,
    openBoardLibrary,
    openDebugModal,
    openExtensionLibrary,
    openLoadingProject,
    openPeripheralLibrary,
    openTelemetryModal,
    openTipsLibrary,
    openConnectionModal,
    openSettingsModal,
    closeBoardLibrary,
    closeDebugModal,
    closeExtensionLibrary,
    closeLoadingProject,
    closePeripheralLibrary,
    closeTelemetryModal,
    closeTipsLibrary,
    closeConnectionModal,
    closeSettingsModal
};
