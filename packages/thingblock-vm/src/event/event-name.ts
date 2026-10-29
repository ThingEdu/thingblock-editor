export const RuntimeEvent = {
    SCRIPT_GLOW_ON: 'SCRIPT_GLOW_ON', // (glow: {id: string})
    SCRIPT_GLOW_OFF: 'SCRIPT_GLOW_OFF', // (glow: {id: string})
    BLOCK_GLOW_ON: 'BLOCK_GLOW_ON', // (glow: {id: string})
    BLOCK_GLOW_OFF: 'BLOCK_GLOW_OFF', // (glow: {id: string})
    PROJECT_START: 'PROJECT_START',
    PROJECT_RUN_START: 'PROJECT_RUN_START',
    PROJECT_RUN_STOP: 'PROJECT_RUN_STOP',
    PROJECT_STOP_ALL: 'PROJECT_STOP_ALL',
    STOP_FOR_TARGET: 'STOP_FOR_TARGET', // (target: Target, exception?: Thread)
    VISUAL_REPORT: 'VISUAL_REPORT', // (report: {id: string, value: string})
    PROJECT_LOADED: 'PROJECT_LOADED',
    PROJECT_CHANGED: 'PROJECT_CHANGED',
    TOOLBOX_EXTENSIONS_NEED_UPDATE: 'TOOLBOX_EXTENSIONS_NEED_UPDATE',
    TARGETS_UPDATE: 'TARGETS_UPDATE', // (emitProjectChanged: boolean)
    MONITORS_UPDATE: 'MONITORS_UPDATE', // (state: MonitorHandler['_state'])
    BLOCK_DRAG_UPDATE: 'BLOCK_DRAG_UPDATE', // (areBlocksOverGui: boolean)
    BLOCK_DRAG_END: 'BLOCK_DRAG_END', // (blocks: object[], topBlockId: string)
    EXTENSION_ADDED: 'EXTENSION_ADDED', // (categoryInfo: CategoryInfo)
    EXTENSION_FIELD_ADDED: 'EXTENSION_FIELD_ADDED', // (field: {name: string, implementation: unknown})
    BLOCKSINFO_UPDATE: 'BLOCKSINFO_UPDATE', // (categoryInfo: CategoryInfo)
    MIC_LISTENING: 'MIC_LISTENING', // (listening: boolean)
    EXTENSION_DATA_LOADING: 'EXTENSION_DATA_LOADING', // (loading: boolean)
    RUNTIME_STARTED: 'RUNTIME_STARTED',
    RUNTIME_DISPOSED: 'RUNTIME_DISPOSED',
    BLOCKS_NEED_UPDATE: 'BLOCKS_NEED_UPDATE',
    targetWasCreated: 'targetWasCreated', // (newTarget: Target, sourceTarget?: Target)
    targetWasRemoved: 'targetWasRemoved' // (target: Target)
};

export const OpcodeEvent = {
    QUESTION: 'QUESTION',
    PRINT_TO_MONITOR: 'PRINT_TO_MONITOR'
};

export const IoEvent = {
    KEY_PRESSED: 'KEY_PRESSED'
};

/** Emitted by peripheral extensions while scanning and connecting. */
export const PeripheralEvent = {
    PERIPHERAL_LIST_UPDATE: 'PERIPHERAL_LIST_UPDATE', // (peripherals: Record<string, PeripheralListEntry>)
    USER_PICKED_PERIPHERAL: 'USER_PICKED_PERIPHERAL', // (peripherals: Record<string, PeripheralListEntry>)
    PERIPHERAL_CONNECTED: 'PERIPHERAL_CONNECTED',
    PERIPHERAL_DISCONNECTED: 'PERIPHERAL_DISCONNECTED',
    PERIPHERAL_REQUEST_ERROR: 'PERIPHERAL_REQUEST_ERROR', // (error?: {message: string})
    PERIPHERAL_CONNECTION_LOST_ERROR: 'PERIPHERAL_CONNECTION_LOST_ERROR', // (error: {message, extensionId})
    PERIPHERAL_SCAN_TIMEOUT: 'PERIPHERAL_SCAN_TIMEOUT'
};

/** Emitted by the board link about the connected board. */
export const LinkEvent = {
    DEVICE_CONNECTED: 'DEVICE_CONNECTED',
    DEVICE_DISCONNECTED: 'DEVICE_DISCONNECTED',
    SERIAL_DATA: 'SERIAL_DATA' // (text: string)
};

/** Emitted by the VM itself. */
export const VMEvent = {
    TURBO_MODE_ON: 'TURBO_MODE_ON',
    TURBO_MODE_OFF: 'TURBO_MODE_OFF',
    WRITE_MONITOR: 'WRITE_MONITOR', // (text: string)
    playgroundData: 'playgroundData' // (data: {blocks: Blocks, threads: string})
};

/** Emitted by `vm.workspace` for the GUI to render. */
export const VMWorkspaceEvent = {
    targetsUpdate: 'targetsUpdate', // (update: {targetList: object[], editingTarget: string | null})
    workspaceUpdate: 'workspaceUpdate' // (update: {xml: string})
};

/** Emitted by `vm.devices` about the board, its resource packs and its peripherals. */
export const DeviceEvent = {
    RESOURCE_PACKS_LOADED: 'RESOURCE_PACKS_LOADED',
    PERIPHERALS_CHANGED: 'PERIPHERALS_CHANGED',
    BOARD_RESTORED: 'BOARD_RESTORED' // (board: {device: string | null, peripherals: string[]})
};
