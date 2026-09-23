import type Target from '../target';
import type Thread from '../thread';
import type MonitorHandler from './monitor-handler';
import type {CategoryInfo} from '../runtime';
import type {PeripheralListEntry} from './runtime-peripheral';

export type RuntimeEvents = {
    SCRIPT_GLOW_ON: [glow: {id: string}]
    SCRIPT_GLOW_OFF: [glow: {id: string}]
    BLOCK_GLOW_ON: [glow: {id: string}]
    BLOCK_GLOW_OFF: [glow: {id: string}]
    PROJECT_START: []
    PROJECT_RUN_START: []
    PROJECT_RUN_STOP: []
    PROJECT_STOP_ALL: []
    STOP_FOR_TARGET: [target: Target, exception?: Thread]
    VISUAL_REPORT: [report: {id: string, value: string}]
    PROJECT_LOADED: []
    PROJECT_CHANGED: []
    TOOLBOX_EXTENSIONS_NEED_UPDATE: []
    TARGETS_UPDATE: [emitProjectChanged: boolean]
    MONITORS_UPDATE: [state: MonitorHandler['_state']]
    BLOCK_DRAG_UPDATE: [areBlocksOverGui: boolean]
    BLOCK_DRAG_END: [blocks: object[], topBlockId: string]
    EXTENSION_ADDED: [categoryInfo: CategoryInfo]
    EXTENSION_FIELD_ADDED: [field: {name: string, implementation: unknown}]
    BLOCKSINFO_UPDATE: [categoryInfo: CategoryInfo]

    // Host mode peripheral 
    PERIPHERAL_LIST_UPDATE: [peripherals: Record<string, PeripheralListEntry>]
    USER_PICKED_PERIPHERAL: [peripherals: Record<string, PeripheralListEntry>]
    PERIPHERAL_CONNECTED: []
    PERIPHERAL_DISCONNECTED: []
    PERIPHERAL_REQUEST_ERROR: [error?: {message: string}]
    PERIPHERAL_CONNECTION_LOST_ERROR: [error: {message: string, extensionId: string}]
    PERIPHERAL_SCAN_TIMEOUT: []

    // Board mode device (board)
    DEVICE_CONNECTED: []
    DEVICE_DISCONNECTED: []

    SERIAL_DATA: [text: string]
    MIC_LISTENING: [listening: boolean]
    EXTENSION_DATA_LOADING: [loading: boolean]
    RUNTIME_STARTED: []
    RUNTIME_DISPOSED: []
    BLOCKS_NEED_UPDATE: []
    SAY: [target: Target, type: string, text: string]
    QUESTION: [question: string | null]
    PRINT_TO_MONITOR: [text: string]
    KEY_PRESSED: [key: string]
    targetWasCreated: [newTarget: Target, sourceTarget?: Target]
    targetWasRemoved: [target: Target]
};
