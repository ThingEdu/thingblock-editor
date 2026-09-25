const {RuntimeEventNames} = require('../engine/runtime/runtime-events');

/**
 * Forward the runtime's events out through the VM, so VM consumers can subscribe to a single emitter.
 * Most events are passed straight along; a few drive VM-side updates (targets, workspace, toolbox).
 * @param {VirtualMachine} vm - the VM whose runtime to wire and whose emitter to forward through.
 * @returns {void}
 */
const wireRuntimeEvents = vm => {
    // Runtime emits are passed along as VM emits.
    vm.runtime.events.on(RuntimeEventNames.SCRIPT_GLOW_ON, glowData => {
        vm.emit(RuntimeEventNames.SCRIPT_GLOW_ON, glowData);
    });
    vm.runtime.events.on(RuntimeEventNames.SCRIPT_GLOW_OFF, glowData => {
        vm.emit(RuntimeEventNames.SCRIPT_GLOW_OFF, glowData);
    });
    vm.runtime.events.on(RuntimeEventNames.BLOCK_GLOW_ON, glowData => {
        vm.emit(RuntimeEventNames.BLOCK_GLOW_ON, glowData);
    });
    vm.runtime.events.on(RuntimeEventNames.BLOCK_GLOW_OFF, glowData => {
        vm.emit(RuntimeEventNames.BLOCK_GLOW_OFF, glowData);
    });
    vm.runtime.events.on(RuntimeEventNames.PROJECT_START, () => {
        vm.emit(RuntimeEventNames.PROJECT_START);
    });
    vm.runtime.events.on(RuntimeEventNames.PROJECT_RUN_START, () => {
        vm.emit(RuntimeEventNames.PROJECT_RUN_START);
    });
    vm.runtime.events.on(RuntimeEventNames.PROJECT_RUN_STOP, () => {
        vm.emit(RuntimeEventNames.PROJECT_RUN_STOP);
    });
    vm.runtime.events.on(RuntimeEventNames.PROJECT_CHANGED, () => {
        vm.emit(RuntimeEventNames.PROJECT_CHANGED);
    });
    vm.runtime.events.on(RuntimeEventNames.VISUAL_REPORT, visualReport => {
        vm.emit(RuntimeEventNames.VISUAL_REPORT, visualReport);
    });
    vm.runtime.events.on(RuntimeEventNames.TARGETS_UPDATE, emitProjectChanged => {
        vm.emitTargetsUpdate(emitProjectChanged);
    });
    vm.runtime.events.on(RuntimeEventNames.MONITORS_UPDATE, monitorList => {
        vm.emit(RuntimeEventNames.MONITORS_UPDATE, monitorList);
    });
    vm.runtime.events.on(RuntimeEventNames.BLOCK_DRAG_UPDATE, areBlocksOverGui => {
        vm.emit(RuntimeEventNames.BLOCK_DRAG_UPDATE, areBlocksOverGui);
    });
    vm.runtime.events.on(RuntimeEventNames.BLOCK_DRAG_END, (blocks, topBlockId) => {
        vm.emit(RuntimeEventNames.BLOCK_DRAG_END, blocks, topBlockId);
    });
    vm.runtime.events.on(RuntimeEventNames.EXTENSION_ADDED, categoryInfo => {
        vm.emit(RuntimeEventNames.EXTENSION_ADDED, categoryInfo);
    });
    vm.runtime.events.on(RuntimeEventNames.EXTENSION_FIELD_ADDED, (fieldName, fieldImplementation) => {
        vm.emit(RuntimeEventNames.EXTENSION_FIELD_ADDED, fieldName, fieldImplementation);
    });
    vm.runtime.events.on(RuntimeEventNames.BLOCKSINFO_UPDATE, categoryInfo => {
        vm.emit(RuntimeEventNames.BLOCKSINFO_UPDATE, categoryInfo);
    });
    vm.runtime.events.on(RuntimeEventNames.BLOCKS_NEED_UPDATE, () => {
        vm.emitWorkspaceUpdate();
    });
    vm.runtime.events.on(RuntimeEventNames.TOOLBOX_EXTENSIONS_NEED_UPDATE, () => {
        vm.extensionManager.refreshBlocks();
    });
    vm.runtime.events.on(RuntimeEventNames.PERIPHERAL_LIST_UPDATE, info => {
        vm.emit(RuntimeEventNames.PERIPHERAL_LIST_UPDATE, info);
    });
    vm.runtime.events.on(RuntimeEventNames.USER_PICKED_PERIPHERAL, info => {
        vm.emit(RuntimeEventNames.USER_PICKED_PERIPHERAL, info);
    });
    vm.runtime.events.on(RuntimeEventNames.PERIPHERAL_CONNECTED, () =>
        vm.emit(RuntimeEventNames.PERIPHERAL_CONNECTED)
    );
    vm.runtime.events.on(RuntimeEventNames.PERIPHERAL_REQUEST_ERROR, () =>
        vm.emit(RuntimeEventNames.PERIPHERAL_REQUEST_ERROR)
    );
    vm.runtime.events.on(RuntimeEventNames.PERIPHERAL_DISCONNECTED, () =>
        vm.emit(RuntimeEventNames.PERIPHERAL_DISCONNECTED)
    );
    vm.runtime.events.on(RuntimeEventNames.PERIPHERAL_CONNECTION_LOST_ERROR, data =>
        vm.emit(RuntimeEventNames.PERIPHERAL_CONNECTION_LOST_ERROR, data)
    );
    vm.runtime.events.on(RuntimeEventNames.PERIPHERAL_SCAN_TIMEOUT, () =>
        vm.emit(RuntimeEventNames.PERIPHERAL_SCAN_TIMEOUT)
    );
    vm.runtime.events.on(RuntimeEventNames.MIC_LISTENING, listening => {
        vm.emit(RuntimeEventNames.MIC_LISTENING, listening);
    });
    vm.runtime.events.on(RuntimeEventNames.EXTENSION_DATA_LOADING, loading => {
        vm.emit(RuntimeEventNames.EXTENSION_DATA_LOADING, loading);
    });
    vm.runtime.events.on(RuntimeEventNames.RUNTIME_STARTED, () => {
        vm.emit(RuntimeEventNames.RUNTIME_STARTED);
    });
    vm.runtime.events.on(RuntimeEventNames.DEVICE_CONNECTED, () =>
        vm.emit(RuntimeEventNames.DEVICE_CONNECTED)
    );
    vm.runtime.events.on(RuntimeEventNames.DEVICE_DISCONNECTED, () =>
        vm.emit(RuntimeEventNames.DEVICE_DISCONNECTED)
    );
};

module.exports = wireRuntimeEvents;
