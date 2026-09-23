import {EventEmitter} from 'events';
import uuid from 'uuid';
import type {ScratchStorage} from '@scratch/scratch-storage';

import Blocks from './blocks';
import {getScripts, type RuntimeScriptCache} from './blocks-runtime-cache';
import execute from './execute';
import Profiler from './profiler';
import Sequencer from './sequencer';
import type Target from './target';
import Thread from './thread';
import GlowFeedback from './runtime/glow-feedback';
import MonitorHandler from './runtime/runtime-monitor';
import PeripheralHandler from './runtime/runtime-peripheral';
import RuntimeEventNames from './runtime/event-names';
import type {RuntimeEvents} from './runtime/runtime-events';
import type {MenuInfo} from '../extensions/extension';

import Clock from '../io/input/clock';
import Keyboard from '../io/hid/keyboard';
import Mouse from '../io/hid/mouse';
import MouseWheel from '../io/hid/mouse-wheel';
import UserData from '../io/input/user-data';

import Scratch3ControlBlocks from '../blocks/scratch3_control';
import Scratch3DataBlocks from '../blocks/scratch3_data';
import Scratch3EventBlocks from '../blocks/scratch3_event';
import Scratch3OperatorsBlocks from '../blocks/scratch3_operators';
import Scratch3ProcedureBlocks from '../blocks/scratch3_procedures';
import Scratch3SensingBlocks from '../blocks/scratch3_sensing';
import type BlockUtility from './block-utility';

export type BlockFunction = (args: Record<string, unknown>, util: BlockUtility) => unknown;

export interface HatInfo {
    edgeActivated?: boolean
    restartExistingThreads?: boolean
}

/** Hat fields to match, e.g. `{KEY_OPTION: 'space'}`; compared case-insensitively. */
export type HatMatchFields = Record<string, string>;

export type HatStarter = Pick<Runtime, 'startHats'>;

export interface MonitoredInfo {
    isSpriteSpecific?: boolean
    getId?: (targetId: string, fields: Record<string, unknown>) => string
}

export interface BlockPackage {
    getPrimitives? (): Record<string, BlockFunction>
    getHats? (): Record<string, HatInfo>
    getMonitored? (): Record<string, MonitoredInfo>
}

export interface CategoryInfo {
    id: string
    name: string
    showStatusButton?: boolean
    blockIconURI?: string
    menuIconURI?: string
    color1: string
    color2: string
    color3: string
    blocks: unknown[]
    customFieldTypes: Record<string, unknown>
    menus: unknown[]
    menuInfo: Record<string, MenuInfo>
}

class Runtime {
    static readonly THREAD_STEP_INTERVAL = 1000 / 60;
    static readonly THREAD_STEP_INTERVAL_COMPATIBILITY = 1000 / 30;

    events = new EventEmitter<RuntimeEvents>();
    targets: Target[] = [];
    /** Targets in reverse order of execution. */
    executableTargets: Target[] = [];
    threads: Thread[] = [];
    sequencer: Sequencer;
    /** Flyout blocks, executed on the editing target. */
    flyoutBlocks: Blocks;
    monitorBlocks: Blocks;
    _editingTarget: Target | null = null;

    _primitives: Record<string, BlockFunction> = {};
    _blockInfo: CategoryInfo[] = [];
    _hats: Record<string, HatInfo> = {};
    monitorBlockInfo: Record<string, MonitoredInfo> = {};

    glows: GlowFeedback;
    monitors: MonitorHandler;
    peripherals = new PeripheralHandler();
    ioDevices: {
        clock: Clock
        keyboard: Keyboard
        mouse: Mouse
        mouseWheel: MouseWheel
        userData: UserData
    };

    /** Non-monitor threads running during the previous step, to detect run start/stop. */
    _nonMonitorThreadCount = 0;
    _lastStepDoneThreads: Thread[] | null = null;
    /** Emit a targets update at the end of the step. */
    _refreshTargets = false;

    turboMode = false;
    /** 30 TPS instead of 60. */
    compatibilityMode = false;
    _steppingInterval: ReturnType<typeof setInterval> | null = null;
    currentStepTime: number | null = null;
    /** Scratch 2 compatibility: some blocks read a per-step timestamp. */
    currentMSecs: number;
    /** Makes the sequencer yield after each thread; reset every step. */
    redrawRequested = false;

    profiler: Profiler | null = null;
    /** Where the project came from outside the Scratch community, e.g. CSFirst. */
    origin: string | null = null;
    storage?: ScratchStorage;
    audioEngine?: unknown;

    constructor () {
        this.sequencer = new Sequencer(this);
        this.flyoutBlocks = new Blocks(this.events, true /* force no glow */);
        this.monitorBlocks = new Blocks(this.events, true /* force no glow */);
        this.glows = new GlowFeedback(this);
        this.monitors = new MonitorHandler(this.events);
        this.updateCurrentMSecs();
        this._registerBlockPackages();
        this.ioDevices = {
            clock: new Clock(this),
            keyboard: new Keyboard(this.events),
            mouse: new Mouse(),
            mouseWheel: new MouseWheel(this),
            userData: new UserData()
        };
        this.resetRunId();
    }

    
    /** Tags storage requests with a fresh run id; called whenever the project starts, stops or changes. */
    resetRunId () {
        if (!this.storage) return;
        this.storage.scratchFetch.setMetadata(this.storage.scratchFetch.RequestMetadata.RunId, uuid.v1());
    }

    updateCurrentMSecs () {
        this.currentMSecs = Date.now();
    }

    getIsHat (opcode: string): boolean {
        return Object.hasOwn(this._hats, opcode);
    }

    getIsEdgeActivatedHat (opcode: string): boolean {
        return this.getIsHat(opcode) && Boolean(this._hats[opcode].edgeActivated);
    }

    /** Calls `f` for each script topped by `opcode`, in execution order (`executableTargets` is stored reversed). */
    allScriptsByOpcodeDo (
        opcode: string,
        f: (script: RuntimeScriptCache, target: Target) => void,
        optTarget?: Target
    ) {
        const targets = optTarget ? [optTarget] : this.executableTargets;
        for (let t = targets.length - 1; t >= 0; t--) {
            for (const script of getScripts(targets[t].blocks, opcode)) {
                f(script, targets[t]);
            }
        }
    }

    /** Starts a thread for each `opcode` hat whose fields match; returns the threads started. */
    startHats (opcode: string, matchFields: HatMatchFields = {}, optTarget?: Target): Thread[] {
        if (!this.getIsHat(opcode)) return [];
        const hatMeta = this._hats[opcode];
        const fields = Object.entries(matchFields).map(([name, value]) => [name, value.toUpperCase()]);
        const newThreads: Thread[] = [];

        this.allScriptsByOpcodeDo(opcode, ({blockId: topBlockId, fieldsOfInputs}, target) => {
            // Match before the hat runs, so "broadcast and wait" knows exactly which threads it started.
            if (fields.some(([name, value]) => fieldsOfInputs[name].value !== value)) return;

            // Stack-click threads coexist with hat threads.
            const isThisScript = (thread: Thread) =>
                thread.target === target && thread.topBlock === topBlockId && !thread.stackClick;
            if (hatMeta.restartExistingThreads) {
                const index = this.threads.findIndex(isThisScript);
                if (index > -1) {
                    newThreads.push(this._restartThread(index));
                    return;
                }
            } else if (this.threads.some(thread => isThisScript(thread) && thread.status !== Thread.STATUS_DONE)) {
                return;
            }
            newThreads.push(this._pushThread(topBlockId, target));
        }, optTarget);

        // Scratch 2 compatibility: new hats run their first block before any thread steps.
        for (const thread of newThreads) {
            execute(this.sequencer, thread);
            thread.goToNextBlock();
        }
        return newThreads;
    }

    /** Collects primitives, hat metadata and monitored opcodes from the built-in block packages. */
    private _registerBlockPackages () {
        const blockPackages: BlockPackage[] = [
            new Scratch3ControlBlocks(this),
            new Scratch3EventBlocks(this.events, this),
            new Scratch3OperatorsBlocks(),
            new Scratch3SensingBlocks(this.events),
            new Scratch3DataBlocks(this),
            new Scratch3ProcedureBlocks()
        ];
        for (const blockPackage of blockPackages) {
            if (blockPackage.getPrimitives) {
                for (const [opcode, primitive] of Object.entries(blockPackage.getPrimitives())) {
                    this._primitives[opcode] = primitive.bind(blockPackage);
                }
            }
            if (blockPackage.getHats) {
                Object.assign(this._hats, blockPackage.getHats());
            }
            if (blockPackage.getMonitored) {
                Object.assign(this.monitorBlockInfo, blockPackage.getMonitored());
            }
        }
    }

    private _pushThread (
        topBlockId: string,
        target: Target,
        opts: {stackClick?: boolean, updateMonitor?: boolean} = {}
    ): Thread {
        const updateMonitor = Boolean(opts.updateMonitor);
        const thread = new Thread(topBlockId, target, updateMonitor ? this.monitorBlocks : target.blocks);
        thread.stackClick = Boolean(opts.stackClick);
        thread.updateMonitor = updateMonitor;
        thread.pushStack(topBlockId);
        this.threads.push(thread);
        return thread;
    }

    /** Replaces the thread at `index` with a fresh one in the same slot, keeping Scratch 2 execution order. */
    private _restartThread (index: number): Thread {
        const thread = this.threads[index];
        const newThread = new Thread(thread.topBlock, thread.target, thread.blockContainer);
        newThread.stackClick = thread.stackClick;
        newThread.updateMonitor = thread.updateMonitor;
        newThread.pushStack(thread.topBlock);
        this.threads[index] = newThread;
        return newThread;
    }
}

// JS callers read event names as statics (`Runtime.PROJECT_START`); TS code imports `RuntimeEventNames`.
Object.assign(Runtime, RuntimeEventNames);

export default Runtime;
