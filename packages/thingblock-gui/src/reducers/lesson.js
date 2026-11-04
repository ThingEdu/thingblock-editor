const OPEN = 'scratch-gui/lesson/OPEN';
const CLOSE = 'scratch-gui/lesson/CLOSE';
const GO_TO_STEP = 'scratch-gui/lesson/GO_TO_STEP';
const SHOW_NEXT_HINT = 'scratch-gui/lesson/SHOW_NEXT_HINT';
const SET_CHECK = 'scratch-gui/lesson/SET_CHECK';
const MARK_PASSED = 'scratch-gui/lesson/MARK_PASSED';

const idleCheck = {status: 'idle', messages: []};

const initialState = {
    // The open lesson's built JSON (tutorials/<ma>/bai.<lang>.json), or null when no lesson is open.
    lesson: null,
    stepIndex: 0,
    // Steps whose rules all passed at least once; a later edit does not take a pass away.
    passedSteps: [],
    hintsShown: 0,
    // The verdict box: idle (no run yet), waiting, passed, failed, blocked (unsimulated block), error.
    check: idleCheck
};

const reducer = function (state = initialState, action) {
    switch (action.type) {
    case OPEN: {
        const count = action.lesson.steps.length;
        const saved = action.progress;
        const savedSteps = saved && Array.isArray(saved.passedSteps) ? saved.passedSteps : [];
        return {
            ...initialState,
            lesson: action.lesson,
            // Saved progress may predate an edit of the lesson, so it is clamped to the steps that exist.
            stepIndex: saved ? Math.min(Math.max(Math.trunc(Number(saved.stepIndex)) || 0, 0), count - 1) : 0,
            passedSteps: [...new Set(savedSteps.filter(n => Number.isInteger(n) && n >= 0 && n < count))]
        };
    }
    case CLOSE:
        return initialState;
    case GO_TO_STEP:
        return {...state, stepIndex: action.stepIndex, hintsShown: 0, check: idleCheck};
    case SHOW_NEXT_HINT:
        return {...state, hintsShown: state.hintsShown + 1};
    case SET_CHECK:
        return {...state, check: {status: action.status, messages: action.messages}};
    case MARK_PASSED:
        if (state.passedSteps.includes(action.stepIndex)) return state;
        return {...state, passedSteps: [...state.passedSteps, action.stepIndex]};
    default:
        return state;
    }
};

const openLesson = (lesson, progress) => ({type: OPEN, lesson, progress});
const closeLesson = () => ({type: CLOSE});
const goToStep = stepIndex => ({type: GO_TO_STEP, stepIndex});
const showNextHint = () => ({type: SHOW_NEXT_HINT});
const setCheck = (status, messages = []) => ({type: SET_CHECK, status, messages});
const markStepPassed = stepIndex => ({type: MARK_PASSED, stepIndex});

export {
    reducer as default,
    initialState as lessonInitialState,
    openLesson,
    closeLesson,
    goToStep,
    showNextHint,
    setCheck,
    markStepPassed
};
