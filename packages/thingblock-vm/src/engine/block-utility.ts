import Thread from './thread';
import Timer from '../util/timer';
import type Runtime from './runtime';
import type {HatMatchFields} from './runtime';
import type Sequencer from './sequencer';
import type Target from './target';

/** What block primitives get to reach their thread, target and runtime; one per sequencer, reused for each block. */
class BlockUtility {
    sequencer: Sequencer | null;
    /** The thread running the current block; execute sets it before each block. */
    thread: Thread | null;

    constructor (sequencer: Sequencer | null = null, thread: Thread | null = null) {
        this.sequencer = sequencer;
        this.thread = thread;
    }

    get target (): Target {
        return this.thread.target;
    }

    get runtime (): Runtime {
        return this.sequencer.runtime;
    }

    /** The runtime's per-step clock, which some blocks read for Scratch 2 compatibility. */
    get nowObj (): {now (): number} | null {
        return this.runtime ? this.runtime.stepClock : null;
    }

    /** State a block keeps in its stack frame across yields, such as loop counters and timers. */
    get stackFrame (): Record<string, any> {
        const frame = this.thread.peekStackFrame();
        frame.executionContext ??= {};
        return frame.executionContext;
    }

    stackTimerFinished (): boolean {
        return !(this.stackFrame.timer.timeElapsed() < this.stackFrame.duration);
    }

    stackTimerNeedsInit (): boolean {
        return !this.stackFrame.timer;
    }

    startStackTimer (duration: number) {
        this.stackFrame.timer = this.nowObj ? new Timer(this.nowObj) : new Timer();
        this.stackFrame.timer.start();
        this.stackFrame.duration = duration;
    }

    yield () {
        this.thread.status = Thread.STATUS_YIELD;
    }

    /** Yields until the next tick of the runtime. */
    yieldTick () {
        this.thread.status = Thread.STATUS_YIELD_TICK;
    }

    /** Steps into branch `branchNum` (1-based) of the current block. */
    startBranch (branchNum: number, isLoop: boolean) {
        this.sequencer.stepToBranch(this.thread, branchNum, isLoop);
    }

    stopAll () {
        this.sequencer.runtime.stopAll();
    }

    /** Stops the other threads on this thread's target. */
    stopOtherTargetThreads () {
        this.sequencer.runtime.stopForTarget(this.thread.target, this.thread);
    }

    stopThisScript () {
        this.thread.stopThisScript();
    }

    startProcedure (procedureCode: string) {
        this.sequencer.stepToProcedure(this.thread, procedureCode);
    }

    getProcedureParamNamesAndIds (procedureCode: string) {
        return this.thread.target.blocks.getProcedureParamNamesAndIds(procedureCode);
    }

    getProcedureParamNamesIdsAndDefaults (procedureCode: string) {
        return this.thread.target.blocks.getProcedureParamNamesIdsAndDefaults(procedureCode);
    }

    initParams () {
        this.thread.initParams();
    }

    pushParam (paramName: string, paramValue: unknown) {
        this.thread.pushParam(paramName, paramValue);
    }

    getParam (paramName: string): unknown {
        return this.thread.getParam(paramName);
    }

    startHats (requestedHat: string, optMatchFields?: HatMatchFields, optTarget?: Target): Thread[] {
        // Starting hats executes their first blocks, which moves `thread` off the calling block
        const callerThread = this.thread;
        const result = this.sequencer.runtime.startHats(requestedHat, optMatchFields, optTarget);
        this.thread = callerThread;
        return result;
    }

    /** Calls `func` on the named I/O device, such as the keyboard; undefined when either is missing. */
    ioQuery (device: string, func: string, args?: unknown[]): unknown {
        const devObject = (this.sequencer.runtime.ioDevices as Record<string, any>)[device];
        if (devObject && devObject[func]) {
            return devObject[func].apply(devObject, args);
        }
    }
}

export default BlockUtility;
