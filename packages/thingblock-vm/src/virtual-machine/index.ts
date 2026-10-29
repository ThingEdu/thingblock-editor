import formatMessage from 'format-message';
import type {ScratchStorage} from '@thingblock/thingblock-storage';

import centralDispatch from '../dispatch/central-dispatch';
import ExtensionManager from '../extension-support/extension-manager';
import log from '../util/log';
import Runtime from '../engine/runtime';
import type Variable from '../engine/variable';
import {EventBus} from '../event/event-bus';
import {RuntimeEvent, VMEvent} from '../event/event-name';
import type {Emit} from '../event/type';

import DeviceManager from './device-manager';
import LinkController from './link-controller';
import ProjectIo from './project-io';
import Workspace from './workspace';

/** The I/O devices the editor posts input to; the clock only keeps time. */
type InputDeviceName = Exclude<keyof Runtime['ioDevices'], 'clock'>;

const CORE_EXTENSIONS: string[] = [
    // 'motion',
    // 'looks',
    // 'sound',
    // 'events',
    // 'control',
    // 'sensing',
    // 'operators',
    // 'variables',
    // 'myBlocks'
];

/**
 * Handles connections between blocks, stage, and extensions. Its parts are owned objects built from
 * the runtime and the few things each one uses; none of them holds the VM.
 */
export default class VirtualMachine {
    /** The one bus every event of this VM goes through: the runtime's, the parts' and the GUI's. */
    readonly events: EventBus;

    /** VM runtime, to store blocks, I/O devices, targets, etc. */
    readonly runtime: Runtime;

    readonly extensionManager: ExtensionManager;

    /** The editor's side of the runtime: Blockly events, the editing target, workspace rendering. */
    readonly workspace: Workspace;

    /** The board-mode device subsystem: device registry, resource packs, active peripherals. */
    readonly devices: DeviceManager;

    /** The device link: board discovery, connect, compile, upload, firmware flashing, serial monitor. */
    readonly link: LinkController;

    /** Project load and save. */
    readonly project: ProjectIo;

    constructor () {
        this.events = new EventBus();
        this.runtime = new Runtime(this.events);
        centralDispatch.setService('runtime', this.runtime).catch(e => {
            log.error(`Failed to register runtime service: ${JSON.stringify(e)}`);
        });

        this.extensionManager = new ExtensionManager(this.runtime);
        this.events.on(RuntimeEvent.TOOLBOX_EXTENSIONS_NEED_UPDATE, () => {
            this.extensionManager.refreshBlocks();
        });

        const emit: Emit = this.events.emit.bind(this.events);

        // Load core extensions
        for (const id of CORE_EXTENSIONS) {
            this.extensionManager.loadExtensionIdSync(id);
        }

        this.workspace = new Workspace(this.runtime, emit);
        this.devices = new DeviceManager(this.runtime, emit, () => this.link.backend.resourceOrigin);
        this.link = new LinkController(this.runtime, this.devices);
        this.project = new ProjectIo(this.runtime, this.extensionManager, this.devices, this.workspace);
    }

    /** Start running the VM - do this before anything else. */
    start (): void {
        this.runtime.start();
    }

    /**
     * Quit the VM, clearing any handles which might keep the process alive.
     * Do not use the runtime after calling this method. This method is meant for test shutdown.
     */
    quit (): void {
        this.runtime.quit();
    }

    /** "Green flag" handler - start all threads starting with a green flag. */
    greenFlag (): void {
        this.runtime.greenFlag();
    }

    /**
     * Set whether the VM is in "turbo mode."
     * When true, loops don't yield to redraw.
     * @param turboModeOn - whether turbo mode should be set.
     */
    setTurboMode (turboModeOn: boolean): void {
        this.runtime.turboMode = !!turboModeOn;
        if (this.runtime.turboMode) {
            this.events.emit(VMEvent.TURBO_MODE_ON);
        } else {
            this.events.emit(VMEvent.TURBO_MODE_OFF);
        }
    }

    /**
     * Set whether the VM is in 2.0 "compatibility mode."
     * When true, ticks go at 2.0 speed (30 TPS).
     * @param compatibilityModeOn - whether compatibility mode is set.
     */
    setCompatibilityMode (compatibilityModeOn: boolean): void {
        this.runtime.setCompatibilityMode(!!compatibilityModeOn);
    }

    /** Stop all threads and running activities. */
    stopAll (): void {
        this.runtime.stopAll();
    }

    /** Clear out current running project data. */
    clear (): void {
        this.project.clear();
    }

    /** Get data for playground. Data comes back in an emitted event. */
    getPlaygroundData (): void {
        const editingTarget = this.workspace.editingTarget;
        // Only send back thread data for the current editingTarget.
        const threadData = this.runtime.threads.filter(thread => thread.target === editingTarget);
        // Remove the target key, since it's a circular reference.
        const filteredThreadData = JSON.stringify(threadData, (key, value) => {
            if (key === 'target' || key === 'blockContainer') return;
            return value;
        }, 2);
        this.events.emit(VMEvent.playgroundData, {
            blocks: editingTarget.blocks,
            threads: filteredThreadData
        });
    }

    /**
     * Post I/O data to the virtual devices.
     * @param device - name of virtual I/O device.
     * @param data - any data object to post to the I/O device.
     */
    postIOData (device: InputDeviceName, data: unknown): void {
        const ioDevice = this.runtime.ioDevices[device] as {postData (data: unknown): void} | undefined;
        if (ioDevice) {
            ioDevice.postData(data);
        }
    }

    /**
     * Send a line typed into the monitor, so the GUI has one call whether or not a board is connected:
     * `vm.link` writes it to a connected board, and the sensing blocks take it as the answer to "ask and wait".
     * @param text - the line the user typed.
     */
    writeMonitor (text: string): void {
        this.events.emit(VMEvent.WRITE_MONITOR, text);
    }

    /**
     * Set the audio engine for the VM/runtime
     * @param audioEngine - the audio engine to attach.
     */
    attachAudioEngine (audioEngine: unknown): void {
        this.runtime.attachAudioEngine(audioEngine);
    }

    /**
     * Set the storage module for the VM/runtime
     * @param storage - the storage module to attach.
     */
    attachStorage (storage: ScratchStorage): void {
        this.runtime.attachStorage(storage);
    }

    /**
     * Set the current locale and builtin messages for the VM.
     * @param locale - current locale.
     * @param messages - builtin messages map for current locale.
     * @returns resolves when all the blocks have been updated for a new locale (or empty if locale hasn't
     *   changed).
     */
    setLocale (locale: string, messages: formatMessage.Translations[string]): Promise<unknown> {
        if (locale !== formatMessage.setup().locale) {
            formatMessage.setup({locale: locale, translations: {[locale]: messages}});
        }
        return this.extensionManager.refreshBlocks();
    }

    /**
     * Get the current locale for the VM.
     * @returns the current locale in the VM.
     */
    getLocale (): formatMessage.Locales {
        return formatMessage.setup().locale;
    }

    /**
     * Set a target's variable's value. Return whether it succeeded.
     * @param targetId - ID of the target which owns the variable.
     * @param variableId - ID of the variable to set.
     * @param value - the new value of that variable.
     * @returns whether the target and variable were found and updated.
     */
    setVariableValue (targetId: string, variableId: string, value: Variable['value']): boolean {
        const target = this.runtime.getTargetById(targetId);
        if (target) {
            const variable = target.lookupVariableById(variableId);
            if (variable) {
                variable.value = value;

                return true;
            }
        }
        return false;
    }

    /**
     * Get a target's variable's value. Return null if the target or variable does not exist.
     * @param targetId - ID of the target which owns the variable.
     * @param variableId - ID of the variable to get.
     * @returns the value of the variable, or null if it could not be looked up.
     */
    getVariableValue (targetId: string, variableId: string): Variable['value'] | null {
        const target = this.runtime.getTargetById(targetId);
        if (target) {
            const variable = target.lookupVariableById(variableId);
            if (variable) {
                return variable.value;
            }
        }
        return null;
    }

    /**
     * Tell the specified extension to scan for a peripheral.
     * @param extensionId - the id of the extension.
     */
    scanForPeripheral (extensionId: string): void {
        this.runtime.scanForPeripheral(extensionId);
    }

    /**
     * Connect to the extension's specified peripheral.
     * @param extensionId - the id of the extension.
     * @param peripheralId - the id of the peripheral.
     */
    connectPeripheral (extensionId: string, peripheralId: string): void {
        this.runtime.connectPeripheral(extensionId, peripheralId);
    }

    /**
     * Disconnect from the extension's connected peripheral.
     * @param extensionId - the id of the extension.
     */
    disconnectPeripheral (extensionId: string): void {
        this.runtime.disconnectPeripheral(extensionId);
    }

    /**
     * Returns whether the extension has a currently connected peripheral.
     * @param extensionId - the id of the extension.
     * @returns whether the extension has a connected peripheral.
     */
    getPeripheralIsConnected (extensionId: string): boolean {
        return this.runtime.getPeripheralIsConnected(extensionId);
    }
}
