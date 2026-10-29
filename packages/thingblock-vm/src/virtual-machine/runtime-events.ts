import {RuntimeEventNames, type RuntimeEvents} from '../engine/runtime/runtime-events';
import type Runtime from '../engine/runtime';
import type ExtensionManager from '../extension-support/extension-manager';

type Emit = (event: string, ...args: unknown[]) => void;

/** The runtime events VM consumers see unchanged on the VM's emitter. */
const FORWARDED_EVENTS: Array<keyof RuntimeEvents> = [
    RuntimeEventNames.SCRIPT_GLOW_ON,
    RuntimeEventNames.SCRIPT_GLOW_OFF,
    RuntimeEventNames.BLOCK_GLOW_ON,
    RuntimeEventNames.BLOCK_GLOW_OFF,
    RuntimeEventNames.PROJECT_START,
    RuntimeEventNames.PROJECT_RUN_START,
    RuntimeEventNames.PROJECT_RUN_STOP,
    RuntimeEventNames.PROJECT_CHANGED,
    RuntimeEventNames.VISUAL_REPORT,
    RuntimeEventNames.MONITORS_UPDATE,
    RuntimeEventNames.BLOCK_DRAG_UPDATE,
    RuntimeEventNames.BLOCK_DRAG_END,
    RuntimeEventNames.EXTENSION_ADDED,
    RuntimeEventNames.EXTENSION_FIELD_ADDED,
    RuntimeEventNames.BLOCKSINFO_UPDATE,
    RuntimeEventNames.PERIPHERAL_LIST_UPDATE,
    RuntimeEventNames.USER_PICKED_PERIPHERAL,
    RuntimeEventNames.PERIPHERAL_CONNECTED,
    RuntimeEventNames.PERIPHERAL_REQUEST_ERROR,
    RuntimeEventNames.PERIPHERAL_DISCONNECTED,
    RuntimeEventNames.PERIPHERAL_CONNECTION_LOST_ERROR,
    RuntimeEventNames.PERIPHERAL_SCAN_TIMEOUT,
    RuntimeEventNames.MIC_LISTENING,
    RuntimeEventNames.EXTENSION_DATA_LOADING,
    RuntimeEventNames.RUNTIME_STARTED,
    RuntimeEventNames.DEVICE_CONNECTED,
    RuntimeEventNames.DEVICE_DISCONNECTED
];

/**
 * Forward the runtime's events out through the VM, so VM consumers can subscribe to a single emitter,
 * and refresh extension blocks when the runtime asks for a toolbox update.
 * @param runtime - the runtime whose events to forward.
 * @param emit - emits a VM event.
 * @param extensionManager - refreshes the loaded extensions' blocks.
 */
const wireRuntimeEvents = (runtime: Runtime, emit: Emit, extensionManager: ExtensionManager): void => {
    for (const name of FORWARDED_EVENTS) {
        runtime.events.on(name, (...args: unknown[]) => emit(name, ...args));
    }
    runtime.events.on(RuntimeEventNames.TOOLBOX_EXTENSIONS_NEED_UPDATE, () => {
        extensionManager.refreshBlocks();
    });
};

export default wireRuntimeEvents;
