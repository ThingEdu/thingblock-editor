const EventEmitter = require('events');
const uuid = require('uuid');

const Blocks = require('../blocks');
const BlocksRuntimeCache = require('../blocks-runtime-cache');
const Profiler = require('../profiler');
const RuntimeEventNames = require('./event-names');
const Sequencer = require('../sequencer');
const execute = require('../execute.js');
const {
    registerExtensionPrimitives,
    refreshExtensionPrimitives,
    getBlocksXML,
    getBlocksJSON,
    getLabelForOpcode
} = require('./extension-registry');
const TargetType = require('../../extension-support/target-type');
const Thread = require('../thread');
const Variable = require('../variable');
const GlowFeedback = require('./glow-feedback');
const MonitorHandler = require('./monitor-handler');
const PeripheralHandler = require('./peripheral-handler');
const fetchWithTimeout = require('../../util/fetch-with-timeout');

// Virtual I/O devices.
const Clock = require('../../io/clock');
const Keyboard = require('../../io/keyboard');
const Mouse = require('../../io/mouse');
const MouseWheel = require('../../io/mouseWheel');
const UserData = require('../../io/userData');

const StringUtil = require('../../util/string-util');
const uid = require('../../util/uid');

/**
 * @import {ScratchStorage} from '@scratch/scratch-storage'
 */

const defaultBlockPackages = {
    scratch3_control: require('../../blocks/scratch3_control'),
    scratch3_event: require('../../blocks/scratch3_event'),
    scratch3_operators: require('../../blocks/scratch3_operators'),
    scratch3_sensing: require('../../blocks/scratch3_sensing'),
    scratch3_data: require('../../blocks/scratch3_data'),
    scratch3_procedures: require('../../blocks/scratch3_procedures')
};

/**
 * Numeric ID for Runtime._step in Profiler instances.
 * @type {number}
 */
let stepProfilerId = -1;

/**
 * Numeric ID for Sequencer.stepThreads in Profiler instances.
 * @type {number}
 */
let stepThreadsProfilerId = -1;

/**
 * Manages targets, scripts, and the sequencer.
 * @class
 */
class Runtime extends EventEmitter {
    constructor () {
        super();

        /**
         * Target management and storage.
         * @type {Array.<!Target>}
         */
        this.targets = [];

        /**
         * Targets in reverse order of execution. Shares its order with drawables.
         * @type {Array.<!Target>}
         */
        this.executableTargets = [];

        /**
         * A list of threads that are currently running in the VM.
         * Threads are added when execution starts and pruned when execution ends.
         * @type {Array.<Thread>}
         */
        this.threads = [];

        /** @type {!Sequencer} */
        this.sequencer = new Sequencer(this);

        /**
         * Storage container for flyout blocks.
         * These will execute on `_editingTarget.`
         * @type {!Blocks}
         */
        this.flyoutBlocks = new Blocks(this, true /* force no glow */);

        /**
         * Storage container for monitor blocks.
         * These will execute on a target maybe
         * @type {!Blocks}
         */
        this.monitorBlocks = new Blocks(this, true /* force no glow */);

        /**
         * Currently known editing target for the VM.
         * @type {?Target}
         */
        this._editingTarget = null;

        /**
         * Map to look up a block primitive's implementation function by its opcode.
         * This is a two-step lookup: package name first, then primitive name.
         * @type {Object.<string, Function>}
         */
        this._primitives = {};

        /**
         * Map to look up all block information by extended opcode.
         * @type {Array.<CategoryInfo>}
         * @private
         */
        this._blockInfo = [];

        /**
         * Map to look up hat blocks' metadata.
         * Keys are opcode for hat, values are metadata objects.
         * @type {Object.<string, Object>}
         */
        this._hats = {};

        /**
         * Script glow feedback tracking and emission.
         * @type {GlowFeedback}
         */
        this.glows = new GlowFeedback(this);

        /**
         * Number of non-monitor threads running during the previous frame.
         * @type {number}
         */
        this._nonMonitorThreadCount = 0;

        /**
         * All threads that finished running and were removed from this.threads
         * by behaviour in Sequencer.stepThreads.
         * @type {Array<Thread>}
         */
        this._lastStepDoneThreads = null;

        /**
         * Flag to emit a targets update at the end of a step. When target data
         * changes, this flag is set to true.
         * @type {boolean}
         */
        this._refreshTargets = false;

        /**
         * Map to look up all monitor block information by opcode.
         * @type {object}
         * @private
         */
        this.monitorBlockInfo = {};

        /**
         * Monitor state and its per-step change publication.
         * @type {MonitorHandler}
         */
        this.monitors = new MonitorHandler(this);

        /**
         * Whether the project is in "turbo mode."
         * @type {boolean}
         */
        this.turboMode = false;

        /**
         * Whether the project is in "compatibility mode" (30 TPS).
         * @type {boolean}
         */
        this.compatibilityMode = false;

        /**
         * A reference to the current runtime stepping interval, set
         * by a `setInterval`.
         * @type {!number}
         */
        this._steppingInterval = null;

        /**
         * Current length of a step.
         * Changes as mode switches, and used by the sequencer to calculate
         * WORK_TIME.
         * @type {!number}
         */
        this.currentStepTime = null;

        // Set an intial value for this.currentMSecs
        this.updateCurrentMSecs();

        /**
         * Whether any primitive has requested a redraw.
         * Affects whether `Sequencer.stepThreads` will yield
         * after stepping each thread.
         * Reset on every frame.
         * @type {boolean}
         */
        this.redrawRequested = false;

        // Register all given block packages.
        this._registerBlockPackages();

        // Register and initialize "IO devices", containers for processing
        // I/O related data.
        /** @type {Object.<string, Object>} */
        this.ioDevices = {
            clock: new Clock(this),
            keyboard: new Keyboard(this),
            mouse: new Mouse(this),
            mouseWheel: new MouseWheel(this),
            userData: new UserData()
        };

        /**
         * Hardware peripheral registry and Scratch Link socket management.
         * @type {PeripheralHandler}
         */
        this.peripherals = new PeripheralHandler();

        /**
         * A runtime profiler that records timed events for later playback to
         * diagnose Scratch performance.
         * @type {Profiler}
         */
        this.profiler = null;

        /**
         * A string representing the origin of the current project from outside of the
         * Scratch community, such as CSFirst.
         * @type {?string}
         */
        this.origin = null;

        this.resetRunId();
    }

    /**
     * Width of the stage, in pixels.
     * @constant {number}
     */
    static get STAGE_WIDTH () {
        return 480;
    }

    /**
     * Height of the stage, in pixels.
     * @constant {number}
     */
    static get STAGE_HEIGHT () {
        return 360;
    }

    /**
     * How rapidly we try to step threads by default, in ms.
     */
    static get THREAD_STEP_INTERVAL () {
        return 1000 / 60;
    }

    /**
     * In compatibility mode, how rapidly we try to step threads, in ms.
     */
    static get THREAD_STEP_INTERVAL_COMPATIBILITY () {
        return 1000 / 30;
    }

    // -----------------------------------------------------------------------------
    // -----------------------------------------------------------------------------

    /**
     * Register default block packages with this runtime.
     * @todo Prefix opcodes with package name.
     * @private
     */
    _registerBlockPackages () {
        for (const packageName in defaultBlockPackages) {
            if (Object.prototype.hasOwnProperty.call(defaultBlockPackages, packageName)) {
                // @todo pass a different runtime depending on package privilege?
                const packageObject = new (defaultBlockPackages[packageName])(this);
                // Collect primitives from package.
                if (packageObject.getPrimitives) {
                    const packagePrimitives = packageObject.getPrimitives();
                    for (const op in packagePrimitives) {
                        if (Object.prototype.hasOwnProperty.call(packagePrimitives, op)) {
                            this._primitives[op] =
                                packagePrimitives[op].bind(packageObject);
                        }
                    }
                }
                // Collect hat metadata from package.
                if (packageObject.getHats) {
                    const packageHats = packageObject.getHats();
                    for (const hatName in packageHats) {
                        if (Object.prototype.hasOwnProperty.call(packageHats, hatName)) {
                            this._hats[hatName] = packageHats[hatName];
                        }
                    }
                }
                // Collect monitored from package.
                if (packageObject.getMonitored) {
                    this.monitorBlockInfo = Object.assign({}, this.monitorBlockInfo, packageObject.getMonitored());
                }
            }
        }
    }

    getMonitorState () {
        return this.monitors.getState();
    }

    /**
     * Create a context ("args") object for use with `formatMessage` on messages which might be target-specific.
     * @param {Target} [target] - the target to use as context. If a target is not provided, default to the current
     * editing target or the stage.
     */
    makeMessageContextForTarget (target) {
        const context = {};
        target = target || this.getEditingTarget() || this.getTargetForStage();
        if (target) {
            context.targetType = (target.isStage ? TargetType.STAGE : TargetType.SPRITE);
        }
    }

    /**
     * Register the primitives provided by an extension.
     * @param {ExtensionMetadata} extensionInfo - information about the extension (id, blocks, etc.)
     * @private
     */
    _registerExtensionPrimitives (extensionInfo) {
        registerExtensionPrimitives(this, extensionInfo);
    }

    /**
     * Reregister the primitives for an extension
     * @param  {ExtensionMetadata} extensionInfo - new info (results of running getInfo) for an extension
     * @private
     */
    _refreshExtensionPrimitives (extensionInfo) {
        refreshExtensionPrimitives(this, extensionInfo);
    }

    /**
     * @returns {Array.<object>} scratch-blocks XML for each category of extension blocks, in category order.
     * @param {?Target} [target] - the active editing target (optional)
     * @property {string} id - the category / extension ID
     * @property {string} xml - the XML text for this category, starting with `<category>` and ending with `</category>`
     */
    getBlocksXML (target) {
        return getBlocksXML(this, target);
    }

    /**
     * @returns {Array.<string>} - an array containing the scratch-blocks JSON information for each dynamic block.
     */
    getBlocksJSON () {
        return getBlocksJSON(this);
    }

    /**
     * Register an extension that communicates with a hardware peripheral by id,
     * to have access to it and its peripheral functions in the future.
     * @param {string} extensionId - the id of the extension.
     * @param {object} extension - the extension to register.
     */
    registerPeripheralExtension (extensionId, extension) {
        this.peripherals.register(extensionId, extension);
    }

    /**
     * Tell the specified extension to scan for a peripheral.
     * @param {string} extensionId - the id of the extension.
     */
    scanForPeripheral (extensionId) {
        this.peripherals.scan(extensionId);
    }

    /**
     * Connect to the extension's specified peripheral.
     * @param {string} extensionId - the id of the extension.
     * @param {number} peripheralId - the id of the peripheral.
     */
    connectPeripheral (extensionId, peripheralId) {
        this.peripherals.connect(extensionId, peripheralId);
    }

    /**
     * Disconnect from the extension's connected peripheral.
     * @param {string} extensionId - the id of the extension.
     */
    disconnectPeripheral (extensionId) {
        this.peripherals.disconnect(extensionId);
    }

    /**
     * Returns whether the extension has a currently connected peripheral.
     * @param {string} extensionId - the id of the extension.
     * @returns {boolean} - whether the extension has a connected peripheral.
     */
    getPeripheralIsConnected (extensionId) {
        return this.peripherals.isConnected(extensionId);
    }

    /**
     * Emit an event to indicate that the microphone is being used to stream audio.
     * @param {boolean} listening - true if the microphone is currently listening.
     */
    emitMicListening (listening) {
        this.emit(Runtime.MIC_LISTENING, listening);
    }

    emitExtensionLoading (loading) {
        this.emit(Runtime.EXTENSION_DATA_LOADING, loading);
    }

    /**
     * Retrieve the function associated with the given opcode.
     * @param {!string} opcode The opcode to look up.
     * @returns {Function} The function which implements the opcode.
     */
    getOpcodeFunction (opcode) {
        return this._primitives[opcode];
    }

    /**
     * Return whether an opcode represents a hat block.
     * @param {!string} opcode The opcode to look up.
     * @returns {boolean} True if the op is known to be a hat.
     */
    getIsHat (opcode) {
        return Object.prototype.hasOwnProperty.call(this._hats, opcode);
    }

    /**
     * Return whether an opcode represents an edge-activated hat block.
     * @param {!string} opcode The opcode to look up.
     * @returns {boolean} True if the op is known to be a edge-activated hat.
     */
    getIsEdgeActivatedHat (opcode) {
        return Object.prototype.hasOwnProperty.call(this._hats, opcode) &&
            this._hats[opcode].edgeActivated;
    }


    /**
     * Attach the audio engine
     * @param {!AudioEngine} audioEngine The audio engine to attach
     */
    attachAudioEngine (audioEngine) {
        this.audioEngine = audioEngine;
    }

    /**
     * Attach the storage module
     * @param {!ScratchStorage} storage The storage module to attach
     */
    attachStorage (storage) {
        this.storage = storage;
        fetchWithTimeout.setFetch(storage.scratchFetch.scratchFetch);
        this.resetRunId();

        // How many seconds should an action "cost" after we've exhausted the burst allowance?
        // Setting this too high makes the extension frustrating to use, but setting it too low costs us real money.
        // We should tune this over time based on user feedback and our budget.
        const secondsPerAction = 4;

        const productionDomains = ['scratch.mit.edu', 'scratch.org'];
        const isProductionHost = typeof window !== 'undefined' &&
            productionDomains.some(d =>
                window.location.hostname === d || window.location.hostname.endsWith(`.${d}`)
            );

        /** @type {Parameters<typeof storage.scratchFetch.createQueue>[1]} */
        // To override on staging, set `window._scratchExtensionServiceQueueOptions` in the browser console
        // before the VM initializes (e.g. in a DevTools snippet that runs before page load), then reload.
        // Example: window._scratchExtensionServiceQueueOptions = { burstLimit: 10, sustainRate: 1 }
        // This override is ignored on production hosts.
        // Note to folks who run into this in the wild: this is very temporary! Please don't rely on this in, say,
        // an extension that implements add-ons for Scratch. Just for example. Anyway... we're trying to tune these
        // numbers to find a good balance between user experience and our monetary costs. My first attempt was
        // definitely too low; sorry! Once we're done tuning, we'll probably remove this override.
        const extensionServiceQueueOptions = {
            burstLimit: 3, // How many actions can be sent in a short time if we haven't done any for a while?
            concurrency: 1, // Number of concurrent connections to the service
            queueCostLimit: 10, // Don't queue more actions than can finish before the `fetchWithTimeout` timeout.
            sustainRate: 1 / secondsPerAction, // See `secondsPerAction` above.
            ...(!isProductionHost && typeof window !== 'undefined' && window._scratchExtensionServiceQueueOptions)
        };

        /** @todo The extensions should probably specify their own queue options (within existing limits) */
        ['scratch.mit.edu', 'scratch.org'].forEach(scratchDomain => {
            ['synthesis-service', 'translate-service'].forEach(service => {
                storage.scratchFetch.createQueue(`${service}.${scratchDomain}`, extensionServiceQueueOptions);
            });
        });
    }

    // -----------------------------------------------------------------------------
    // -----------------------------------------------------------------------------

    /**
     * Create a thread and push it to the list of threads.
     * @param {!string} id ID of block that starts the stack.
     * @param {!Target} target Target to run thread on.
     * @param {?object} opts optional arguments
     * @param {?boolean} opts.stackClick true if the script was activated by clicking on the stack
     * @param {?boolean} opts.updateMonitor true if the script should update a monitor value
     * @returns {!Thread} The newly created thread.
     */
    _pushThread (id, target, opts) {
        const thread = new Thread(id);
        thread.target = target;
        thread.stackClick = Boolean(opts && opts.stackClick);
        thread.updateMonitor = Boolean(opts && opts.updateMonitor);
        thread.blockContainer = thread.updateMonitor ?
            this.monitorBlocks :
            target.blocks;

        thread.pushStack(id);
        this.threads.push(thread);
        return thread;
    }

    /**
     * Stop a thread: stop running it immediately, and remove it from the thread list later.
     * @param {!Thread} thread Thread object to remove from actives
     */
    _stopThread (thread) {
        // Mark the thread for later removal
        thread.isKilled = true;
        // Inform sequencer to stop executing that thread.
        this.sequencer.retireThread(thread);
    }

    /**
     * Restart a thread in place, maintaining its position in the list of threads.
     * This is used by `startHats` to and is necessary to ensure 2.0-like execution order.
     * Test project: https://scratch.mit.edu/projects/130183108/
     * @param {!Thread} thread Thread object to restart.
     * @returns {Thread} The restarted thread.
     */
    _restartThread (thread) {
        const newThread = new Thread(thread.topBlock);
        newThread.target = thread.target;
        newThread.stackClick = thread.stackClick;
        newThread.updateMonitor = thread.updateMonitor;
        newThread.blockContainer = thread.blockContainer;
        newThread.pushStack(thread.topBlock);
        const i = this.threads.indexOf(thread);
        if (i > -1) {
            this.threads[i] = newThread;
            return newThread;
        }
        this.threads.push(thread);
        return thread;
    }

    /**
     * Return whether a thread is currently active/running.
     * @param {?Thread} thread Thread object to check.
     * @returns {boolean} True if the thread is active/running.
     */
    isActiveThread (thread) {
        return (
            (
                thread.stack.length > 0 &&
                thread.status !== Thread.STATUS_DONE) &&
            this.threads.indexOf(thread) > -1);
    }

    /**
     * Return whether a thread is waiting for more information or done.
     * @param {?Thread} thread Thread object to check.
     * @returns {boolean} True if the thread is waiting
     */
    isWaitingThread (thread) {
        return (
            thread.status === Thread.STATUS_PROMISE_WAIT ||
            thread.status === Thread.STATUS_YIELD_TICK ||
            !this.isActiveThread(thread)
        );
    }

    /**
     * Toggle a script.
     * @param {!string} topBlockId ID of block that starts the script.
     * @param {?object} opts optional arguments to toggle script
     * @param {?string} opts.target target ID for target to run script on. If not supplied, uses editing target.
     * @param {?boolean} opts.stackClick true if the user activated the stack by clicking, false if not. This
     *     determines whether we show a visual report when turning on the script.
     */
    toggleScript (topBlockId, opts) {
        opts = Object.assign({
            target: this._editingTarget,
            stackClick: false
        }, opts);
        // Remove any existing thread.
        for (let i = 0; i < this.threads.length; i++) {
            // Toggling a script that's already running turns it off
            if (this.threads[i].topBlock === topBlockId && this.threads[i].status !== Thread.STATUS_DONE) {
                const blockContainer = opts.target.blocks;
                const opcode = blockContainer.getOpcode(blockContainer.getBlock(topBlockId));

                if (this.getIsEdgeActivatedHat(opcode) && this.threads[i].stackClick !== opts.stackClick) {
                    // Allow edge activated hat thread stack click to coexist with
                    // edge activated hat thread that runs every frame
                    continue;
                }
                this._stopThread(this.threads[i]);
                return;
            }
        }
        // Otherwise add it.
        this._pushThread(topBlockId, opts.target, opts);
    }

    /**
     * Enqueue a script that when finished will update the monitor for the block.
     * @param {!string} topBlockId ID of block that starts the script.
     * @param {?Target} optTarget target Target to run script on. If not supplied, uses editing target.
     */
    addMonitorScript (topBlockId, optTarget) {
        if (!optTarget) optTarget = this._editingTarget;
        for (let i = 0; i < this.threads.length; i++) {
            // Don't re-add the script if it's already running
            if (this.threads[i].topBlock === topBlockId && this.threads[i].status !== Thread.STATUS_DONE &&
                this.threads[i].updateMonitor) {
                return;
            }
        }
        // Otherwise add it.
        this._pushThread(topBlockId, optTarget, {updateMonitor: true});
    }

    /**
     * Run a function `f` for all scripts in a workspace.
     * `f` will be called with two parameters:
     *  - the top block ID of the script.
     *  - the target that owns the script.
     * @param {!Function} f Function to call for each script.
     * @param {Target=} optTarget Optionally, a target to restrict to.
     */
    allScriptsDo (f, optTarget) {
        let targets = this.executableTargets;
        if (optTarget) {
            targets = [optTarget];
        }
        for (let t = targets.length - 1; t >= 0; t--) {
            const target = targets[t];
            const scripts = target.blocks.getScripts();
            for (let j = 0; j < scripts.length; j++) {
                const topBlockId = scripts[j];
                f(topBlockId, target);
            }
        }
    }

    allScriptsByOpcodeDo (opcode, f, optTarget) {
        let targets = this.executableTargets;
        if (optTarget) {
            targets = [optTarget];
        }
        for (let t = targets.length - 1; t >= 0; t--) {
            const target = targets[t];
            const scripts = BlocksRuntimeCache.getScripts(target.blocks, opcode);
            for (let j = 0; j < scripts.length; j++) {
                f(scripts[j], target);
            }
        }
    }

    /**
     * Start all relevant hats.
     * @param {!string} requestedHatOpcode Opcode of hats to start.
     * @param {object=} optMatchFields Optionally, fields to match on the hat.
     * @param {Target=} optTarget Optionally, a target to restrict to.
     * @returns {Array.<Thread>} List of threads started by this function.
     */
    startHats (requestedHatOpcode,
        optMatchFields, optTarget) {
        if (!Object.prototype.hasOwnProperty.call(this._hats, requestedHatOpcode)) {
            // No known hat with this opcode.
            return;
        }
        const instance = this;
        const newThreads = [];
        // Look up metadata for the relevant hat.
        const hatMeta = instance._hats[requestedHatOpcode];

        for (const opts in optMatchFields) {
            if (!Object.prototype.hasOwnProperty.call(optMatchFields, opts)) continue;
            optMatchFields[opts] = optMatchFields[opts].toUpperCase();
        }

        // Consider all scripts, looking for hats with opcode `requestedHatOpcode`.
        this.allScriptsByOpcodeDo(requestedHatOpcode, (script, target) => {
            const {
                blockId: topBlockId,
                fieldsOfInputs: hatFields
            } = script;

            // Match any requested fields.
            // For example: ensures that broadcasts match.
            // This needs to happen before the block is evaluated
            // (i.e., before the predicate can be run) because "broadcast and wait"
            // needs to have a precise collection of started threads.
            for (const matchField in optMatchFields) {
                if (hatFields[matchField].value !== optMatchFields[matchField]) {
                    // Field mismatch.
                    return;
                }
            }

            if (hatMeta.restartExistingThreads) {
                // If `restartExistingThreads` is true, we should stop
                // any existing threads starting with the top block.
                for (let i = 0; i < this.threads.length; i++) {
                    if (this.threads[i].target === target &&
                        this.threads[i].topBlock === topBlockId &&
                        // stack click threads and hat threads can coexist
                        !this.threads[i].stackClick) {
                        newThreads.push(this._restartThread(this.threads[i]));
                        return;
                    }
                }
            } else {
                // If `restartExistingThreads` is false, we should
                // give up if any threads with the top block are running.
                for (let j = 0; j < this.threads.length; j++) {
                    if (this.threads[j].target === target &&
                        this.threads[j].topBlock === topBlockId &&
                        // stack click threads and hat threads can coexist
                        !this.threads[j].stackClick &&
                        this.threads[j].status !== Thread.STATUS_DONE) {
                        // Some thread is already running.
                        return;
                    }
                }
            }
            // Start the thread with this top block.
            newThreads.push(this._pushThread(topBlockId, target));
        }, optTarget);
        // For compatibility with Scratch 2, edge triggered hats need to be processed before
        // threads are stepped. See ScratchRuntime.as for original implementation
        newThreads.forEach(thread => {
            execute(this.sequencer, thread);
            thread.goToNextBlock();
        });
        return newThreads;
    }


    /**
     * Dispose all targets. Return to clean state.
     */
    dispose () {
        this.stopAll();
        // Deleting each target's variable's monitors.
        this.targets.forEach(target => {
            if (target.isOriginal) target.deleteMonitors();
        });

        this.targets.map(this.disposeTarget, this);
        this.monitors.reset();
        this.emit(Runtime.RUNTIME_DISPOSED);
        this.ioDevices.clock.resetProjectTimer();
        // @todo clear out extensions? turboMode? etc.
    }

    /**
     * Add a target to the runtime. This tracks the sprite pane
     * ordering of the target. The target still needs to be put
     * into the correct execution order after calling this function.
     * @param {Target} target target to add
     */
    addTarget (target) {
        this.targets.push(target);
        this.executableTargets.push(target);
    }

    /**
     * Move a target in the execution order by a relative amount.
     *
     * A positve number will make the target execute earlier. A negative number
     * will make the target execute later in the order.
     * @param {Target} executableTarget target to move
     * @param {number} delta number of positions to move target by
     * @returns {number} new position in execution order
     */
    moveExecutable (executableTarget, delta) {
        const oldIndex = this.executableTargets.indexOf(executableTarget);
        this.executableTargets.splice(oldIndex, 1);
        let newIndex = oldIndex + delta;
        if (newIndex > this.executableTargets.length) {
            newIndex = this.executableTargets.length;
        }
        if (newIndex <= 0) {
            if (this.executableTargets.length > 0 && this.executableTargets[0].isStage) {
                newIndex = 1;
            } else {
                newIndex = 0;
            }
        }
        this.executableTargets.splice(newIndex, 0, executableTarget);
        return newIndex;
    }

    /**
     * Set a target to execute at a specific position in the execution order.
     *
     * Infinity will set the target to execute first. 0 will set the target to
     * execute last (before the stage).
     * @param {Target} executableTarget target to move
     * @param {number} newIndex position in execution order to place the target
     * @returns {number} new position in the execution order
     */
    setExecutablePosition (executableTarget, newIndex) {
        const oldIndex = this.executableTargets.indexOf(executableTarget);
        return this.moveExecutable(executableTarget, newIndex - oldIndex);
    }

    /**
     * Remove a target from the execution set.
     * @param {Target} executableTarget target to remove
     */
    removeExecutable (executableTarget) {
        const oldIndex = this.executableTargets.indexOf(executableTarget);
        if (oldIndex > -1) {
            this.executableTargets.splice(oldIndex, 1);
        }
    }

    /**
     * Dispose of a target.
     * @param {!Target} disposingTarget Target to dispose of.
     */
    disposeTarget (disposingTarget) {
        this.targets = this.targets.filter(target => {
            if (disposingTarget !== target) return true;
            // Allow target to do dispose actions.
            target.dispose();
            // Remove from list of targets.
            return false;
        });
    }

    /**
     * Stop any threads acting on the target.
     * @param {!Target} target Target to stop threads for.
     * @param {Thread=} optThreadException Optional thread to skip.
     */
    stopForTarget (target, optThreadException) {
        // Emit stop event to allow blocks to clean up any state.
        this.emit(Runtime.STOP_FOR_TARGET, target, optThreadException);

        // Stop any threads on the target.
        for (let i = 0; i < this.threads.length; i++) {
            if (this.threads[i] === optThreadException) {
                continue;
            }
            if (this.threads[i].target === target) {
                this._stopThread(this.threads[i]);
            }
        }
    }

    /**
     * Reset the Run ID. Call this any time the project logically starts, stops, or changes identity.
     */
    resetRunId () {
        if (!this.storage) {
            // see also: attachStorage
            return;
        }

        const newRunId = uuid.v1();
        this.storage.scratchFetch.setMetadata(this.storage.scratchFetch.RequestMetadata.RunId, newRunId);
    }

    /**
     * Start all threads that start with the green flag.
     */
    greenFlag () {
        this.stopAll();
        this.emit(Runtime.PROJECT_START);
        this.ioDevices.clock.resetProjectTimer();
        this.targets.forEach(target => target.clearEdgeActivatedValues());
        // Inform all targets of the green flag.
        for (let i = 0; i < this.targets.length; i++) {
            this.targets[i].onGreenFlag();
        }
        this.startHats('event_whenflagclicked');
    }

    /**
     * Stop "everything."
     */
    stopAll () {
        // Emit stop event to allow blocks to clean up any state.
        this.emit(Runtime.PROJECT_STOP_ALL);

        for (let i = 0; i < this.targets.length; i++) {
            this.targets[i].onStopAll();
        }
        // Dispose of the active thread.
        if (this.sequencer.activeThread !== null) {
            this._stopThread(this.sequencer.activeThread);
        }
        // Remove all remaining threads from executing in the next tick.
        this.threads = [];

        this.resetRunId();
    }

    /**
     * Repeatedly run `sequencer.stepThreads` and filter out
     * inactive threads after each iteration.
     */
    _step () {
        if (this.profiler !== null) {
            if (stepProfilerId === -1) {
                stepProfilerId = this.profiler.idByName('Runtime._step');
            }
            this.profiler.start(stepProfilerId);
        }

        // Clean up threads that were told to stop during or since the last step
        this.threads = this.threads.filter(thread => !thread.isKilled);

        // Find all edge-activated hats, and add them to threads to be evaluated.
        for (const hatType in this._hats) {
            if (!Object.prototype.hasOwnProperty.call(this._hats, hatType)) continue;
            const hat = this._hats[hatType];
            if (hat.edgeActivated) {
                this.startHats(hatType);
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
        // Add done threads so that even if a thread finishes within 1 frame, the green
        // flag will still indicate that a script ran.
        this._emitProjectRunStatus(
            this.threads.length + doneThreads.length -
            this._getMonitorThreadCount([...this.threads, ...doneThreads]));
        // Store threads that completed this iteration for testing and other
        // internal purposes.
        this._lastStepDoneThreads = doneThreads;

        if (this._refreshTargets) {
            this.emit(Runtime.TARGETS_UPDATE, false /* Don't emit project changed */);
            this._refreshTargets = false;
        }

        this.monitors.emitIfChanged();

        if (this.profiler !== null) {
            this.profiler.stop();
            this.profiler.reportFrames();
        }
    }

    /**
     * Get the number of threads in the given array that are monitor threads (threads
     * that update monitor values, and don't count as running a script).
     * @param {!Array.<Thread>} threads The set of threads to look through.
     * @returns {number} The number of monitor threads in threads.
     */
    _getMonitorThreadCount (threads) {
        let count = 0;
        threads.forEach(thread => {
            if (thread.updateMonitor) count++;
        });
        return count;
    }

    /**
     * Queue monitor blocks to sequencer to be run.
     */
    _pushMonitors () {
        this.monitorBlocks.runAllMonitored(this);
    }

    /**
     * Set the current editing target known by the runtime.
     * @param {!Target} editingTarget New editing target.
     */
    setEditingTarget (editingTarget) {
        const oldEditingTarget = this._editingTarget;
        this._editingTarget = editingTarget;
        // Script glows must be cleared.
        this.glows.clear();
        this.glows.update();

        if (oldEditingTarget !== this._editingTarget) {
            this.requestToolboxExtensionsUpdate();
        }
    }

    /**
     * Set whether we are in 30 TPS compatibility mode.
     * @param {boolean} compatibilityModeOn True iff in compatibility mode.
     */
    setCompatibilityMode (compatibilityModeOn) {
        this.compatibilityMode = compatibilityModeOn;
        if (this._steppingInterval) {
            clearInterval(this._steppingInterval);
            this._steppingInterval = null;
            this.start();
        }
    }

    /**
     * Emit run start/stop after each tick. Emits when `this.threads.length` goes
     * between non-zero and zero
     * @param {number} nonMonitorThreadCount The new nonMonitorThreadCount
     */
    _emitProjectRunStatus (nonMonitorThreadCount) {
        if (this._nonMonitorThreadCount === 0 && nonMonitorThreadCount > 0) {
            this.emit(Runtime.PROJECT_RUN_START);
        }
        if (this._nonMonitorThreadCount > 0 && nonMonitorThreadCount === 0) {
            this.emit(Runtime.PROJECT_RUN_STOP);
        }
        this._nonMonitorThreadCount = nonMonitorThreadCount;
    }

    /**
     * "Quiet" a script's glow: stop the VM from generating glow/unglow events
     * about that script. Use when a script has just been deleted, but we may
     * still be tracking glow data about it.
     * @param {!string} scriptBlockId Id of top-level block in script to quiet.
     */
    quietGlow (scriptBlockId) {
        this.glows.quiet(scriptBlockId);
    }

    /**
     * Emit feedback for block glowing (used in the sequencer).
     * @param {?string} blockId ID for the block to update glow
     * @param {boolean} isGlowing True to turn on glow; false to turn off.
     */
    glowBlock (blockId, isGlowing) {
        if (isGlowing) {
            this.emit(Runtime.BLOCK_GLOW_ON, {id: blockId});
        } else {
            this.emit(Runtime.BLOCK_GLOW_OFF, {id: blockId});
        }
    }

    /**
     * Emit feedback for script glowing.
     * @param {?string} topBlockId ID for the top block to update glow
     * @param {boolean} isGlowing True to turn on glow; false to turn off.
     */
    glowScript (topBlockId, isGlowing) {
        if (isGlowing) {
            this.emit(Runtime.SCRIPT_GLOW_ON, {id: topBlockId});
        } else {
            this.emit(Runtime.SCRIPT_GLOW_OFF, {id: topBlockId});
        }
    }

    /**
     * Emit whether blocks are being dragged over gui
     * @param {boolean} areBlocksOverGui True if blocks are dragged out of blocks workspace, false otherwise
     */
    emitBlockDragUpdate (areBlocksOverGui) {
        this.emit(Runtime.BLOCK_DRAG_UPDATE, areBlocksOverGui);
    }

    /**
     * Emit event to indicate that the block drag has ended with the blocks outside the blocks workspace
     * @param {Array.<object>} blocks The set of blocks dragged to the GUI
     * @param {string} topBlockId The original id of the top block being dragged
     */
    emitBlockEndDrag (blocks, topBlockId) {
        this.emit(Runtime.BLOCK_DRAG_END, blocks, topBlockId);
    }

    /**
     * Emit value for reporter to show in the blocks.
     * @param {string} blockId ID for the block.
     * @param {string} value Value to show associated with the block.
     */
    visualReport (blockId, value) {
        this.emit(Runtime.VISUAL_REPORT, {id: blockId, value: String(value)});
    }

    /**
     * Add a monitor to the state. If the monitor already exists in the state,
     * updates those properties that are defined in the given monitor record.
     * @param {!MonitorRecord} monitor Monitor to add.
     */
    requestAddMonitor (monitor) {
        this.monitors.add(monitor);
    }

    /**
     * Update a monitor in the state and report success/failure of update.
     * @param {!Map} monitor Monitor values to update. Values on the monitor with overwrite
     *     values on the old monitor with the same ID. If a value isn't defined on the new monitor,
     *     the old monitor will keep its old value.
     * @returns {boolean} true if monitor exists in the state and was updated, false if it did not exist.
     */
    requestUpdateMonitor (monitor) {
        return this.monitors.update(monitor);
    }

    /**
     * Removes a monitor from the state. Does nothing if the monitor already does
     * not exist in the state.
     * @param {!string} monitorId ID of the monitor to remove.
     */
    requestRemoveMonitor (monitorId) {
        this.monitors.remove(monitorId);
    }

    /**
     * Hides a monitor and returns success/failure of action.
     * @param {!string} monitorId ID of the monitor to hide.
     * @returns {boolean} true if monitor exists and was updated, false otherwise
     */
    requestHideMonitor (monitorId) {
        return this.monitors.hide(monitorId);
    }

    /**
     * Shows a monitor and returns success/failure of action.
     * not exist in the state.
     * @param {!string} monitorId ID of the monitor to show.
     * @returns {boolean} true if monitor exists and was updated, false otherwise
     */
    requestShowMonitor (monitorId) {
        return this.monitors.show(monitorId);
    }

    /**
     * Removes all monitors with the given target ID from the state. Does nothing if
     * the monitor already does not exist in the state.
     * @param {!string} targetId Remove all monitors with given target ID.
     */
    requestRemoveMonitorByTargetId (targetId) {
        this.monitors.removeByTargetId(targetId);
    }

    /**
     * Get a target by its id.
     * @param {string} targetId Id of target to find.
     * @returns {?Target} The target, if found.
     */
    getTargetById (targetId) {
        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];
            if (target.id === targetId) {
                return target;
            }
        }
    }

    /**
     * Handle that the project has loaded in the Virtual Machine.
     */
    handleProjectLoaded () {
        this.emit(Runtime.PROJECT_LOADED);
        this.resetRunId();
    }

    /**
     * Report that the project has changed in a way that would affect serialization
     */
    emitProjectChanged () {
        this.emit(Runtime.PROJECT_CHANGED);
    }

    /**
     * Report that a new target has been created, possibly by cloning an existing target.
     * @param {Target} newTarget - the newly created target.
     * @param {Target} [sourceTarget] - the target used as a source for the new clone, if any.
     * @fires Runtime#targetWasCreated
     */
    fireTargetWasCreated (newTarget, sourceTarget) {
        this.emit('targetWasCreated', newTarget, sourceTarget);
    }

    /**
     * Report that a clone target is being removed.
     * @param {Target} target - the target being removed
     * @fires Runtime#targetWasRemoved
     */
    fireTargetWasRemoved (target) {
        this.emit('targetWasRemoved', target);
    }

    /**
     * Get a target representing the Scratch stage, if one exists.
     * @returns {?Target} The target, if found.
     */
    getTargetForStage () {
        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];
            if (target.isStage) {
                return target;
            }
        }
    }

    /**
     * Get the editing target.
     * @returns {?Target} The editing target.
     */
    getEditingTarget () {
        return this._editingTarget;
    }

    getAllVarNamesOfType (varType) {
        let varNames = [];
        for (const target of this.targets) {
            const targetVarNames = target.getAllVariableNamesInScopeByType(varType, true);
            varNames = varNames.concat(targetVarNames);
        }
        return varNames;
    }

    /**
     * Get the label or label function for an opcode
     * @param {string} extendedOpcode - the opcode you want a label for
     * @returns {object} - object with label and category
     * @property {string} category - the category for this opcode
     * @property {Function} [labelFn] - function to generate the label for this opcode
     * @property {string} [label] - the label for this opcode if `labelFn` is absent
     */
    getLabelForOpcode (extendedOpcode) {
        return getLabelForOpcode(this, extendedOpcode);
    }

    /**
     * Create a new global variable avoiding conflicts with other variable names.
     * @param {string} variableName The desired variable name for the new global variable.
     * This can be turned into a fresh name as necessary.
     * @param {string} optVarId An optional ID to use for the variable. A new one will be generated
     * if a falsey value for this parameter is provided.
     * @param {string} optVarType The type of the variable to create. Defaults to Variable.SCALAR_TYPE.
     * @returns {Variable} The new variable that was created.
     */
    createNewGlobalVariable (variableName, optVarId, optVarType) {
        const varType = (typeof optVarType === 'string') ? optVarType : Variable.SCALAR_TYPE;
        const allVariableNames = this.getAllVarNamesOfType(varType);
        const newName = StringUtil.unusedName(variableName, allVariableNames);
        const variable = new Variable(optVarId || uid(), newName, varType);
        const stage = this.getTargetForStage();
        stage.variables[variable.id] = variable;
        return variable;
    }

    /**
     * Tell the runtime to request a redraw.
     * There is no renderer, but the sequencer still uses this flag to decide whether
     * `stepThreads` should yield after stepping each thread (frame-visible work pacing).
     */
    requestRedraw () {
        this.redrawRequested = true;
    }

    /**
     * Emit a targets update at the end of the step if the provided target is
     * the original sprite
     * @param {!Target} target Target requesting the targets update
     */
    requestTargetsUpdate (target) {
        if (!target.isOriginal) return;
        this._refreshTargets = true;
    }

    /**
     * Emit an event that indicates that the blocks on the workspace need updating.
     */
    requestBlocksUpdate () {
        this.emit(Runtime.BLOCKS_NEED_UPDATE);
    }

    /**
     * Emit an event that indicates that the toolbox extension blocks need updating.
     */
    requestToolboxExtensionsUpdate () {
        this.emit(Runtime.TOOLBOX_EXTENSIONS_NEED_UPDATE);
    }

    /**
     * Set up timers to repeatedly step in a browser.
     */
    start () {
        // Do not start if we are already running
        if (this._steppingInterval) return;

        let interval = Runtime.THREAD_STEP_INTERVAL;
        if (this.compatibilityMode) {
            interval = Runtime.THREAD_STEP_INTERVAL_COMPATIBILITY;
        }
        this.currentStepTime = interval;
        this._steppingInterval = setInterval(() => {
            this._step();
        }, interval);
        this.emit(Runtime.RUNTIME_STARTED);
    }

    /**
     * Quit the Runtime, clearing any handles which might keep the process alive.
     * Do not use the runtime after calling this method. This method is meant for test shutdown.
     */
    quit () {
        clearInterval(this._steppingInterval);
        this._steppingInterval = null;
    }

    /**
     * Turn on profiling.
     * @param {Profiler/FrameCallback} onFrame A callback handle passed a
     * profiling frame when the profiler reports its collected data.
     */
    enableProfiling (onFrame) {
        if (Profiler.available()) {
            this.profiler = new Profiler(onFrame);
        }
    }

    /**
     * Turn off profiling.
     */
    disableProfiling () {
        this.profiler = null;
    }

    /**
     * Update a millisecond timestamp value that is saved on the Runtime.
     * This value is helpful in certain instances for compatibility with Scratch 2,
     * which sometimes uses a `currentMSecs` timestamp value in Interpreter.as
     */
    updateCurrentMSecs () {
        this.currentMSecs = Date.now();
    }
}

// Expose the runtime event names as static properties, e.g. `Runtime.PROJECT_START`.
Object.assign(Runtime, RuntimeEventNames);

/**
 * Event fired after a new target has been created, possibly by cloning an existing target.
 * @event Runtime#targetWasCreated
 * @param {Target} newTarget - the newly created target.
 * @param {Target} [sourceTarget] - the target used as a source for the new clone, if any.
 */

module.exports = Runtime;
