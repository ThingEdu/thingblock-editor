// Per-lesson progress on this machine. Storage is a convenience: when the browser refuses it (private
// window, kiosk policy) the lesson simply starts from step one.
const key = ma => `thingblock.lesson.${ma}`;

export const loadProgress = ma => {
    try {
        const raw = window.localStorage.getItem(key(ma));
        if (!raw) return null;
        const {stepIndex, passedSteps} = JSON.parse(raw);
        return {stepIndex: Number(stepIndex) || 0, passedSteps: Array.isArray(passedSteps) ? passedSteps : []};
    } catch (e) {
        return null;
    }
};

export const saveProgress = (ma, progress) => {
    try {
        window.localStorage.setItem(key(ma), JSON.stringify(progress));
    } catch (e) {
        // Storage refused: progress just is not kept on this machine.
    }
};
