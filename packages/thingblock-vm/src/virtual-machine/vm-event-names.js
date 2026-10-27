/**
 * Names of the events the VM emits itself, beside the runtime events it forwards (`RuntimeEventNames`).
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
    BOARD_RESTORED: 'BOARD_RESTORED'
};

module.exports = VmEventNames;
