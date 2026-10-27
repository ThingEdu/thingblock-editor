/** A vendored lib, in the shape the helper resolves against its resource root. */
export interface LibRef {
    pack: string
    lib: string
}

/** An activated peripheral pack. */
export interface PeripheralRecord {
    id: string
    /** The pack's toolbox category descriptor; absent when it ships no palette blocks. */
    toolbox?: object
    libs: LibRef[]
    /** The pack's served base URL. */
    base: string
}

/**
 * Holds the activated resource-pack peripherals and which are active for the selected device.
 *
 * A "peripheral" here is a reusable component/library pack (e.g. a servo) a device declares via a
 * `{kind:'peripheral', id}` ref — **not** the VM's existing BLE/Scratch-Link "peripheral" (a connected
 * device like a micro:bit). A pack contributes optional toolbox categories and vendored libs; its
 * blocks/codegen are registered once on the shared `scratch-blocks` singleton and persist. Selecting a
 * device activates the peripherals it references; deselecting clears the active set.
 */
class PeripheralRegistry {
    _byId: Map<string, PeripheralRecord>;
    /** Ids of the peripherals active for the current device. */
    _activeIds: Set<string>;

    constructor () {
        this._byId = new Map();
        this._activeIds = new Set();
    }

    /** Whether that peripheral has already been activated (blocks/codegen registered). */
    has (id: string): boolean {
        return this._byId.has(id);
    }

    /** Store an activated peripheral. Idempotent on the peripheral id. */
    register (record: PeripheralRecord): PeripheralRecord {
        this._byId.set(record.id, record);
        return record;
    }

    setActive (id: string) {
        this._activeIds.add(id);
    }

    /**
     * Drop one peripheral from the active set (e.g. when the user removes it from the library). The
     * peripheral's block definitions stay registered on the shared Blockly singleton — only its toolbox
     * category and libs leave the active set, which is the visible and compile-relevant effect.
     */
    setInactive (id: string) {
        this._activeIds.delete(id);
    }

    /** Clear the active set (e.g. when the device changes). */
    clearActive () {
        this._activeIds.clear();
    }

    get activeRecords (): PeripheralRecord[] {
        const records: PeripheralRecord[] = [];
        for (const id of this._activeIds) {
            const record = this._byId.get(id);
            if (record) records.push(record);
        }
        return records;
    }

    /** The active peripherals' toolbox categories (only those that ship one), for the board-mode palette. */
    getActivePeripheralToolboxCategories (): object[] {
        return this.activeRecords.flatMap(record => (record.toolbox ? [record.toolbox] : []));
    }

    /** The active peripherals' vendored libs, for compile-time include resolution. */
    getActivePeripheralLibs (): LibRef[] {
        const libs: LibRef[] = [];
        for (const record of this.activeRecords) {
            libs.push(...record.libs);
        }
        return libs;
    }
}

export default PeripheralRegistry;
