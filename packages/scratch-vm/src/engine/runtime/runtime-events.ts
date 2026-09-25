import type {EventEmitter} from 'events';
import type Target from '../target';
import type Thread from '../thread';
import type MonitorHandler from './runtime-monitor';
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
    QUESTION: [question: string | null]
    ANSWER: [answer: string]
    PRINT_TO_MONITOR: [text: string]
    KEY_PRESSED: [key: string]
    targetWasCreated: [newTarget: Target, sourceTarget?: Target]
    targetWasRemoved: [target: Target]
};

export type RuntimeEmitter = EventEmitter<RuntimeEvents>;

// TS reads the JS `event-names.js` values as plain strings, which the typed emitter rejects
export const RuntimeEventNames = {
    SCRIPT_GLOW_ON: 'SCRIPT_GLOW_ON',
    SCRIPT_GLOW_OFF: 'SCRIPT_GLOW_OFF',
    BLOCK_GLOW_ON: 'BLOCK_GLOW_ON',
    BLOCK_GLOW_OFF: 'BLOCK_GLOW_OFF',
    PROJECT_START: 'PROJECT_START',
    PROJECT_RUN_START: 'PROJECT_RUN_START',
    PROJECT_RUN_STOP: 'PROJECT_RUN_STOP',
    PROJECT_STOP_ALL: 'PROJECT_STOP_ALL',
    STOP_FOR_TARGET: 'STOP_FOR_TARGET',
    VISUAL_REPORT: 'VISUAL_REPORT',
    PROJECT_LOADED: 'PROJECT_LOADED',
    PROJECT_CHANGED: 'PROJECT_CHANGED',
    TOOLBOX_EXTENSIONS_NEED_UPDATE: 'TOOLBOX_EXTENSIONS_NEED_UPDATE',
    TARGETS_UPDATE: 'TARGETS_UPDATE',
    MONITORS_UPDATE: 'MONITORS_UPDATE',
    BLOCK_DRAG_UPDATE: 'BLOCK_DRAG_UPDATE',
    BLOCK_DRAG_END: 'BLOCK_DRAG_END',
    EXTENSION_ADDED: 'EXTENSION_ADDED',
    EXTENSION_FIELD_ADDED: 'EXTENSION_FIELD_ADDED',
    BLOCKSINFO_UPDATE: 'BLOCKSINFO_UPDATE',
    PERIPHERAL_LIST_UPDATE: 'PERIPHERAL_LIST_UPDATE',
    USER_PICKED_PERIPHERAL: 'USER_PICKED_PERIPHERAL',
    PERIPHERAL_CONNECTED: 'PERIPHERAL_CONNECTED',
    PERIPHERAL_DISCONNECTED: 'PERIPHERAL_DISCONNECTED',
    PERIPHERAL_REQUEST_ERROR: 'PERIPHERAL_REQUEST_ERROR',
    PERIPHERAL_CONNECTION_LOST_ERROR: 'PERIPHERAL_CONNECTION_LOST_ERROR',
    PERIPHERAL_SCAN_TIMEOUT: 'PERIPHERAL_SCAN_TIMEOUT',
    DEVICE_CONNECTED: 'DEVICE_CONNECTED',
    DEVICE_DISCONNECTED: 'DEVICE_DISCONNECTED',
    SERIAL_DATA: 'SERIAL_DATA',
    MIC_LISTENING: 'MIC_LISTENING',
    EXTENSION_DATA_LOADING: 'EXTENSION_DATA_LOADING',
    RUNTIME_STARTED: 'RUNTIME_STARTED',
    RUNTIME_DISPOSED: 'RUNTIME_DISPOSED',
    BLOCKS_NEED_UPDATE: 'BLOCKS_NEED_UPDATE',
    QUESTION: 'QUESTION',
    ANSWER: 'ANSWER',
    PRINT_TO_MONITOR: 'PRINT_TO_MONITOR',
    KEY_PRESSED: 'KEY_PRESSED',
    targetWasCreated: 'targetWasCreated',
    targetWasRemoved: 'targetWasRemoved'
} as const satisfies {[K in keyof RuntimeEvents]: K};
