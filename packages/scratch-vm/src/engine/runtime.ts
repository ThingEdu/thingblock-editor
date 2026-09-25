import {EventEmitter} from 'events';
import {v1 as uuidv1} from 'uuid';
import type {ScratchStorage} from '@scratch/scratch-storage';

import Blocks from './blocks';
import {getScripts, type RuntimeScriptCache} from './blocks-runtime-cache';
import execute from './execute';
import MonitorRecord from './monitor-record';
import Profiler from './profiler';
import Sequencer from './sequencer';
import type Target from './target';
import Thread from './thread';
import Variable, {type VariableType} from './variable';
import GlowFeedback from './runtime/glow-feedback';
import WorkspaceListener from './runtime/workspace-listener';
import MonitorHandler, {type Monitor} from './runtime/runtime-monitor';
import PeripheralHandler from './runtime/runtime-peripheral';
import {RuntimeEventNames, type RuntimeEvents} from './runtime/runtime-events';
import type {ExtensionInfo, MenuInfo} from '../extensions/extension';
import {
    getBlocksJSON,
    getBlocksXML,
    getLabelForOpcode,
    refreshExtensionPrimitives,
    registerExtensionPrimitives
} from './runtime/extension-registry';
import type {ConvertedBlockInfo, ConvertedMenu, CustomFieldInfo} from './runtime/extension-block-converter';
import type {PeripheralExtension} from './runtime/runtime-peripheral';
import TargetType from '../extension-support/target-type';
import {setFetch} from '../util/fetch-with-timeout';

import Clock from '../io/input/clock';
import Keyboard from '../io/hid/keyboard';
import Mouse from '../io/hid/mouse';
import MouseWheel from '../io/hid/mouse-wheel';
import UserData from '../io/input/user-data';
import getMonitorIdForBlockWithArgs from '../util/get-monitor-id';
import StringUtil from '../util/string-util';
import uid from '../util/uid';

import Scratch3ControlBlocks from '../blocks/scratch3_control';
import Scratch3DataBlocks from '../blocks/scratch3_data';
import Scratch3EventBlocks from '../blocks/scratch3_event';
import Scratch3OperatorsBlocks from '../blocks/scratch3_operators';
import Scratch3ProcedureBlocks from '../blocks/scratch3_procedures';
import Scratch3SensingBlocks from '../blocks/scratch3_sensing';
import type BlockUtility from './block-utility';
import type {Block} from './block-types';

let stepProfilerId = -1;
let stepThreadsProfilerId = -1;

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

/** An extension's palette category, as the runtime registers it. */
export interface CategoryInfo {
    id: string
    name: string
    showStatusButton?: boolean
    blockIconURI?: string
    menuIconURI?: string
    color1: string
    color2: string
    color3: string
    blocks: ConvertedBlockInfo[]
    customFieldTypes: Record<string, CustomFieldInfo>
    menus: ConvertedMenu[]
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
    /** Applies the editor's Blockly events. */
    workspaceListener: WorkspaceListener;
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
    /** A clock reading `currentMSecs`, for timers that must only advance between steps. */
    stepClock = {now: () => this.currentMSecs};
    /** Makes the sequencer yield after each thread; reset every step. */
    redrawRequested = false;

    profiler: Profiler | null = null;
    /** Where the project came from outside the Scratch community, e.g. CSFirst. */
    origin: string | null = null;
    storage?: ScratchStorage;
    audioEngine?: unknown;
    /** The selected device and its peripherals, saved with the project; null without a board. */
    board: {device: string, peripherals: string[]} | null = null;

    constructor () {
        this.sequencer = new Sequencer(this);
        this.flyoutBlocks = new Blocks(this.events, true /* force no glow */);
        this.monitorBlocks = new Blocks(this.events, true /* force no glow */);
        this.glows = new GlowFeedback(this);
        this.workspaceListener = new WorkspaceListener(this);
        this.monitors = new MonitorHandler(this.events);
        this.updateCurrentMSecs();
        this._registerBlockPackages();
        this.ioDevices = {
            clock: new Clock(this.stepClock),
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
        this.storage.scratchFetch.setMetadata(this.storage.scratchFetch.RequestMetadata.RunId, uuidv1());
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
            // A hat whose predicate failed retired its thread, which has no next block
            if (thread.status !== Thread.STATUS_DONE) {
                thread.goToNextBlock();
            }
        }
        return newThreads;
    }

    getTargetById (targetId: string): Target | undefined {
        return this.targets.find(target => target.id === targetId);
    }

    getTargetForStage (): Target | undefined {
        return this.targets.find(target => target.isStage);
    }

    getEditingTarget (): Target | null {
        return this._editingTarget;
    }

    /** Adds a target last in the target list and first in execution; callers then set its execution position. */
    addTarget (target: Target) {
        this.targets.push(target);
        this.executableTargets.push(target);
    }

    /**
     * Moves a target `delta` places in execution order; positive runs it earlier. The stage stays at the end.
     * Returns the new position.
     */
    moveExecutable (executableTarget: Target, delta: number): number {
        const oldIndex = this.executableTargets.indexOf(executableTarget);
        this.executableTargets.splice(oldIndex, 1);
        let newIndex = Math.min(oldIndex + delta, this.executableTargets.length);
        if (newIndex <= 0) {
            newIndex = this.executableTargets[0]?.isStage ? 1 : 0;
        }
        this.executableTargets.splice(newIndex, 0, executableTarget);
        return newIndex;
    }

    /** Sets a target's execution position; Infinity runs it first, 0 last before the stage. */
    setExecutablePosition (executableTarget: Target, newIndex: number): number {
        const oldIndex = this.executableTargets.indexOf(executableTarget);
        return this.moveExecutable(executableTarget, newIndex - oldIndex);
    }

    removeExecutable (executableTarget: Target) {
        const oldIndex = this.executableTargets.indexOf(executableTarget);
        if (oldIndex > -1) {
            this.executableTargets.splice(oldIndex, 1);
        }
    }

    disposeTarget (disposingTarget: Target) {
        if (!this.targets.includes(disposingTarget)) return;
        this.targets = this.targets.filter(target => target !== disposingTarget);
        disposingTarget.dispose();
    }

    /** Disposes all targets and their monitors, returning to a clean state. */
    dispose () {
        this.stopAll();
        for (const target of this.targets) {
            target.deleteMonitors();
        }
        for (const target of [...this.targets]) {
            this.disposeTarget(target);
        }
        this.monitors.reset();
        this.events.emit(RuntimeEventNames.RUNTIME_DISPOSED);
        this.ioDevices.clock.resetProjectTimer();
    }

    fireTargetWasCreated (newTarget: Target, sourceTarget?: Target) {
        this.events.emit(RuntimeEventNames.targetWasCreated, newTarget, sourceTarget);
    }

    fireTargetWasRemoved (target: Target) {
        this.events.emit(RuntimeEventNames.targetWasRemoved, target);
    }

    /** Names of every variable of `varType`, on all targets. */
    getAllVarNamesOfType (varType: VariableType): string[] {
        return this.targets.flatMap(target => target.getAllVariableNamesInScopeByType(varType, true));
    }

    /** Creates a global variable, renaming it if the name is taken. */
    createNewGlobalVariable (
        variableName: string, optVarId?: string, optVarType: VariableType = Variable.SCALAR_TYPE
    ): Variable {
        const newName = StringUtil.unusedName(variableName, this.getAllVarNamesOfType(optVarType));
        const variable = new Variable(optVarId || uid(), newName, optVarType);
        const stage = this.getTargetForStage();
        if (!stage) {
            throw new Error(`createNewGlobalVariable: no stage to hold global variable ${newName}`);
        }
        stage.variables[variable.id] = variable;
        return variable;
    }

    handleProjectLoaded () {
        this.events.emit(RuntimeEventNames.PROJECT_LOADED);
        this.resetRunId();
    }

    /** Reports a change that affects the saved project. */
    emitProjectChanged () {
        this.events.emit(RuntimeEventNames.PROJECT_CHANGED);
    }

    /** Makes the sequencer yield after the current thread, pacing work that should be visible per frame. */
    requestRedraw () {
        this.redrawRequested = true;
    }

    /** Adds the monitor, or merges its defined fields into the existing one with the same id. */
    requestAddMonitor (monitor: Monitor) {
        this.monitors.add(monitor);
    }

    /** Merges the defined fields into the existing monitor; false if no monitor has that id. */
    requestUpdateMonitor (monitor: Monitor): boolean {
        return this.monitors.update(monitor);
    }

    requestRemoveMonitor (monitorId: string) {
        this.monitors.remove(monitorId);
    }

    requestHideMonitor (monitorId: string): boolean {
        return this.monitors.hide(monitorId);
    }

    requestShowMonitor (monitorId: string): boolean {
        return this.monitors.show(monitorId);
    }

    requestRemoveMonitorByTargetId (targetId: string) {
        this.monitors.removeByTargetId(targetId);
    }

    /** Shows or hides the monitor of a monitor block, as the flyout checkbox and "show variable" do. */
    setBlockMonitored (blockId: string, isMonitored: boolean) {
        let block = this.monitorBlocks.getBlock(blockId);
        if (!block) return;

        // A reporter with arguments gets one monitor block per argument combination, keyed off its flyout id
        if (Object.keys(block.fields).length > 0 &&
            block.opcode !== 'data_variable' && block.opcode !== 'data_listcontents') {
            const monitorId = getMonitorIdForBlockWithArgs(block.id, block.fields);
            let monitorBlock = this.monitorBlocks.getBlock(monitorId);
            if (!monitorBlock) {
                monitorBlock = {...structuredClone(block), id: monitorId};
                this.monitorBlocks.createBlock(monitorBlock);
            }
            block = monitorBlock;
        }

        const wasMonitored = block.isMonitored;
        block.isMonitored = isMonitored;

        // A variable monitor is sprite-specific when the variable is local to a sprite
        let isLocalVariable = false;
        if (block.opcode === 'data_variable') {
            isLocalVariable = !this.getTargetForStage().variables[block.fields.VARIABLE.id];
        } else if (block.opcode === 'data_listcontents') {
            isLocalVariable = !this.getTargetForStage().variables[block.fields.LIST.id];
        }
        if (isLocalVariable || this.monitorBlockInfo[block.opcode]?.isSpriteSpecific) {
            // Monitors can't be created at runtime, so a new one belongs to the editing target
            block.targetId = block.targetId || this.getEditingTarget().id;
        } else {
            block.targetId = null;
        }

        if (wasMonitored && !block.isMonitored) {
            this.requestHideMonitor(block.id);
        } else if (!wasMonitored && block.isMonitored && !this.requestShowMonitor(block.id)) {
            this.requestAddMonitor(MonitorRecord({
                id: block.id,
                targetId: block.targetId,
                spriteName: block.targetId ? this.getTargetById(block.targetId).getName() : null,
                opcode: block.opcode,
                params: this.monitorBlocks.getBlockParams(block),
                value: '',
                mode: block.opcode === 'data_listcontents' ? 'list' : 'default'
            }));
        }
        this.monitorBlocks.resetCache();
    }

    getMonitorState () {
        return this.monitors.getState();
    }

    /** Arguments for an extension's target-specific messages: the type of `target`, or of the editing target. */
    makeMessageContextForTarget (target?: Target | null): {targetType?: string} {
        const context: {targetType?: string} = {};
        const contextTarget = target || this.getEditingTarget() || this.getTargetForStage();
        if (contextTarget) {
            context.targetType = contextTarget.isStage ? TargetType.STAGE : TargetType.SPRITE;
        }
        return context;
    }

    _registerExtensionPrimitives (extensionInfo: ExtensionInfo) {
        registerExtensionPrimitives(this, extensionInfo);
    }

    /** Re-registers an extension from new `getInfo()` results. */
    _refreshExtensionPrimitives (extensionInfo: ExtensionInfo) {
        refreshExtensionPrimitives(this, extensionInfo);
    }

    /** Each extension category's palette XML; `target` filters out blocks not meant for it. */
    getBlocksXML (target?: Target | null) {
        return getBlocksXML(this, target);
    }

    getBlocksJSON () {
        return getBlocksJSON(this);
    }

    /** The monitor label for an extension opcode; undefined for unknown ones. */
    getLabelForOpcode (extendedOpcode: string) {
        return getLabelForOpcode(this, extendedOpcode);
    }

    registerPeripheralExtension (extensionId: string, extension: PeripheralExtension) {
        this.peripherals.register(extensionId, extension);
    }

    scanForPeripheral (extensionId: string) {
        this.peripherals.scan(extensionId);
    }

    connectPeripheral (extensionId: string, peripheralId: string) {
        this.peripherals.connect(extensionId, peripheralId);
    }

    disconnectPeripheral (extensionId: string) {
        this.peripherals.disconnect(extensionId);
    }

    getPeripheralIsConnected (extensionId: string): boolean {
        return this.peripherals.isConnected(extensionId);
    }

    /** Reports whether the microphone is streaming audio. */
    emitMicListening (listening: boolean) {
        this.events.emit(RuntimeEventNames.MIC_LISTENING, listening);
    }

    /** Reports whether an extension is loading data it needs. */
    emitExtensionLoading (loading: boolean) {
        this.events.emit(RuntimeEventNames.EXTENSION_DATA_LOADING, loading);
    }

    attachAudioEngine (audioEngine: unknown) {
        this.audioEngine = audioEngine;
    }

    /** Uses `storage` for assets, and its fetch for the network requests extensions make. */
    attachStorage (storage: ScratchStorage) {
        this.storage = storage;
        setFetch(storage.scratchFetch.scratchFetch);
        this.resetRunId();
    }

    getOpcodeFunction (opcode: string): BlockFunction | undefined {
        return this._primitives[opcode];
    }

    /** Calls `f` for each script's top block, in execution order (`executableTargets` is stored reversed). */
    allScriptsDo (f: (topBlockId: string, target: Target) => void, optTarget?: Target) {
        const targets = optTarget ? [optTarget] : this.executableTargets;
        for (let t = targets.length - 1; t >= 0; t--) {
            for (const topBlockId of targets[t].blocks.getScripts()) {
                f(topBlockId, targets[t]);
            }
        }
    }

    isActiveThread (thread: Thread): boolean {
        return thread.stack.length > 0 && thread.status !== Thread.STATUS_DONE && this.threads.includes(thread);
    }

    /** The thread waits on a promise or the next tick, or is not running. */
    isWaitingThread (thread: Thread): boolean {
        return thread.status === Thread.STATUS_PROMISE_WAIT ||
            thread.status === Thread.STATUS_YIELD_TICK ||
            !this.isActiveThread(thread);
    }

    /** Stops the script if it is running, else starts it; `target` defaults to the editing target. */
    toggleScript (
        topBlockId: string,
        {target = this._editingTarget, stackClick = false}: {target?: Target, stackClick?: boolean} = {}
    ) {
        for (const thread of this.threads) {
            if (thread.topBlock !== topBlockId || thread.status === Thread.STATUS_DONE) continue;
            const opcode = target.blocks.getOpcode(target.blocks.getBlock(topBlockId));
            // A clicked edge-activated hat runs alongside the thread that checks it every step
            if (this.getIsEdgeActivatedHat(opcode) && thread.stackClick !== stackClick) continue;
            this._stopThread(thread);
            return;
        }
        this._pushThread(topBlockId, target, {stackClick});
    }

    /** Queues a monitor block's script, unless it is already running, to update the monitor when it finishes. */
    addMonitorScript (topBlockId: string, optTarget?: Target | null) {
        const alreadyRunning = this.threads.some(thread =>
            thread.topBlock === topBlockId && thread.status !== Thread.STATUS_DONE && thread.updateMonitor);
        if (alreadyRunning) return;
        this._pushThread(topBlockId, optTarget || this._editingTarget, {updateMonitor: true});
    }

    /** Stops the target's threads, except `optThreadException`, e.g. "stop other scripts in sprite". */
    stopForTarget (target: Target, optThreadException?: Thread) {
        // Lets blocks clean up state they keep for the target
        this.events.emit(RuntimeEventNames.STOP_FOR_TARGET, target, optThreadException);
        for (const thread of this.threads) {
            if (thread !== optThreadException && thread.target === target) {
                this._stopThread(thread);
            }
        }
    }

    greenFlag () {
        this.stopAll();
        this.events.emit(RuntimeEventNames.PROJECT_START);
        this.ioDevices.clock.resetProjectTimer();
        for (const target of this.targets) {
            target.clearEdgeActivatedValues();
        }
        for (const target of this.targets) {
            target.onGreenFlag();
        }
        this.startHats('event_whenflagclicked');
    }

    stopAll () {
        // Lets blocks clean up their state
        this.events.emit(RuntimeEventNames.PROJECT_STOP_ALL);
        for (const target of this.targets) {
            target.onStopAll();
        }
        if (this.sequencer.activeThread !== null) {
            this._stopThread(this.sequencer.activeThread);
        }
        this.threads = [];
        this.resetRunId();
    }

    /** One tick: start edge-activated hats and monitors, step the threads, then publish glows and state. */
    _step () {
        if (this.profiler !== null) {
            if (stepProfilerId === -1) {
                stepProfilerId = this.profiler.idByName('Runtime._step');
            }
            this.profiler.start(stepProfilerId);
        }

        // Threads stopped since the last step
        this.threads = this.threads.filter(thread => !thread.isKilled);

        for (const [opcode, hat] of Object.entries(this._hats)) {
            if (hat.edgeActivated) {
                this.startHats(opcode);
            }
        }
        this.redrawRequested = false;
        this._pushMonitors();
        if (this.profiler !== null) {
            if (stepThreadsProfilerId === -1) {
                stepThreadsProfilerId = this.profiler.idByName('Sequencer.stepThreads');
            }
            this.profiler.start(stepThreadsProfilerId);
        }
        const doneThreads = this.sequencer.stepThreads();
        if (this.profiler !== null) {
            this.profiler.stop();
        }
        this.glows.update(doneThreads);
        // Count threads that finished this step, so a script that ran within one step still reports running
        const allThreads = [...this.threads, ...doneThreads];
        this._emitProjectRunStatus(allThreads.length - this._getMonitorThreadCount(allThreads));
        this._lastStepDoneThreads = doneThreads;

        if (this._refreshTargets) {
            this.events.emit(RuntimeEventNames.TARGETS_UPDATE, false /* don't emit project changed */);
            this._refreshTargets = false;
        }

        this.monitors.emitIfChanged();

        if (this.profiler !== null) {
            this.profiler.stop();
            this.profiler.reportFrames();
        }
    }

    /** Monitor threads update monitors and don't count as a running project. */
    _getMonitorThreadCount (threads: Thread[]): number {
        return threads.filter(thread => thread.updateMonitor).length;
    }

    /** Queues the scripts of all shown monitors. */
    _pushMonitors () {
        for (const {blockId, targetId} of this.monitorBlocks.getMonitoredBlocks()) {
            this.addMonitorScript(blockId, targetId ? this.getTargetById(targetId) : null);
        }
    }

    /** Emits run start/stop when the count of running non-monitor threads moves between zero and non-zero. */
    _emitProjectRunStatus (nonMonitorThreadCount: number) {
        if (this._nonMonitorThreadCount === 0 && nonMonitorThreadCount > 0) {
            this.events.emit(RuntimeEventNames.PROJECT_RUN_START);
        }
        if (this._nonMonitorThreadCount > 0 && nonMonitorThreadCount === 0) {
            this.events.emit(RuntimeEventNames.PROJECT_RUN_STOP);
        }
        this._nonMonitorThreadCount = nonMonitorThreadCount;
    }

    setEditingTarget (editingTarget: Target) {
        const oldEditingTarget = this._editingTarget;
        this._editingTarget = editingTarget;
        // Glows belong to the previous target's workspace
        this.glows.clear();
        this.glows.update();
        if (oldEditingTarget !== this._editingTarget) {
            this.requestToolboxExtensionsUpdate();
        }
    }

    /** Switches between 30 TPS (compatibility) and 60 TPS, restarting the step loop if it runs. */
    setCompatibilityMode (compatibilityModeOn: boolean) {
        this.compatibilityMode = compatibilityModeOn;
        if (this._steppingInterval) {
            clearInterval(this._steppingInterval);
            this._steppingInterval = null;
            this.start();
        }
    }

    /** Stops glow events about a script, e.g. one just deleted whose glow is still tracked. */
    quietGlow (scriptBlockId: string) {
        this.glows.quiet(scriptBlockId);
    }

    glowBlock (blockId: string, isGlowing: boolean) {
        this.events.emit(
            isGlowing ? RuntimeEventNames.BLOCK_GLOW_ON : RuntimeEventNames.BLOCK_GLOW_OFF,
            {id: blockId}
        );
    }

    glowScript (topBlockId: string, isGlowing: boolean) {
        this.events.emit(
            isGlowing ? RuntimeEventNames.SCRIPT_GLOW_ON : RuntimeEventNames.SCRIPT_GLOW_OFF,
            {id: topBlockId}
        );
    }

    /** Shows a reporter's value in a bubble on its block. */
    visualReport (blockId: string, value: unknown) {
        this.events.emit(RuntimeEventNames.VISUAL_REPORT, {id: blockId, value: String(value)});
    }

    /** Emits a targets update at the end of the step. */
    requestTargetsUpdate () {
        this._refreshTargets = true;
    }

    /** Asks the GUI to reload the workspace blocks. */
    requestBlocksUpdate () {
        this.events.emit(RuntimeEventNames.BLOCKS_NEED_UPDATE);
    }

    /** Reports whether dragged blocks are over the GUI, outside the blocks workspace. */
    emitBlockDragUpdate (areBlocksOverGui: boolean) {
        this.events.emit(RuntimeEventNames.BLOCK_DRAG_UPDATE, areBlocksOverGui);
    }

    /** Reports blocks dropped on the GUI; `topBlockId` is the dragged stack's original top block. */
    emitBlockEndDrag (blocks: Block[], topBlockId: string) {
        this.events.emit(RuntimeEventNames.BLOCK_DRAG_END, blocks, topBlockId);
    }

    requestToolboxExtensionsUpdate () {
        this.events.emit(RuntimeEventNames.TOOLBOX_EXTENSIONS_NEED_UPDATE);
    }

    /** Starts stepping on an interval; does nothing if already running. */
    start () {
        if (this._steppingInterval) return;
        const interval = this.compatibilityMode ?
            Runtime.THREAD_STEP_INTERVAL_COMPATIBILITY :
            Runtime.THREAD_STEP_INTERVAL;
        this.currentStepTime = interval;
        this._steppingInterval = setInterval(() => {
            this._step();
        }, interval);
        this.events.emit(RuntimeEventNames.RUNTIME_STARTED);
    }

    /** Clears the step interval so the process can exit; for test shutdown, the runtime is unusable after. */
    quit () {
        clearInterval(this._steppingInterval);
        this._steppingInterval = null;
    }

    /** Turns on profiling where the browser supports it; `onFrame` receives each profiled frame. */
    enableProfiling (onFrame: ConstructorParameters<typeof Profiler>[0]) {
        if (Profiler.available()) {
            this.profiler = new Profiler(onFrame);
        }
    }

    disableProfiling () {
        this.profiler = null;
    }

    /** Collects primitives, hat metadata and monitored opcodes from the built-in block packages. */
    private _registerBlockPackages () {
        const blockPackages: BlockPackage[] = [
            new Scratch3ControlBlocks(this.events, this),
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

    /** Stops a thread now; the next step removes it from `threads`. */
    _stopThread (thread: Thread) {
        thread.isKilled = true;
        this.sequencer.retireThread(thread);
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

export default Runtime;
