import Cast from '../util/cast';
import type BlockUtility from '../engine/block-utility';
import type {VariableArg} from '../engine/block-types';
import type Runtime from '../engine/runtime';
import {RuntimeEventNames, type RuntimeEmitter} from '../engine/runtime/runtime-events';

class Scratch3ControlBlocks {
    events: RuntimeEmitter;
    redraw: Pick<Runtime, 'requestRedraw'>;
    /** The "counter" block value, for Scratch 2 compatibility. */
    _counter = 0;

    constructor (events: RuntimeEmitter, redraw: Pick<Runtime, 'requestRedraw'>) {
        this.events = events;
        this.redraw = redraw;
        events.on(RuntimeEventNames.RUNTIME_DISPOSED, this.clearCounter.bind(this));
    }

    getPrimitives () {
        return {
            control_repeat: this.repeat,
            control_repeat_until: this.repeatUntil,
            control_while: this.repeatWhile,
            control_for_each: this.forEach,
            control_forever: this.forever,
            control_wait: this.wait,
            control_wait_until: this.waitUntil,
            control_if: this.if,
            control_if_else: this.ifElse,
            control_stop: this.stop,
            control_get_counter: this.getCounter,
            control_incr_counter: this.incrCounter,
            control_clear_counter: this.clearCounter,
            control_all_at_once: this.allAtOnce,
            control_print: this.print
        };
    }

    getHats () {
        return {};
    }

    /** Runs the branch once per call; the sequencer re-runs this block when the branch ends. */
    repeat (args: {TIMES: unknown}, util: BlockUtility) {
        if (typeof util.stackFrame.loopCounter === 'undefined') {
            util.stackFrame.loopCounter = Math.round(Cast.toNumber(args.TIMES));
        }
        util.stackFrame.loopCounter--;
        if (util.stackFrame.loopCounter >= 0) {
            util.startBranch(1, true);
        }
    }

    repeatUntil (args: {CONDITION: unknown}, util: BlockUtility) {
        if (!Cast.toBoolean(args.CONDITION)) {
            util.startBranch(1, true);
        }
    }

    repeatWhile (args: {CONDITION: unknown}, util: BlockUtility) {
        if (Cast.toBoolean(args.CONDITION)) {
            util.startBranch(1, true);
        }
    }

    forEach (args: {VARIABLE: VariableArg, VALUE: unknown}, util: BlockUtility) {
        const variable = util.target.lookupOrCreateVariable(args.VARIABLE.id, args.VARIABLE.name);
        if (typeof util.stackFrame.index === 'undefined') {
            util.stackFrame.index = 0;
        }
        if (util.stackFrame.index < Number(args.VALUE)) {
            util.stackFrame.index++;
            variable.value = util.stackFrame.index;
            util.startBranch(1, true);
        }
    }

    waitUntil (args: {CONDITION: unknown}, util: BlockUtility) {
        if (!Cast.toBoolean(args.CONDITION)) {
            util.yield();
        }
    }

    forever (args: object, util: BlockUtility) {
        util.startBranch(1, true);
    }

    wait (args: {DURATION: unknown}, util: BlockUtility) {
        if (util.stackTimerNeedsInit()) {
            util.startStackTimer(Math.max(0, 1000 * Cast.toNumber(args.DURATION)));
            this.redraw.requestRedraw();
            util.yield();
        } else if (!util.stackTimerFinished()) {
            util.yield();
        }
    }

    if (args: {CONDITION: unknown}, util: BlockUtility) {
        if (Cast.toBoolean(args.CONDITION)) {
            util.startBranch(1, false);
        }
    }

    ifElse (args: {CONDITION: unknown}, util: BlockUtility) {
        util.startBranch(Cast.toBoolean(args.CONDITION) ? 1 : 2, false);
    }

    stop (args: {STOP_OPTION: string}, util: BlockUtility) {
        const option = args.STOP_OPTION;
        if (option === 'all') {
            util.stopAll();
        } else if (option === 'other scripts in sprite' || option === 'other scripts in stage') {
            util.stopOtherTargetThreads();
        } else if (option === 'this script') {
            util.stopThisScript();
        }
    }

    getCounter () {
        return this._counter;
    }

    clearCounter () {
        this._counter = 0;
    }

    incrCounter () {
        this._counter++;
    }

    /** Runs its branch like "if 1 = 1", as Scratch 2 did; kept for Scratch 2 projects. */
    allAtOnce (args: object, util: BlockUtility) {
        util.startBranch(1, false);
    }

    print (args: {STRING: unknown}) {
        this.events.emit(RuntimeEventNames.PRINT_TO_MONITOR, String(args.STRING ?? ''));
    }
}

export default Scratch3ControlBlocks;
