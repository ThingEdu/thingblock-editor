import type Blocks from './blocks';
import type Target from './target';
import type Timer from '../util/timer';

/** A reporter's value saved while its parent block waits on a promise. */
export interface ReportedInput {
    opCached: string
    inputValue: unknown
}

/** The block fields Thread reads; the JS Blocks types `getBlock` as a bare object. */
interface ScriptBlock {
    opcode: string
    mutation?: {proccode: string}
}

const stackFrameFreeList: StackFrame[] = [];

/** Execution context for one level of a thread's stack. */
export class StackFrame {
    isLoop = false;
    /** Set by warp-mode procedures and turbo mode. */
    warpMode: boolean;
    justReported: unknown = null;
    /** The block waiting on a promise. */
    reporting: string | null = '';
    /** Inputs already evaluated before the promise, reinstated once it resolves. */
    reported: ReportedInput[] | null = null;
    waitingReporter: string | null = null;
    /** Procedure parameters. */
    params: Record<string, unknown> | null = null;
    /** Per-block state that block implementations keep across yields. */
    executionContext: Record<string, unknown> | null = null;

    constructor (warpMode: boolean) {
        this.warpMode = warpMode;
    }

    reset (): this {
        this.isLoop = false;
        this.warpMode = false;
        this.justReported = null;
        this.reported = null;
        this.waitingReporter = null;
        this.params = null;
        this.executionContext = null;
        return this;
    }

    reuse (warpMode = this.warpMode): this {
        this.reset();
        this.warpMode = Boolean(warpMode);
        return this;
    }

    /** Takes a frame from the free list, or makes one; frames are pooled because every block step pushes one. */
    static create (warpMode: boolean): StackFrame {
        const stackFrame = stackFrameFreeList.pop();
        if (stackFrame) {
            stackFrame.warpMode = Boolean(warpMode);
            return stackFrame;
        }
        return new StackFrame(warpMode);
    }

    static release (stackFrame: StackFrame | undefined) {
        if (stackFrame) {
            stackFrameFreeList.push(stackFrame.reset());
        }
    }
}

export type ThreadStatus = 0 | 1 | 2 | 3 | 4;

/** A running script: its block stack, frames and scheduling state. */
class Thread {
    /** Running normally, stepping from block to block. */
    static readonly STATUS_RUNNING = 0;
    /** A primitive is waiting on a promise, which will change the status. */
    static readonly STATUS_PROMISE_WAIT = 1;
    static readonly STATUS_YIELD = 2;
    /** Yield for one tick; cleared when the thread resumes. */
    static readonly STATUS_YIELD_TICK = 3;
    /** No more blocks to execute. */
    static readonly STATUS_DONE = 4;

    topBlock: string;
    target: Target;
    /** The Blocks this thread executes: the target's own, or the runtime's monitor blocks. */
    blockContainer: Blocks;
    /** Block IDs; the sequencer pushes control blocks to know where to exit. `null` marks the script's end. */
    stack: Array<string | null> = [];
    stackFrames: StackFrame[] = [];
    status: ThreadStatus = Thread.STATUS_RUNNING;
    /** Killed mid-execution; the runtime removes it at the next step. */
    isKilled = false;
    stackClick = false;
    updateMonitor = false;
    requestScriptGlowInFrame = false;
    blockGlowInFrame: string | null = null;
    /** Replaces the sequencer's WORK_TIME count while the thread is in warp mode. */
    warpTimer: Timer | null = null;
    justReported: unknown = null;

    constructor (topBlock: string, target: Target, blockContainer: Blocks) {
        this.topBlock = topBlock;
        this.target = target;
        this.blockContainer = blockContainer;
    }

    pushStack (blockId: string | null) {
        this.stack.push(blockId);
        // A frame may already exist for this level if the stack was just popped.
        if (this.stack.length > this.stackFrames.length) {
            const parent = this.stackFrames[this.stackFrames.length - 1];
            this.stackFrames.push(StackFrame.create(parent?.warpMode ?? false));
        }
    }

    /** Replaces the top block, reusing its frame so warp mode carries over. */
    reuseStackForNextBlock (blockId: string | null) {
        this.stack[this.stack.length - 1] = blockId;
        this.stackFrames[this.stackFrames.length - 1].reuse();
    }

    popStack (): string | null | undefined {
        StackFrame.release(this.stackFrames.pop());
        return this.stack.pop();
    }

    /** Pops back to the enclosing procedure call; with none, the thread is done. */
    stopThisScript () {
        let blockId = this.peekStack();
        while (blockId !== null) {
            if (this._getBlock(blockId)?.opcode === 'procedures_call') break;
            this.popStack();
            blockId = this.peekStack();
        }

        if (this.stack.length === 0) {
            this.requestScriptGlowInFrame = false;
            this.status = Thread.STATUS_DONE;
        }
    }

    peekStack (): string | null {
        return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
    }

    peekStackFrame (): StackFrame | null {
        return this.stackFrames.length > 0 ? this.stackFrames[this.stackFrames.length - 1] : null;
    }

    peekParentStackFrame (): StackFrame | null {
        return this.stackFrames.length > 1 ? this.stackFrames[this.stackFrames.length - 2] : null;
    }

    pushReportedValue (value: unknown) {
        this.justReported = typeof value === 'undefined' ? null : value;
    }

    initParams () {
        const frame = this._topFrame('initParams');
        if (frame.params === null) {
            frame.params = {};
        }
    }

    pushParam (paramName: string, value: unknown) {
        this._topFrame('pushParam').params[paramName] = value;
    }

    /** Reads a procedure parameter from the innermost frame that has params; `null` outside a procedure. */
    getParam (paramName: string): unknown {
        for (let i = this.stackFrames.length - 1; i >= 0; i--) {
            const frame = this.stackFrames[i];
            if (frame.params === null) continue;
            return Object.hasOwn(frame.params, paramName) ? frame.params[paramName] : null;
        }
        return null;
    }

    atStackTop (): boolean {
        return this.peekStack() === this.topBlock;
    }

    goToNextBlock () {
        this.reuseStackForNextBlock(this.blockContainer.getNextBlock(this.peekStack()));
    }

    /** Guesses recursion from the last few enclosing procedure calls; warp mode uses it to decide when to yield. */
    isRecursiveCall (procedureCode: string): boolean {
        let callCount = 5; // Max number of enclosing procedure calls to examine.
        for (let i = this.stack.length - 2; i >= 0; i--) {
            // A block clicked in the flyout is not in the container, so it can't be a recursive call.
            const block = this._getBlock(this.stack[i]);
            if (block?.opcode === 'procedures_call' && block.mutation.proccode === procedureCode) {
                return true;
            }
            if (--callCount < 0) return false;
        }
        return false;
    }

    _getBlock (blockId: string | null): ScriptBlock | undefined {
        return this.blockContainer.getBlock(blockId) as ScriptBlock | undefined;
    }

    _topFrame (caller: string): StackFrame {
        const frame = this.peekStackFrame();
        if (!frame) throw new Error(`Thread.${caller}: empty stack on thread ${this.topBlock}`);
        return frame;
    }
}

export default Thread;
