import JSZip from 'jszip';
import validate from 'scratch-parser';

import sb3 from '../serialization/sb3';
import log from '../util/log';
import newBlockIds from '../util/new-block-ids';
import StringUtil from '../util/string-util';
import type ExtensionManager from '../extension-support/extension-manager';
import type Runtime from '../engine/runtime';
import type Target from '../engine/target';
import type {Block} from '../engine/block-types';
import type {ImportedExtensionsInfo} from '../serialization/sb3';
import type DeviceManager from './device-manager';
import type Workspace from './workspace';

type ProjectJSON = {projectVersion?: number};

/**
 * The project as a file, exposed as `vm.project`: loads `.tb` (sb3) projects into the runtime, restoring
 * their board and the extensions their blocks use, and saves the runtime back out.
 */
export default class ProjectIo {
    private readonly runtime: Runtime;

    private readonly extensionManager: ExtensionManager;

    /** Restores a project's board and owns the extension ids its resource packs register. */
    private readonly devices: DeviceManager;

    /** Shows the loaded project and tells the editor its targets changed. */
    private readonly workspace: Workspace;

    /**
     * @param runtime - the runtime projects load into and save from.
     * @param extensionManager - loads the VM extensions a project's blocks use.
     * @param devices - restores a project's board.
     * @param workspace - renders the loaded project.
     */
    constructor (runtime: Runtime, extensionManager: ExtensionManager, devices: DeviceManager, workspace: Workspace) {
        this.runtime = runtime;
        this.extensionManager = extensionManager;
        this.devices = devices;
        this.workspace = workspace;
    }

    /**
     * Load a project from a .tb (sb3) file or its project.json string.
     * @param input - a json string, object, or ArrayBuffer representing the project to load.
     * @returns resolves after targets are installed.
     */
    load (input: string | object | ArrayBuffer | ArrayBufferView): Promise<void> {
        if (typeof input === 'object' && !(input instanceof ArrayBuffer) &&
          !ArrayBuffer.isView(input)) {
            // If the input is an object and not any ArrayBuffer
            // or an ArrayBuffer view (this includes all typed arrays and DataViews)
            // turn the object into a JSON string, because we suspect
            // this is a project.json as an object
            // validate expects a string or buffer as input
            // TODO not sure if we need to check that it also isn't a data view
            input = JSON.stringify(input);
        }

        const validationPromise = new Promise<ProjectJSON[]>((resolve, reject) => {
            // The second argument of false below indicates to the validator that the
            // input should be parsed/validated as an entire project (and not a single sprite)
            validate(input, false, (error: unknown, res: ProjectJSON[]) => {
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the parser's error, as-is
                if (error) return reject(error);
                resolve(res);
            });
        });

        // The rejection reasons below are what callers have always received, so they stay as-is.
        /* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
        return validationPromise
            .then(validatedInput => this.deserialize(validatedInput[0]))
            .then(() => this.runtime.handleProjectLoaded())
            .catch(error => {
                // Intentionally rejecting here (want errors to be handled by caller)
                if (Object.prototype.hasOwnProperty.call(error, 'validationError')) {
                    return Promise.reject(JSON.stringify(error));
                }
                return Promise.reject(error);
            });
        /* eslint-enable @typescript-eslint/prefer-promise-reject-errors */
    }

    /**
     * Zip the project into a .tb (sb3) file.
     * @returns the project file.
     */
    saveSb3 (): Promise<Blob> {
        const projectJson = this.toJSON();

        // TODO want to eventually move zip creation out of here, and perhaps
        // into scratch-storage
        const zip = new JSZip();

        // Put everything in a zip file
        zip.file('project.json', projectJson);

        return zip.generateAsync({
            type: 'blob',
            mimeType: 'application/x.scratch.sb3',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6 // Tradeoff between best speed (1) and best compression (9)
            }
        });
    }

    /**
     * Export the project as a Scratch 3.0 JSON representation.
     * @returns serialized state of the runtime.
     */
    toJSON (): string {
        return StringUtil.stringify(sb3.serialize(this.runtime));
    }

    /** Clear out the current project: dispose the runtime's targets and tell the editor none remain. */
    clear (): void {
        this.runtime.dispose();
        this.workspace.emitTargetsUpdate(false /* Don't emit project change */);
    }

    /**
     * Replace the current project with a deserialized project.json.
     * @param projectJSON - the validated project.json.
     * @returns resolves after the project's board is restored and its targets installed.
     */
    deserialize (projectJSON: ProjectJSON): Promise<void> {
        this.clear();

        if (typeof performance !== 'undefined') {
            performance.mark('scratch-vm-deserialize-start');
        }
        const deserializePromise = () => {
            // Only sb3 (.tb) projects load; Scratch 1 and 2 projects are not supported
            if (projectJSON.projectVersion === 3) {
                return sb3.deserialize(projectJSON, this.runtime);
            }
            // TODO: reject with an Error (possible breaking API change!)
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            return Promise.reject('Unable to verify Scratch Project version.');
        };
        return deserializePromise()
            .then(({targets, extensions, board}) => {
                if (typeof performance !== 'undefined') {
                    performance.mark('scratch-vm-deserialize-end');
                    performance.measure('scratch-vm-deserialize',
                        'scratch-vm-deserialize-start', 'scratch-vm-deserialize-end');
                }
                // The board's peripherals register their blocks on the shared Blockly, so the board is
                // restored before `installTargets` emits the workspace update that renders those blocks.
                return this.devices.applyBoard(board || null)
                    .then(() => this.installTargets(targets, extensions));
            });
    }

    /**
     * Install `deserialize` results: zero or more targets after the extensions (if any) used by those targets.
     * @param targets - the targets to be installed.
     * @param extensions - metadata about extensions used by these targets.
     * @returns resolved once targets have been installed.
     */
    installTargets (targets: Target[], extensions: ImportedExtensionsInfo): Promise<void> {
        const extensionPromises: Promise<unknown>[] = [];

        extensions.extensionIDs.forEach(extensionID => {
            if (this.extensionManager.isExtensionLoaded(extensionID)) return;
            // A resource pack's blocks are registered by board selection, not by the extension manager.
            if (this.devices.isDeviceExtension(extensionID)) return;

            // A block's opcode prefix is not necessarily a VM extension id, so only attempt the ids that
            // are genuinely resolvable: built-in extensions, ids with a real URL recorded in project
            // metadata, or ids that already look like a URL themselves.
            const recordedURL = extensions.extensionURLs.get(extensionID);
            const looksLikeURL = /^[a-z][a-z\d+.-]*:/i.test(extensionID);
            if (!recordedURL && !looksLikeURL && !this.extensionManager.isBuiltinExtension(extensionID)) {
                log.warn(`Skipping unresolvable extension id "${extensionID}" on project load; ` +
                    'its blocks are expected to come from a resource pack, not a VM extension.');
                return;
            }

            extensionPromises.push(this.extensionManager.loadExtensionURL(recordedURL || extensionID));
        });

        targets = targets.filter(target => !!target);

        return Promise.all(extensionPromises).then(() => {
            targets.forEach(target => this.runtime.addTarget(target));

            // A loaded project may carry dangling variable, list, or broadcast
            // references baked in by historical bugs. Reconcile each target so
            // those references resolve cleanly without renaming any legitimate
            // local-vs-global name collisions.
            targets.forEach(target => target.reconcileVariableReferences());

            // Edit the device, which follows the stage, or the stage when the project has only that
            const editingTarget = targets.length > 1 ? targets[1] : targets[0];
            this.workspace.setEditingTarget(editingTarget.id);
        });
    }

    /**
     * Pastes blocks from outside the project, e.g. the backpack, into the workspace of the given target,
     * loading the extensions they use.
     * @param blocks - blocks to add.
     * @param targetId - id of target to add blocks to.
     * @returns resolves when the extensions and blocks have been added.
     */
    shareBlocksToTarget (blocks: Block[], targetId: string): Promise<void> {
        const copiedBlocks: Block[] = JSON.parse(JSON.stringify(blocks));
        newBlockIds(copiedBlocks);
        const target = this.runtime.getTargetById(targetId);

        // Create a unique set of extensionIds that are not yet loaded
        const extensionIDs = new Set<string>(copiedBlocks
            .map(b => sb3.getExtensionIdForOpcode(b.opcode))
            .filter(id => !!id) // Remove ids that do not exist
            .filter(id => !this.extensionManager.isExtensionLoaded(id)) // and remove loaded extensions
            .filter(id => !this.devices.isDeviceExtension(id)) // and device extensions
        );

        // Create an array promises for extensions to load
        const extensionPromises = Array.from(extensionIDs,
            id => this.extensionManager.loadExtensionURL(id)
        );

        return Promise.all(extensionPromises).then(() => {
            copiedBlocks.forEach(block => {
                target.blocks.createBlock(block);
            });
            // Reconcile the blocks' variable, list, and broadcast references against what's
            // defined in the project, creating missing definitions on the stage.
            target.fixUpVariableReferences();
        });
    }
}
