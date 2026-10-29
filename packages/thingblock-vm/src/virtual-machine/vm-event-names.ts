/** Emits an event on the VM; the VM hands this to its parts so they never hold the VM itself. */
export type Emit = (event: string, ...args: unknown[]) => void;

/**
 * Names of the events the VM emits itself, beside the runtime events it forwards (`src/event/event-name.ts`).
 */
const VmEventNames = {
    /** Turbo mode was turned on or off. */
    TURBO_MODE_ON: 'TURBO_MODE_ON',
    TURBO_MODE_OFF: 'TURBO_MODE_OFF',
    /** The device manager finished loading resource packs. */
    RESOURCE_PACKS_LOADED: 'RESOURCE_PACKS_LOADED',
    /** The project's peripherals changed. */
    PERIPHERALS_CHANGED: 'PERIPHERALS_CHANGED',
    /** A loaded project's board and peripherals were restored. */
    BOARD_RESTORED: 'BOARD_RESTORED',
    /** The targets and the one being edited. */
    targetsUpdate: 'targetsUpdate',
    /** The editing target's blocks as Blockly XML, for the workspace to render. */
    workspaceUpdate: 'workspaceUpdate',
    /** The editing target's blocks and threads, for the playground. */
    playgroundData: 'playgroundData'
};

export default VmEventNames;
