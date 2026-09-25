import BlockUtility from './block-utility';
import execute, {BlockCached} from './execute';
import Thread from './thread';
import Timer from '../util/timer';
import type Blocks from './blocks';
import type {ExecuteCacheData} from './blocks-execute-cache';
import type Runtime from './runtime';

const stepThreadProfilerFrame = 'Sequencer.stepThread';
const stepThreadsInnerProfilerFrame = 'Sequencer.stepThreads#inner';
const executeProfilerFrame = 'execute';
let stepThreadProfilerId = -1;
let stepThreadsInnerProfilerId = -1;
let executeProfilerId = -1;

const isFinished = (thread: Thread) => thread.stack.length === 0 || thread.status === Thread.STATUS_DONE;

/** Steps the runtime's threads each tick, and moves a thread through branches and procedures. */
class Sequencer {
    /** Time a warp-mode thread runs before yielding, in ms. */
    static readonly WARP_TIME = 500;

    runtime: Runtime;
    /** Times the work done in one `stepThreads` call. */
    timer = new Timer();
    activeThread: Thread | null = null;
    /** Passed to every block primitive this sequencer runs. */
    util = new BlockUtility(this);
    /** Builds execute's per-block cache; kept here so execute doesn't allocate a builder per block. */
    buildBlockCached = (blocks: Blocks, data: ExecuteCacheData) => new BlockCached(this.runtime, blocks, data);

    constructor (runtime: Runtime) {
        this.runtime = runtime;
    }

    /** Runs threads in turn until 75% of the step time is used, all yield, or a redraw is requested. */
    stepThreads (): Thread[] {
        const runtime = this.runtime;
        const WORK_TIME = 0.75 * runtime.currentStepTime;
        // Scratch 2 compatibility: blocks read one timestamp per step
        runtime.updateCurrentMSecs();
        this.timer.start();
        let numActiveThreads = Infinity;
        // A full pass over the threads ran, so YIELD_TICK threads wait for the next step
        let ranFirstTick = false;
        const doneThreads: Thread[] = [];

        while (runtime.threads.length > 0 &&
               numActiveThreads > 0 &&
               this.timer.timeElapsed() < WORK_TIME &&
               (runtime.turboMode || !runtime.redrawRequested)) {
            if (runtime.profiler !== null) {
                if (stepThreadsInnerProfilerId === -1) {
                    stepThreadsInnerProfilerId = runtime.profiler.idByName(stepThreadsInnerProfilerFrame);
                }
                runtime.profiler.start(stepThreadsInnerProfilerId);
            }

            numActiveThreads = 0;
            let stoppedThread = false;
            const threads = runtime.threads;
            for (let i = 0; i < threads.length; i++) {
                const activeThread = this.activeThread = threads[i];
                if (isFinished(activeThread)) {
                    stoppedThread = true;
                    continue;
                }
                if (activeThread.status === Thread.STATUS_YIELD_TICK && !ranFirstTick) {
                    activeThread.status = Thread.STATUS_RUNNING;
                }
                if (activeThread.status === Thread.STATUS_RUNNING || activeThread.status === Thread.STATUS_YIELD) {
                    if (runtime.profiler !== null) {
                        if (stepThreadProfilerId === -1) {
                            stepThreadProfilerId = runtime.profiler.idByName(stepThreadProfilerFrame);
                        }
                        runtime.profiler.increment(stepThreadProfilerId);
                    }
                    this.stepThread(activeThread);
                    activeThread.warpTimer = null;
                    // A killed thread was removed from the list, so the next one is now at `i`
                    if (activeThread.isKilled) {
                        i--;
                    }
                }
                if (activeThread.status === Thread.STATUS_RUNNING) {
                    numActiveThreads++;
                }
                if (isFinished(activeThread)) {
                    stoppedThread = true;
                }
            }
            ranFirstTick = true;

            if (runtime.profiler !== null) {
                runtime.profiler.stop();
            }

            // Remove finished threads in place, before the next pass
            if (stoppedThread) {
                let nextActiveThread = 0;
                for (const thread of runtime.threads) {
                    if (isFinished(thread)) {
                        doneThreads.push(thread);
                    } else {
                        runtime.threads[nextActiveThread++] = thread;
                    }
                }
                runtime.threads.length = nextActiveThread;
            }
        }

        this.activeThread = null;
        return doneThreads;
    }

    /** Runs a thread's blocks until it yields, waits, or finishes. */
    stepThread (thread: Thread) {
        let currentBlockId = thread.peekStack();
        if (!currentBlockId) {
            // An empty branch
            thread.popStack();
            // The null followed a hat block
            if (thread.stack.length === 0) {
                thread.status = Thread.STATUS_DONE;
                return;
            }
        }
        while ((currentBlockId = thread.peekStack())) {
            let isWarpMode = thread.peekStackFrame().warpMode;
            if (isWarpMode && !thread.warpTimer) {
                thread.warpTimer = new Timer();
                thread.warpTimer.start();
            }
            if (this.runtime.profiler !== null) {
                if (executeProfilerId === -1) {
                    executeProfilerId = this.runtime.profiler.idByName(executeProfilerFrame);
                }
                this.runtime.profiler.increment(executeProfilerId);
            }
            execute(this, thread);
            thread.blockGlowInFrame = currentBlockId;

            if (thread.status === Thread.STATUS_YIELD) {
                thread.status = Thread.STATUS_RUNNING;
                // Warp mode re-runs a yielding block until its time is up
                if (isWarpMode && thread.warpTimer.timeElapsed() <= Sequencer.WARP_TIME) {
                    continue;
                }
                return;
            } else if (thread.status === Thread.STATUS_PROMISE_WAIT) {
                // The promise's resolution sets the thread running again
                return;
            } else if (thread.status === Thread.STATUS_YIELD_TICK) {
                // stepThreads sets the thread running on the next tick
                return;
            }
            // No control flow happened, so move to the next block
            if (thread.peekStack() === currentBlockId) {
                thread.goToNextBlock();
            }
            // The level ended; continue from the levels below it
            while (!thread.peekStack()) {
                thread.popStack();
                if (thread.stack.length === 0) {
                    thread.status = Thread.STATUS_DONE;
                    return;
                }

                const stackFrame = thread.peekStackFrame();
                isWarpMode = stackFrame.warpMode;
                if (stackFrame.isLoop) {
                    // A loop re-runs its block: next step, or right away in warp mode with time left
                    if (!isWarpMode || thread.warpTimer.timeElapsed() > Sequencer.WARP_TIME) {
                        return;
                    }
                    continue;
                } else if (stackFrame.waitingReporter) {
                    // A reporter just returned to this level, which stays on its block
                    return;
                }
                thread.goToNextBlock();
            }
        }
    }

    /** Steps into branch `branchNum` (1-based, default 1) of the current block; an empty branch pushes null. */
    stepToBranch (thread: Thread, branchNum: number, isLoop: boolean) {
        const branchId = thread.target.blocks.getBranch(thread.peekStack(), branchNum || 1);
        thread.peekStackFrame().isLoop = isLoop;
        thread.pushStack(branchId || null);
    }

    /** Pushes a procedure's definition, entering warp mode or yielding as the call requires. */
    stepToProcedure (thread: Thread, procedureCode: string) {
        const definition = thread.target.blocks.getProcedureDefinition(procedureCode);
        if (!definition) return;

        const isRecursive = thread.isRecursiveCall(procedureCode);
        // The sequencer pops the definition when its blocks finish, returning to the caller
        thread.pushStack(definition);
        if (thread.peekStackFrame().warpMode && thread.warpTimer.timeElapsed() > Sequencer.WARP_TIME) {
            // A warp-mode thread yields only when its time is up
            thread.status = Thread.STATUS_YIELD;
            return;
        }
        const definitionBlock = thread.target.blocks.getBlock(definition);
        const innerBlock = thread.target.blocks.getBlock(definitionBlock.inputs.custom_block.block);
        let doWarp = false;
        if (innerBlock?.mutation) {
            const warp = innerBlock.mutation.warp;
            if (typeof warp === 'boolean') {
                doWarp = warp;
            } else if (typeof warp === 'string') {
                doWarp = JSON.parse(warp);
            }
        }
        if (doWarp) {
            thread.peekStackFrame().warpMode = true;
        } else if (isRecursive) {
            // A normal-mode thread yields on every recursive call
            thread.status = Thread.STATUS_YIELD;
        }
    }

    /** Ends a thread immediately, without running further blocks. */
    retireThread (thread: Thread) {
        thread.stack = [];
        thread.stackFrames = [];
        thread.requestScriptGlowInFrame = false;
        thread.status = Thread.STATUS_DONE;
    }
}

export default Sequencer;
