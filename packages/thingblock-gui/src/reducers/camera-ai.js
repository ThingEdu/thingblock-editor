const CAMERA_AI_LOADED = 'scratch-gui/camera-ai/LOADED';

const initialState = {
    // The Camera AI extension is in the project, so the playground panel shows.
    loaded: false
};

const reducer = function (state = initialState, action) {
    switch (action.type) {
    case CAMERA_AI_LOADED:
        return {...state, loaded: true};
    default:
        return state;
    }
};

const cameraAiLoaded = () => ({type: CAMERA_AI_LOADED});

export {
    reducer as default,
    initialState as cameraAiInitialState,
    cameraAiLoaded
};
