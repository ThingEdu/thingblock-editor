import Cast from '../util/cast';
import getMonitorIdForBlockWithArgs from '../util/get-monitor-id';
import type BlockUtility from '../engine/block-utility';
import type Target from '../engine/target';
import {RuntimeEventNames, type RuntimeEmitter} from '../engine/runtime/runtime-events';

interface QueuedQuestion {
    question: string
    resolve: () => void
    target: Target
}

class Scratch3SensingBlocks {
    events: RuntimeEmitter;
    /** The "answer" reporter value. */
    _answer = '';
    /** Pending "ask and wait" questions; the head is the one on screen. */
    _questionList: QueuedQuestion[] = [];

    constructor (events: RuntimeEmitter) {
        this.events = events;
        events.on(RuntimeEventNames.ANSWER, this._onAnswer.bind(this));
        events.on(RuntimeEventNames.PROJECT_START, this._resetAnswer.bind(this));
        events.on(RuntimeEventNames.PROJECT_STOP_ALL, this._clearAllQuestions.bind(this));
        events.on(RuntimeEventNames.STOP_FOR_TARGET, this._clearTargetQuestions.bind(this));
        events.on(RuntimeEventNames.RUNTIME_DISPOSED, this._resetAnswer.bind(this));
    }

    getPrimitives () {
        return {
            sensing_timer: this.getTimer,
            sensing_resettimer: this.resetTimer,
            sensing_mousex: this.getMouseX,
            sensing_mousey: this.getMouseY,
            sensing_mousedown: this.getMouseDown,
            sensing_keypressed: this.getKeyPressed,
            sensing_current: this.current,
            sensing_dayssince2000: this.daysSince2000,
            sensing_askandwait: this.askAndWait,
            sensing_answer: this.getAnswer,
            sensing_online: this.getOnline
        };
    }

    getMonitored () {
        return {
            sensing_answer: {
                getId: () => 'answer'
            },
            sensing_online: {
                getId: () => 'online'
            },
            sensing_timer: {
                getId: () => 'timer'
            },
            sensing_current: {
                // Differs from the toolbox id so sb2 projects can hold one monitor per menu option
                getId: (_: string, fields: Record<string, unknown>) => getMonitorIdForBlockWithArgs('current', fields)
            }
        };
    }

    _onAnswer (answer: string) {
        this._answer = answer;
        const asked = this._questionList.shift();
        if (asked) {
            asked.resolve();
            this._askNextQuestion();
        }
    }

    _resetAnswer () {
        this._answer = '';
    }

    _askNextQuestion () {
        if (this._questionList.length > 0) {
            this.events.emit(RuntimeEventNames.QUESTION, this._questionList[0].question);
        }
    }

    _clearAllQuestions () {
        this._questionList = [];
        this.events.emit(RuntimeEventNames.QUESTION, null);
    }

    _clearTargetQuestions (stopTarget: Target) {
        const currentlyAsking = this._questionList.length > 0 && this._questionList[0].target === stopTarget;
        this._questionList = this._questionList.filter(queued => queued.target !== stopTarget);
        if (!currentlyAsking) return;
        if (this._questionList.length > 0) {
            this._askNextQuestion();
        } else {
            this.events.emit(RuntimeEventNames.QUESTION, null);
        }
    }

    askAndWait (args: {QUESTION: unknown}, util: BlockUtility): Promise<void> {
        return new Promise(resolve => {
            const isQuestionAsked = this._questionList.length > 0;
            this._questionList.push({question: String(args.QUESTION), resolve, target: util.target});
            if (!isQuestionAsked) this._askNextQuestion();
        });
    }

    getAnswer () {
        return this._answer;
    }

    getTimer (args: object, util: BlockUtility) {
        return util.ioQuery('clock', 'projectTimer');
    }

    resetTimer (args: object, util: BlockUtility) {
        util.ioQuery('clock', 'resetProjectTimer');
    }

    getMouseX (args: object, util: BlockUtility) {
        return util.ioQuery('mouse', 'getScratchX');
    }

    getMouseY (args: object, util: BlockUtility) {
        return util.ioQuery('mouse', 'getScratchY');
    }

    getMouseDown (args: object, util: BlockUtility) {
        return util.ioQuery('mouse', 'getIsDown');
    }

    current (args: {CURRENTMENU: unknown}) {
        const date = new Date();
        switch (Cast.toString(args.CURRENTMENU).toLowerCase()) {
        case 'year': return date.getFullYear();
        case 'month': return date.getMonth() + 1; // getMonth is zero-based
        case 'date': return date.getDate();
        case 'dayofweek': return date.getDay() + 1; // getDay is zero-based, Sun=0
        case 'hour': return date.getHours();
        case 'minute': return date.getMinutes();
        case 'second': return date.getSeconds();
        }
        return 0;
    }

    getKeyPressed (args: {KEY_OPTION: unknown}, util: BlockUtility) {
        return util.ioQuery('keyboard', 'getKeyIsDown', [args.KEY_OPTION]);
    }

    daysSince2000 () {
        const msPerDay = 24 * 60 * 60 * 1000;
        const start = new Date(2000, 0, 1); // Months are 0-indexed
        const today = new Date();
        const dstAdjust = today.getTimezoneOffset() - start.getTimezoneOffset();
        let mSecsSinceStart = today.valueOf() - start.valueOf();
        mSecsSinceStart += ((today.getTimezoneOffset() - dstAdjust) * 60 * 1000);
        return mSecsSinceStart / msPerDay;
    }

    /** Online status, or '' when the browser does not report one, to tell "offline" from "unknown". */
    getOnline (): boolean | '' {
        const status: unknown = window.navigator.onLine;
        return typeof status === 'boolean' ? status : '';
    }
}

export default Scratch3SensingBlocks;
