import formatMessage from 'format-message';

import VmEventNames from './vm-event-names';
import log from '../util/log';
import {DeviceRegistry, PeripheralRegistry, ManifestDevice} from '../devices';
import {boards} from '../extensions/devices';
import type {DeviceManifest} from '../devices/manifest-device';
import type {LibRef} from '../devices/peripheral-registry';
import type Runtime from '../engine/runtime';

/**
 * How many times the pack index is fetched before giving up. The helper is a sidecar the host spawns
 * alongside the editor — on real hardware it has taken as long as 47s to open its port before serving
 * (it starts an arduino-cli daemon and probes a Bluetooth adapter first) — so the retry window has to
 * clear that measured worst case with margin, not a guess. `loadResourcePacks()` is never awaited by
 * its GUI callers (`vm-manager-hoc`'s startup call, `settings-modal`'s link-mode retry), so a wide
 * window costs nothing but log noise: it never blocks the editor, whose built-in devices are already
 * registered before this runs.
 *
 * Paired with {@link RESOURCE_INDEX_RETRY_MS}/{@link RESOURCE_INDEX_RETRY_FACTOR}/
 * {@link RESOURCE_INDEX_RETRY_MAX_MS}, the capped-exponential backoff below sums to ~79.5s of waiting
 * across these attempts before giving up — comfortably past the 47s worst case, while still bounded so
 * a session with no helper at all does not retry forever.
 */
const RESOURCE_INDEX_ATTEMPTS = 14;

/** Milliseconds before the first retry. */
const RESOURCE_INDEX_RETRY_MS = 500;

/** Multiplier applied to the retry delay after each failed attempt. */
const RESOURCE_INDEX_RETRY_FACTOR = 2;

/** Milliseconds the backoff delay is capped at, once it grows past this. */
const RESOURCE_INDEX_RETRY_MAX_MS = 8000;

/**
 * The delay before the next pack-index attempt: capped exponential backoff, so an unresponsive helper
 * is polled quickly at first (in case it is seconds from ready) and increasingly gently thereafter (in
 * case it is tens of seconds from ready), without either starving the fast case or hammering the slow
 * one.
 * @param attempt - the 1-based attempt number that just failed.
 * @returns milliseconds to wait before the next attempt.
 */
const resourceIndexRetryDelayMs = (attempt: number): number =>
    Math.min(RESOURCE_INDEX_RETRY_MS * Math.pow(RESOURCE_INDEX_RETRY_FACTOR, attempt - 1), RESOURCE_INDEX_RETRY_MAX_MS);

type DevicePackManifest = DeviceManifest & {
    icon: string
    extensions?: string[]
    firmware?: Array<{id: string, name: formatMessage.MessageObject, path: string}>
};

type PeripheralPackManifest = {
    id: string
    name: string
    hidden?: boolean
    description?: formatMessage.MessageObject
    icon?: string
    toolbox?: string
    blocks?: string
    generator?: string
    libs?: Array<{path: string}>
};

type Pack<M> = {manifest: M, base: string};

type Board = {device: string, peripherals?: string[]};

type ScratchBlocks = {arduinoGenerator: unknown, ArduinoOrder: unknown};

type PackModule = {
    default?: unknown
    registerBlocks?: (scratchBlocks: ScratchBlocks) => void
    registerGenerators?: (generator: unknown, order: unknown) => void
};

type ModuleImporter = (url: string) => Promise<PackModule>;

type PeripheralListEntry = {
    id: string
    name: string
    active: boolean
    locked: boolean
    description?: string
    iconURL?: string
};

type Emit = (event: string, ...args: unknown[]) => void;

/**
 * The board-mode device subsystem, exposed as `vm.devices`: the device registry, helper-served resource
 * packs, and the selected board's active peripherals.
 */
export default class DeviceManager {
    private readonly runtime: Runtime;

    /** Emits on the VM, where the GUI listens for `RESOURCE_PACKS_LOADED`, `PERIPHERALS_CHANGED`, `BOARD_RESTORED`. */
    private readonly emit: Emit;

    /**
     * The active link backend's resource-pack origin. Read through a function because the link rebuilds
     * its backend on a link-mode change.
     */
    private readonly linkResourceOrigin: () => string | null;

    /** Registry of upload-mode devices, keyed by deviceId. Drives the GUI device-selection list. */
    deviceRegistry = new DeviceRegistry();

    /**
     * The peripheral packs active for the selected device — the device's own hidden pack plus any
     * reusable components — for the board-mode toolbox and compile-time lib resolution.
     */
    peripheralRegistry = new PeripheralRegistry();

    /**
     * The selected device's id, or null in host mode. Tracked so the project can persist which board
     * (and thus which peripherals) it targets.
     */
    _selectedDeviceId: string | null = null;

    /**
     * A loaded project's saved board, held when its device's helper pack has not registered yet, to be
     * applied once resource packs finish loading. Null when there is nothing pending.
     */
    _pendingBoard: Board | null = null;

    private readonly _deviceManifestsById = new Map<string, {iconURL: string}>();

    /**
     * Guards {@link loadResourcePacks} to one successful run per VM instance: the registries throw
     * on duplicate ids and the toolbox/codegen registrations are not idempotent.
     */
    private _resourcePacksLoaded = false;

    /**
     * Source data for helper-served device packs, keyed by deviceId. Device selection reads it to
     * activate the device's hidden extension(s).
     */
    private readonly _resourceDevicePacks = new Map<string, Pack<DevicePackManifest>>();

    /**
     * Source data for helper-served peripheral packs, keyed by id. Device selection reads it to
     * activate the peripherals the selected device references.
     */
    private readonly _resourcePeripheralPacks = new Map<string, Pack<PeripheralPackManifest>>();

    /**
     * Peripheral ids the user added from the library, beyond the ones the selected device provides
     * automatically. Project-level (persisted with the project) and re-activated on each device
     * selection; kept disjoint from the device's own peripherals, which are never user-removable.
     */
    private _projectPeripheralIds = new Set<string>();

    /**
     * The GUI-injected `@thingblock/thingblock-blocks` module, or null when headless. Registering an active
     * peripheral's block definitions and Arduino codegen needs the shared singleton it holds; absent,
     * device selection still tracks active peripherals' toolbox/libs but skips block/codegen.
     */
    private _scratchBlocks: ScratchBlocks | null = null;

    /**
     * The GUI-injected dynamic-import function for helper-served pack modules, or null when not
     * provided. Kept out of the VM bundle so webpack neither rewrites the remote `import()` nor marks
     * the bundle an ES module (which would strip its default export); the GUI supplies
     * `url => import(url)` from its own build. Absent (headless / no GUI), packs cannot be loaded.
     */
    private _moduleImporter: ModuleImporter | null = null;

    /**
     * @param runtime - the runtime devices are built against and the board selection is mirrored onto.
     * @param emit - emits a VM event.
     * @param linkResourceOrigin - reads the active link backend's resource-pack origin.
     */
    constructor (runtime: Runtime, emit: Emit, linkResourceOrigin: () => string | null) {
        this.runtime = runtime;
        this.emit = emit;
        this.linkResourceOrigin = linkResourceOrigin;
        for (const board of boards) {
            const device = this.deviceRegistry.register(new board.Device(this.runtime));
            this._deviceManifestsById.set(device.deviceId, board);
        }
    }

    /**
     * The list of selectable devices for the GUI, each with its presentation info and FQBN.
     * @returns device descriptors: {deviceId, fqbn, iconURL, name, description, manufacturer, requires,
     *   learnMore, help}.
     */
    getDeviceList (): object[] {
        return this.deviceRegistry.deviceIds.map(deviceId => {
            const device = this.deviceRegistry.get(deviceId);
            const manifest = this._deviceManifestsById.get(deviceId);
            if (!manifest) {
                throw new Error(`getDeviceList: no device manifest registered for "${deviceId}"`);
            }
            return Object.assign(
                {deviceId: device.deviceId, fqbn: device.fqbn, iconURL: manifest.iconURL},
                device.getDeviceInfo()
            );
        });
    }

    /**
     * The HTTP base the active link client serves resource packs from, or null when that backend
     * serves none, making resource loading a no-op there.
     *
     * The backend's `resourceOrigin` is rooted at the pack directory itself (the helper's
     * `--resource-root` is the `thingblock-resource` dir), so the pack name is the root and does not
     * appear in the path: `extensions/…` sits directly under it.
     * @returns the resource base, e.g. `http://localhost:3030/resources/extensions`.
     */
    getResourceOrigin (): string | null {
        const origin = this.linkResourceOrigin();
        return origin && `${origin}/extensions`;
    }

    /**
     * The firmware images the selected device's pack ships, for the GUI's restore menu. Empty when
     * the device declares none, which is how a pack opts out of the feature.
     * @param deviceId - the device to list images for.
     * @returns `{id, name}` entries, names resolved to the active locale.
     */
    getDeviceFirmware (deviceId: string): Array<{id: string, name: string}> {
        const pack = this._resourceDevicePacks.get(deviceId);
        if (!pack) return [];
        return (pack.manifest.firmware || []).map(fw => ({
            id: fw.id,
            name: formatMessage(fw.name)
        }));
    }

    /**
     * Locate one of the device's pack-shipped firmware images for `LinkController#flashFirmware`. The
     * pack is expressed relative to the resource root because the browser cannot name a path on the
     * helper's filesystem.
     * @param deviceId - the device whose pack ships the image.
     * @param firmwareId - the image's manifest id.
     * @returns the pack directory relative to the resource root, and the image file within it.
     */
    getFirmwareImage (deviceId: string, firmwareId: string): {pack: string, file: string} {
        const pack = this._resourceDevicePacks.get(deviceId);
        const firmware = pack && (pack.manifest.firmware || []).find(fw => fw.id === firmwareId);
        if (!firmware) {
            throw new Error(`getFirmwareImage: no firmware "${firmwareId}" for "${deviceId}"`);
        }
        return {pack: this._packPath(deviceId), file: firmware.path};
    }

    /**
     * Register a helper-served device manifest as a selectable device. Idempotent: a manifest whose id
     * is already registered is skipped, so a repeated load never throws on a duplicate id.
     * @param manifest - the pack's device manifest (its `manifest.js` default export).
     * @param base - the manifest's served base URL, used to resolve its relative `icon`.
     */
    registerDeviceManifest (manifest: DevicePackManifest, base: string): void {
        if (this.deviceRegistry.get(manifest.id)) return;
        const device = this.deviceRegistry.register(new ManifestDevice(this.runtime, manifest));
        const iconURL = `${base}/${manifest.icon.replace(/^\.\//, '')}`;
        this._deviceManifestsById.set(device.deviceId, {iconURL});
        this._resourceDevicePacks.set(device.deviceId, {manifest, base});
    }

    /**
     * Record a helper-served peripheral pack as a reusable component a device may reference. Peripherals
     * are not registered into the device list; they activate only when a selected device references them.
     * @param manifest - the pack's peripheral manifest (its `manifest.js` default export).
     * @param base - the manifest's served base URL.
     */
    registerPeripheralManifest (manifest: PeripheralPackManifest, base: string): void {
        this._resourcePeripheralPacks.set(manifest.id, {manifest, base});
    }

    /**
     * Whether an extension id names a device extension — a registered peripheral pack, device-owned or
     * reusable — rather than a VM extension. A pack's id is also the opcode prefix its blocks use, so
     * this is how project load tells the sb3-derived extension ids it owns from ones the
     * {@link ExtensionManager} should load.
     * @param id - the extension id (an opcode prefix).
     * @returns true when a registered peripheral pack owns the id.
     */
    isDeviceExtension (id: string): boolean {
        return this._resourcePeripheralPacks.has(id);
    }

    /**
     * Fetch the helper-served pack index and register each device pack against the device registry, so
     * helper-provided boards join the built-in list. One successful run per VM instance (guarded). The
     * index fetch is retried, backing off between attempts, because the helper is a sidecar spawned
     * alongside the editor and can take tens of seconds to open its port; once the attempts are spent
     * it logs and returns, leaving built-in devices working and the next link-mode entry free to retry.
     * Peripheral packs are recorded here and activated on device selection.
     * @returns resolves once packs are loaded (or skipped).
     */
    async loadResourcePacks (): Promise<void> {
        if (this._resourcePacksLoaded) return;
        const origin = this.getResourceOrigin();
        if (!origin) return;

        let packs: Array<{kind: string, path: string}>;
        for (let attempt = 1; attempt <= RESOURCE_INDEX_ATTEMPTS; attempt++) {
            try {
                const response = await fetch(`${origin}/index.json`);
                ({packs} = await response.json());
                break;
            } catch (e) {
                if (attempt === RESOURCE_INDEX_ATTEMPTS) {
                    log.warn(`loadResourcePacks: resource index unreachable at ${origin} after ` +
                        `${attempt} attempts; using built-in devices only`, e);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, resourceIndexRetryDelayMs(attempt)));
            }
        }

        for (const {kind, path} of packs) {
            const base = `${origin}/${path}`;
            try {
                const manifest = (await this._importPackModule(`${base}/manifest.js`)).default;
                if (kind === 'device') {
                    this.registerDeviceManifest(manifest as DevicePackManifest, base);
                } else if (kind === 'peripheral') {
                    this.registerPeripheralManifest(manifest as PeripheralPackManifest, base);
                }
            } catch (e) {
                log.warn(`loadResourcePacks: failed to load ${kind} pack at ${base}`, e);
            }
        }

        this._resourcePacksLoaded = true;
        this.emit(VmEventNames.RESOURCE_PACKS_LOADED);

        // A project loaded before its device's pack was available left its board pending; apply it now.
        // Its peripherals' blocks reach the shared Blockly only here, so the workspace has to be
        // re-rendered afterward — the update emitted during the load dropped every block it lacked.
        if (this._pendingBoard) {
            await this.applyBoard(this._pendingBoard);
            this.runtime.requestBlocksUpdate();
        }
    }

    /**
     * Dynamically import a helper-served pack module from its HTTP URL at runtime, via the GUI-injected
     * importer ({@link setModuleImporter}). The `import()` literal lives in the GUI's build, not the VM
     * bundle, so webpack never rewrites the remote import nor marks the VM bundle an ES module. Rejects
     * when no importer was set; callers treat that as the pack being unavailable. The single seam tests
     * override to supply in-memory modules.
     * @param url - the served module URL.
     * @returns the imported module namespace.
     */
    _importPackModule (url: string): Promise<PackModule> {
        if (!this._moduleImporter) {
            return Promise.reject(new Error('DeviceManager: no module importer set; call setModuleImporter()'));
        }
        return this._moduleImporter(url);
    }

    /**
     * Inject the editor's `@thingblock/thingblock-blocks` module so device selection can register its active
     * peripherals' blocks and Arduino codegen against the shared singleton. Called by the GUI; left null
     * in headless use, where block/codegen registration is skipped.
     * @param scratchBlocks - the `@thingblock/thingblock-blocks` module handle.
     */
    setScratchBlocks (scratchBlocks: ScratchBlocks): void {
        this._scratchBlocks = scratchBlocks;
    }

    /**
     * Inject the function the VM uses to dynamically import helper-served pack modules. The GUI supplies
     * `url => import(url)` from its own bundle so the remote `import()` stays out of the VM build, where
     * webpack would rewrite it and break the bundle's default export. Absent (headless / no GUI), resource
     * packs cannot be loaded.
     * @param importer - imports a module URL, resolving its namespace.
     */
    setModuleImporter (importer: ModuleImporter): void {
        this._moduleImporter = importer;
    }

    /**
     * Select a device and activate its peripherals: first the ones the device provides automatically (its
     * own hidden pack plus any reusable components it references, in `extensions` order), then the
     * user-added project peripherals on top. Clears the previously active peripherals first; selecting a
     * built-in board (no pack) or `null` just clears them. Idempotent per peripheral — a re-selected
     * device re-activates without re-importing or re-registering.
     * @param deviceId - the selected device's id, or null when none is selected.
     * @returns resolves once the device's peripherals are active.
     */
    async selectDevice (deviceId: string | null): Promise<void> {
        this._selectedDeviceId = deviceId || null;
        this.peripheralRegistry.clearActive();
        const pack = this._resourceDevicePacks.get(deviceId);
        if (pack) {
            for (const id of pack.manifest.extensions || []) {
                await this._activatePeripheral(id);
            }
            for (const id of this._projectPeripheralIds) {
                await this._activatePeripheral(id);
            }
        }
        this._syncRuntimeBoard();
    }

    /**
     * Add a user-chosen peripheral to the project and activate it. No-op when the peripheral is already
     * active — whether the device provides it automatically or the user already added it. Emits
     * `PERIPHERALS_CHANGED` so the palette and generated code rebuild.
     * @param id - the peripheral id to add.
     * @returns resolves once the peripheral is active.
     */
    async addPeripheral (id: string): Promise<void> {
        if (this._deviceAutoPeripheralIds().includes(id)) return;
        if (this._projectPeripheralIds.has(id)) return;
        this._projectPeripheralIds.add(id);
        await this._activatePeripheral(id);
        this._syncRuntimeBoard();
        this.emit(VmEventNames.PERIPHERALS_CHANGED);
    }

    /**
     * Remove a user-added peripheral from the project and deactivate it. Refuses to remove a peripheral
     * the selected device provides automatically (it is not the user's to remove). Emits
     * `PERIPHERALS_CHANGED` when something changed.
     * @param id - the peripheral id to remove.
     */
    removePeripheral (id: string): void {
        if (this._deviceAutoPeripheralIds().includes(id)) {
            log.warn(`removePeripheral: "${id}" is provided by the selected device and cannot be removed`);
            return;
        }
        if (!this._projectPeripheralIds.delete(id)) return;
        this.peripheralRegistry.setInactive(id);
        this._syncRuntimeBoard();
        this.emit(VmEventNames.PERIPHERALS_CHANGED);
    }

    /**
     * The user-added peripheral ids, beyond what the device provides automatically — the set the project
     * persists.
     * @returns the user-added peripheral ids.
     */
    getProjectPeripheralIds (): string[] {
        return Array.from(this._projectPeripheralIds);
    }

    /**
     * The non-hidden peripheral packs the library lists, each tagged with its current state: `active`
     * (in the palette now) and `locked` (provided by the selected device, so not user-removable). Hidden
     * packs — a device's own programming surface — never appear. A pack's `iconURL` and localized
     * `description` are included only when its manifest provides them.
     * @returns library entries.
     */
    getPeripheralList (): PeripheralListEntry[] {
        const auto = this._deviceAutoPeripheralIds();
        const list: PeripheralListEntry[] = [];
        for (const {manifest, base} of this._resourcePeripheralPacks.values()) {
            if (manifest.hidden) continue;
            const locked = auto.includes(manifest.id);
            const entry: PeripheralListEntry = {
                id: manifest.id,
                name: manifest.name,
                active: locked || this._projectPeripheralIds.has(manifest.id),
                locked
            };
            if (manifest.description) entry.description = formatMessage(manifest.description);
            if (manifest.icon) entry.iconURL = `${base}/${manifest.icon.replace(/^\.\//, '')}`;
            list.push(entry);
        }
        return list;
    }

    /**
     * Apply a project's saved board after load: reset to a clean board state, then — once the device is
     * registered (helper packs may still be loading) — restore the user peripherals and select the device.
     * Always emits `BOARD_RESTORED` with the resolved board (a null device for a host-mode project) so the
     * editor syncs its board selection, clearing it when the loaded project has no board. When the device
     * is not yet known, the board is held in `_pendingBoard` and retried (and emitted) once resource packs
     * finish loading.
     * @param board - the saved board, or null in host mode.
     * @returns resolves once the board is applied or deferred.
     */
    async applyBoard (board: Board | null): Promise<void> {
        // A board held pending means the workspace was already rendered without its blocks.
        const wasPending = Boolean(this._pendingBoard);
        this._selectedDeviceId = null;
        this._projectPeripheralIds = new Set();
        this.peripheralRegistry.clearActive();
        this._pendingBoard = null;
        this._syncRuntimeBoard();

        if (board && board.device && !this.deviceRegistry.get(board.device)) {
            this._pendingBoard = board;
            return;
        }
        if (board && board.device) {
            this._projectPeripheralIds = new Set(board.peripherals || []);
            await this.selectDevice(board.device);
            if (wasPending) {
                // The workspace already rendered once, before this board's packs existed,
                // so every one of the project's board blocks was dropped as an unknown
                // type. Re-render now that they are defined.
                this.runtime.requestBlocksUpdate();
            }
        }
        this.emit(VmEventNames.BOARD_RESTORED, {
            device: this._selectedDeviceId,
            peripherals: this.getProjectPeripheralIds()
        });
    }

    /**
     * The active peripherals' toolbox categories, for the board-mode palette. Empty until a selected
     * device activates the peripherals it references.
     * @returns toolbox category descriptors.
     */
    getActivePeripheralToolboxCategories (): object[] {
        return this.peripheralRegistry.getActivePeripheralToolboxCategories();
    }

    /**
     * The active peripherals' vendored libs, for compile-time include resolution. Empty until a selected
     * device activates the peripherals it references.
     * @returns lib refs.
     */
    getActivePeripheralLibs (): LibRef[] {
        return this.peripheralRegistry.getActivePeripheralLibs();
    }

    /**
     * Strip a pack's resource origin from its served base, yielding the path relative to the resource
     * root that the helper's `{pack, lib}` (compile) and `{pack, file}` (flashFirmware) references
     * expect. e.g. base `http://localhost:3030/resources/extensions/devices/thingbot` strips down to
     * `extensions/devices/thingbot`.
     *
     * Derived from the link backend's `resourceOrigin` rather than a literal `/resources/` split: the
     * latter only holds for the helper's own route and yields `undefined` under a
     * `__THINGBLOCK_RESOURCE_BASE__`-style host override, whose base need not contain `/resources/`
     * at all (see `Backend#resourceOrigin`).
     * @param base - a pack's served base URL.
     * @returns the pack directory, relative to the helper's resource root.
     */
    private _packRelativePath (base: string): string {
        const origin = this.linkResourceOrigin();
        return base.slice(origin.length + 1);
    }

    /**
     * The pack-relative directory the helper expects in `flashFirmware`'s `pack` field.
     * @param deviceId - the device whose pack path to derive.
     * @returns the pack directory, relative to the helper's resource root.
     */
    private _packPath (deviceId: string): string {
        const {base} = this._resourceDevicePacks.get(deviceId);
        return this._packRelativePath(base);
    }

    /**
     * The peripheral ids the selected device provides automatically (its `extensions`), or empty for a
     * built-in board with no pack. These are always active while the device is selected and cannot be
     * removed from the library.
     * @returns the device's own peripheral ids.
     */
    private _deviceAutoPeripheralIds (): string[] {
        const pack = this._resourceDevicePacks.get(this._selectedDeviceId);
        return pack ? (pack.manifest.extensions || []) : [];
    }

    /**
     * Mirror the current board selection onto the runtime so the serializer (which only receives the
     * runtime) can persist it. Null in host mode, so host-mode projects carry no board field.
     */
    private _syncRuntimeBoard (): void {
        this.runtime.board = this._selectedDeviceId ?
            {device: this._selectedDeviceId, peripherals: this.getProjectPeripheralIds()} :
            null;
    }

    /**
     * Activate a peripheral the selected device references (a hidden device-owned pack or a reusable
     * component): import its toolbox and libs and, when a `scratch-blocks` handle is present and it ships
     * blocks, register its blocks and codegen on the shared singleton. Idempotent — an already-activated
     * peripheral is just re-marked active. A failure is logged and skipped so one bad peripheral does not
     * break device selection.
     * @param id - the referenced peripheral id.
     * @returns resolves once the peripheral is active.
     */
    private async _activatePeripheral (id: string): Promise<void> {
        const pack = this._resourcePeripheralPacks.get(id);
        if (!pack) {
            log.warn(`selectDevice: device references unknown peripheral "${id}"`);
            return;
        }
        if (this.peripheralRegistry.has(id)) {
            this.peripheralRegistry.setActive(id);
            return;
        }
        const {manifest, base} = pack;
        try {
            let toolbox: object | undefined;
            if (manifest.toolbox) {
                toolbox = (await this._importPackModule(
                    `${base}/${manifest.toolbox.replace(/^\.\//, '')}`
                )).default as object;
            }
            // Compile lib references the helper resolves from its resource root: `pack` is this pack's
            // directory relative to that root, `lib` the manifest's lib directory within the pack. The
            // helper joins root/pack/lib in place.
            const packPath = this._packRelativePath(base);
            const libs = (manifest.libs || []).map(lib => ({pack: packPath, lib: lib.path}));
            if (this._scratchBlocks && manifest.blocks) {
                const {registerBlocks} = await this._importPackModule(
                    `${base}/${manifest.blocks.replace(/^\.\//, '')}`
                );
                registerBlocks(this._scratchBlocks);
                if (manifest.generator) {
                    const {registerGenerators} = await this._importPackModule(
                        `${base}/${manifest.generator.replace(/^\.\//, '')}`
                    );
                    registerGenerators(this._scratchBlocks.arduinoGenerator, this._scratchBlocks.ArduinoOrder);
                }
            }
            this.peripheralRegistry.register({id: manifest.id, toolbox, libs, base});
            this.peripheralRegistry.setActive(manifest.id);
        } catch (e) {
            log.warn(`selectDevice: failed to activate peripheral "${id}" at ${base}`, e);
        }
    }
}
