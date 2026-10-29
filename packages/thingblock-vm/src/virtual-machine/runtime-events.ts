import {LinkEvent, PeripheralEvent, RuntimeEvent} from '../event/event-name';
import type Runtime from '../engine/runtime';
import type ExtensionManager from '../extension-support/extension-manager';
import type {Emit} from './vm-event-names';

/** The runtime events VM consumers see unchanged on the VM's emitter. */
const FORWARDED_EVENTS: string[] = [
    RuntimeEvent.SCRIPT_GLOW_ON,
    RuntimeEvent.SCRIPT_GLOW_OFF,
    RuntimeEvent.BLOCK_GLOW_ON,
    RuntimeEvent.BLOCK_GLOW_OFF,
    RuntimeEvent.PROJECT_START,
    RuntimeEvent.PROJECT_RUN_START,
    RuntimeEvent.PROJECT_RUN_STOP,
    RuntimeEvent.PROJECT_CHANGED,
    RuntimeEvent.VISUAL_REPORT,
    RuntimeEvent.MONITORS_UPDATE,
    RuntimeEvent.BLOCK_DRAG_UPDATE,
    RuntimeEvent.BLOCK_DRAG_END,
    RuntimeEvent.EXTENSION_ADDED,
    RuntimeEvent.EXTENSION_FIELD_ADDED,
    RuntimeEvent.BLOCKSINFO_UPDATE,
    PeripheralEvent.PERIPHERAL_LIST_UPDATE,
    PeripheralEvent.USER_PICKED_PERIPHERAL,
    PeripheralEvent.PERIPHERAL_CONNECTED,
    PeripheralEvent.PERIPHERAL_REQUEST_ERROR,
    PeripheralEvent.PERIPHERAL_DISCONNECTED,
    PeripheralEvent.PERIPHERAL_CONNECTION_LOST_ERROR,
    PeripheralEvent.PERIPHERAL_SCAN_TIMEOUT,
    RuntimeEvent.MIC_LISTENING,
    RuntimeEvent.EXTENSION_DATA_LOADING,
    RuntimeEvent.RUNTIME_STARTED,
    LinkEvent.DEVICE_CONNECTED,
    LinkEvent.DEVICE_DISCONNECTED
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
    runtime.events.on(RuntimeEvent.TOOLBOX_EXTENSIONS_NEED_UPDATE, () => {
        extensionManager.refreshBlocks();
    });
};

export default wireRuntimeEvents;
