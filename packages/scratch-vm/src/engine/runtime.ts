import {EventEmitter} from 'events';
import uuid from 'uuid';
import type {ScratchStorage} from '@scratch/scratch-storage';

import Blocks from './blocks';
import Profiler from './profiler';
import Sequencer from './sequencer';
import type Target from './target';
import type Thread from './thread';
import GlowFeedback from './runtime/glow-feedback';
import MonitorHandler from './runtime/monitor-handler';
import PeripheralHandler from './runtime/peripheral-handler';
import RuntimeEventNames from './runtime/event-names';
import type {RuntimeEvents} from './runtime/runtime-events';
import type {MenuInfo} from '../extensions/extension';

import Clock from '../io/input/clock';
import Keyboard from '../io/hid/keyboard';
import Mouse from '../io/hid/mouse';
import MouseWheel from '../io/hid/mouse-wheel';
import UserData from '../io/input/user-data';

import scratch3Control from '../blocks/scratch3_control';
import scratch3Data from '../blocks/scratch3_data';
import scratch3Event from '../blocks/scratch3_event';
import scratch3Operators from '../blocks/scratch3_operators';
import scratch3Procedures from '../blocks/scratch3_procedures';
import scratch3Sensing from '../blocks/scratch3_sensing';

export type BlockFunction = (args: Record<string, unknown>, util: unknown) => unknown;

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

type BlockPackageClass = new (runtime: Runtime) => BlockPackage;

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

const defaultBlockPackages: Record<string, BlockPackageClass> = {
    scratch3_control: scratch3Control,
    scratch3_event: scratch3Event,
    scratch3_operators: scratch3Operators,
    scratch3_sensing: scratch3Sensing,
    scratch3_data: scratch3Data,
    scratch3_procedures: scratch3Procedures
};

class Runtime extends EventEmitter<RuntimeEvents> {
    static readonly THREAD_STEP_INTERVAL = 1000 / 60;
    static readonly THREAD_STEP_INTERVAL_COMPATIBILITY = 1000 / 30;

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
        super();
        this.sequencer = new Sequencer(this);
        this.flyoutBlocks = new Blocks(this, true /* force no glow */);
        this.monitorBlocks = new Blocks(this, true /* force no glow */);
        this.glows = new GlowFeedback(this);
        this.monitors = new MonitorHandler(this);
        this.updateCurrentMSecs();
        this._registerBlockPackages();
        this.ioDevices = {
            clock: new Clock(this),
            keyboard: new Keyboard(this),
            mouse: new Mouse(this),
            mouseWheel: new MouseWheel(this),
            userData: new UserData()
        };
        this.resetRunId();
    }

    /** Collects primitives, hat metadata and monitored opcodes from the built-in block packages. */
    _registerBlockPackages () {
        for (const PackageClass of Object.values(defaultBlockPackages)) {
            const blockPackage = new PackageClass(this);
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
