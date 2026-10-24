const SET_GENERATED_CODE = 'scratch-gui/code/SET_GENERATED_CODE';
const SET_SIM_CODE = 'scratch-gui/code/SET_SIM_CODE';
const SET_SIM_HIGHLIGHT = 'scratch-gui/code/SET_SIM_HIGHLIGHT';
const SET_SIM_LOADED_CODE = 'scratch-gui/code/SET_SIM_LOADED_CODE';

const initialState = {
    // The Arduino C++ source generated from the current workspace, shown in the
    // device panel's code view. Empty in host mode (no board selected).
    generatedCode: '',
    // The same workspace compiled for the simulator, and the problems that keep
    // it from running (a block with no simulation yet, or code the compiler
    // would reject). Empty in host mode.
    simCode: '',
    simDiagnostics: [],
    // The simulator program the worker holds, as last loaded by the Simulator panel; null when the
    // panel holds no program. Equal to `simCode` exactly when the worker runs what the workspace shows.
    simLoadedCode: null,
    // The block the simulator stopped on while stepping, highlighted in the
    // workspace; null while running freely or stopped.
    simHighlight: null
};

const reducer = function (state = initialState, action) {
    switch (action.type) {
    case SET_GENERATED_CODE:
        return {...state, generatedCode: action.code};
    case SET_SIM_CODE:
        return {...state, simCode: action.code, simDiagnostics: action.diagnostics};
    case SET_SIM_HIGHLIGHT:
        return {...state, simHighlight: action.blockId};
    case SET_SIM_LOADED_CODE:
        return {...state, simLoadedCode: action.code};
    default:
        return state;
    }
};

const setGeneratedCode = code => ({
    type: SET_GENERATED_CODE,
    code
});

const setSimCode = (code, diagnostics) => ({
    type: SET_SIM_CODE,
    code,
    diagnostics
});

const setSimHighlight = blockId => ({
    type: SET_SIM_HIGHLIGHT,
    blockId
});

const setSimLoadedCode = code => ({
    type: SET_SIM_LOADED_CODE,
    code
});

export {
    reducer as default,
    initialState as codeInitialState,
    setGeneratedCode,
    setSimCode,
    setSimHighlight,
    setSimLoadedCode
};
