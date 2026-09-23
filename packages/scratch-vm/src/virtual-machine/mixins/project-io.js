const JSZip = require('jszip');
const log = require('../../util/log');
const StringUtil = require('../../util/string-util');

module.exports = class ProjectIoMixin {
    /**
     * Load a project from a .tb (sb3) file or its project.json string.
     * @param {string | object} input A json string, object, or ArrayBuffer representing the project to load.
     * @returns {!Promise} Promise that resolves after targets are installed.
     */
    loadProject (input) {
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

        const validationPromise = new Promise((resolve, reject) => {
            const validate = require('scratch-parser');
            // The second argument of false below indicates to the validator that the
            // input should be parsed/validated as an entire project (and not a single sprite)
            validate(input, false, (error, res) => {
                if (error) return reject(error);
                resolve(res);
            });
        });

        return validationPromise
            .then(validatedInput => this.deserializeProject(validatedInput[0]))
            .then(() => this.runtime.handleProjectLoaded())
            .catch(error => {
                // Intentionally rejecting here (want errors to be handled by caller)
                if (Object.prototype.hasOwnProperty.call(error, 'validationError')) {
                    return Promise.reject(JSON.stringify(error));
                }
                return Promise.reject(error);
            });
    }

    /**
     * Load a project from the Scratch web site, by ID.
     * @param {string} id - the ID of the project to download, as a string.
     */
    downloadProjectId (id) {
        const storage = this.runtime.storage;
        if (!storage) {
            log.error('No storage module present; cannot load project: ', id);
            return;
        }
        const vm = this;
        const promise = storage.load(storage.AssetType.Project, id);
        promise.then(projectAsset => {
            if (!projectAsset) {
                log.error(`Failed to fetch project with id: ${id}`);
                return null;
            }
            return vm.loadProject(projectAsset.data);
        });
    }

    /**
     * @returns {string} Project in a Scratch 3.0 JSON representation.
     */
    saveProjectSb3 () {
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
     * @returns {string} Serialized state of the runtime.
     */
    toJSON () {
        const sb3 = require('../../serialization/sb3');
        return StringUtil.stringify(sb3.serialize(this.runtime));
    }

    // TODO do we still need this function? Keeping it here so as not to introduce
    // a breaking change.
    /**
     * Load a project from a Scratch JSON representation.
     * @param {string} json JSON string representing a project.
     * @returns {Promise} Promise that resolves after the project has loaded
     */
    fromJSON (json) {
        log.warning('fromJSON is now just a wrapper around loadProject, please use that function instead.');
        return this.loadProject(json);
    }

    /**
     * Load a project from a Scratch JSON representation.
     * @param {string} projectJSON JSON string representing a project.
     * @returns {Promise} Promise that resolves after the project has loaded
     */
    deserializeProject (projectJSON) {
        // Clear the current runtime
        this.clear();

        if (typeof performance !== 'undefined') {
            performance.mark('scratch-vm-deserialize-start');
        }
        const runtime = this.runtime;
        const deserializePromise = function () {
            // Only sb3 (.tb) projects load; Scratch 1 and 2 projects are not supported
            if (projectJSON.projectVersion === 3) {
                const sb3 = require('../../serialization/sb3');
                return sb3.deserialize(projectJSON, runtime);
            }
            // TODO: reject with an Error (possible breaking API change!)
            // eslint-disable-next-line prefer-promise-reject-errors
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
                return this._applyBoard(board || null)
                    .then(() => this.installTargets(targets, extensions));
            });
    }

    /**
     * Install `deserialize` results: zero or more targets after the extensions (if any) used by those targets.
     * @param {Array.<Target>} targets - the targets to be installed
     * @param {ImportedExtensionsInfo} extensions - metadata about extensions used by these targets
     * @returns {Promise} resolved once targets have been installed
     */
    installTargets (targets, extensions) {
        const extensionPromises = [];

        extensions.extensionIDs.forEach(extensionID => {
            if (this.extensionManager.isExtensionLoaded(extensionID)) return;
            // A resource pack's blocks are registered by board selection, not by the extension manager.
            if (this._devices.isDeviceExtension(extensionID)) return;

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

            // Edit the device, which follows the stage, or the stage when the project has only that
            this.editingTarget = targets.length > 1 ? targets[1] : targets[0];

            // A loaded project may carry dangling variable, list, or broadcast
            // references baked in by historical bugs. Reconcile each target so
            // those references resolve cleanly without renaming any legitimate
            // local-vs-global name collisions.
            targets.forEach(target => target.reconcileVariableReferences());

            // Update the VM user's knowledge of targets and blocks on the workspace.
            this.emitTargetsUpdate(false /* Don't emit project change */);
            this.emitWorkspaceUpdate();
            this.runtime.setEditingTarget(this.editingTarget);
        });
    }

};
