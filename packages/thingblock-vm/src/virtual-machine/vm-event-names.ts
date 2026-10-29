import type Target from '../engine/target';

/** The events the VM emits itself, beside the runtime events it forwards (`RuntimeEvents`), with their payloads. */
export type VmEvents = {
    /** Turbo mode was turned on or off. */
    TURBO_MODE_ON: []
    TURBO_MODE_OFF: []
    /** The device manager finished loading resource packs. */
    RESOURCE_PACKS_LOADED: []
    /** The project's peripherals changed. */
    PERIPHERALS_CHANGED: []
    /** A loaded project's board and peripherals were restored; a null device is a host-mode project. */
    BOARD_RESTORED: [board: {device: string | null, peripherals: string[]}]
    /** The targets and the one being edited, for the editor's target state. */
    targetsUpdate: [update: {targetList: Array<ReturnType<Target['toJSON']>>, editingTarget: string | null}]
    /** The editing target's blocks as Blockly XML, for the workspace to render. */
    workspaceUpdate: [update: {xml: string}]
    /** The editing target's blocks and threads, for the playground. */
    playgroundData: [data: {blocks: Target['blocks'], threads: string}]
};

/** Emits one of the VM's own events; the VM hands its parts this so their names and payloads are checked. */
export type VmEmit = <K extends keyof VmEvents>(event: K, ...args: VmEvents[K]) => void;

/** Names of the events the VM emits itself, beside the runtime events it forwards (`RuntimeEventNames`). */
const VmEventNames = {
    TURBO_MODE_ON: 'TURBO_MODE_ON',
    TURBO_MODE_OFF: 'TURBO_MODE_OFF',
    RESOURCE_PACKS_LOADED: 'RESOURCE_PACKS_LOADED',
    PERIPHERALS_CHANGED: 'PERIPHERALS_CHANGED',
    BOARD_RESTORED: 'BOARD_RESTORED',
    targetsUpdate: 'targetsUpdate',
    workspaceUpdate: 'workspaceUpdate',
    playgroundData: 'playgroundData'
} as const satisfies {[K in keyof VmEvents]: K};

export default VmEventNames;
