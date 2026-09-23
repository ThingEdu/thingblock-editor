import {EventEmitter} from 'events';
import uuid from 'uuid';
import type {ScratchStorage} from '@scratch/scratch-storage';

import Blocks from './blocks';
import Profiler from './profiler';
import Sequencer from './sequencer';
import type Target from './target';
import type Thread from './thread';
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
        this.flyoutBlocks = new Blocks(this, true /* force no glow */);
        this.monitorBlocks = new Blocks(this, true /* force no glow */);
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

    /** Collects primitives, hat metadata and monitored opcodes from the built-in block packages. */
    _registerBlockPackages () {
        const blockPackages: BlockPackage[] = [
            new Scratch3ControlBlocks(this),
            new Scratch3EventBlocks(this),
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

    /** Tags storage requests with a fresh run id; called whenever the project starts, stops or changes. */
    resetRunId () {
        if (!this.storage) return;
        this.storage.scratchFetch.setMetadata(this.storage.scratchFetch.RequestMetadata.RunId, uuid.v1());
    }

    updateCurrentMSecs () {
        this.currentMSecs = Date.now();
    }
}

// JS callers read event names as statics (`Runtime.PROJECT_START`); TS code imports `RuntimeEventNames`.
Object.assign(Runtime, RuntimeEventNames);

export default Runtime;
