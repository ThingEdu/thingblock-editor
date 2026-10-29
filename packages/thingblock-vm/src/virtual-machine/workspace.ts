import Variable from '../engine/variable';
import {RuntimeEvent, VMWorkspaceEvent} from '../event/event-name';
import type {Emit} from '../event/type';
import type Runtime from '../engine/runtime';
import type Target from '../engine/target';
import type {WorkspaceEvent} from '../engine/runtime/workspace-listener';

/**
 * The editor's side of the runtime, exposed as `vm.workspace`: routes Blockly events into the runtime,
 * switches the editing target, and emits the `targetsUpdate` and `workspaceUpdate` events the GUI renders
 * from. The editing target itself lives on the runtime, which needs it for glows, monitors and clicked
 * scripts, so this holds no copy of it.
 */
export default class Workspace {
    private readonly runtime: Runtime;

    /** Emits on the VM's bus, where the GUI listens for `targetsUpdate` and `workspaceUpdate`. */
    private readonly emit: Emit;

    /**
     * @param runtime - the runtime whose targets and blocks the workspace shows.
     * @param emit - emits on the VM's bus.
     */
    constructor (runtime: Runtime, emit: Emit) {
        this.runtime = runtime;
        this.emit = emit;

        // Blockly calls these as detached change listeners.
        this.blockListener = this.blockListener.bind(this);
        this.flyoutBlockListener = this.flyoutBlockListener.bind(this);
        this.monitorBlockListener = this.monitorBlockListener.bind(this);
        this.variableListener = this.variableListener.bind(this);

        this.runtime.events.on(RuntimeEvent.TARGETS_UPDATE, emitProjectChanged => {
            this.emitTargetsUpdate(emitProjectChanged);
        });
        this.runtime.events.on(RuntimeEvent.BLOCKS_NEED_UPDATE, () => {
            // No editing target means no project is loaded, so there is nothing to render.
            if (this.editingTarget) this.emitWorkspaceUpdate();
        });
    }

    /** The target whose blocks the workspace shows, or null when no project is loaded. */
    get editingTarget (): Target | null {
        return this.runtime.getEditingTarget();
    }

    /**
     * Handle a Blockly event for the current editing target.
     * @param e - any Blockly event.
     */
    blockListener (e: WorkspaceEvent): void {
        this.runtime.workspaceListener.blockListener(e);
    }

    /**
     * Handle a Blockly event for the flyout.
     * @param e - any Blockly event.
     */
    flyoutBlockListener (e: WorkspaceEvent): void {
        this.runtime.workspaceListener.flyoutBlockListener(e);
    }

    /**
     * Handle a Blockly event for the flyout to be passed to the monitor container.
     * @param e - any Blockly event.
     */
    monitorBlockListener (e: WorkspaceEvent): void {
        this.runtime.workspaceListener.monitorBlockListener(e);
    }

    /**
     * Handle a Blockly event for the variable map.
     * @param e - any Blockly event.
     */
    variableListener (e: WorkspaceEvent): void {
        this.runtime.workspaceListener.variableListener(e);
    }

    /** Delete all of the flyout blocks. */
    clearFlyoutBlocks (): void {
        this.runtime.flyoutBlocks.deleteAllBlocks();
    }

    /**
     * Switch the target the workspace edits, then emit the targets and workspace updates that render it.
     * Does nothing when that target is already being edited or does not exist.
     * @param targetId - id of the target to edit.
     */
    setEditingTarget (targetId: string): void {
        if (this.editingTarget && targetId === this.editingTarget.id) return;
        const target = this.runtime.getTargetById(targetId);
        if (!target) return;
        // Set first, because both updates read the editing target.
        this.runtime.setEditingTarget(target);
        this.emitTargetsUpdate(false /* Don't emit project change */);
        this.emitWorkspaceUpdate();
    }

    /**
     * Repopulate the workspace with the blocks of the current editing target. This
     * allows us to get around bugs like gui#413.
     */
    refreshWorkspace (): void {
        const target = this.editingTarget;
        if (!target) return;
        this.emitWorkspaceUpdate();
        this.runtime.setEditingTarget(target);
        this.emitTargetsUpdate(false /* Don't emit project change */);
    }

    /**
     * Emit metadata about available targets.
     * An editor UI could use this to display a list of targets and show
     * the currently editing one.
     * @param triggerProjectChange - also emit a project changed event. Disabled selectively by updates
     *   that don't affect project serialization.
     */
    emitTargetsUpdate (triggerProjectChange = true): void {
        this.emit(VMWorkspaceEvent.targetsUpdate, {
            // [[target id, human readable target name], ...].
            targetList: this.runtime.targets.map(target => target.toJSON()),
            // Currently editing target id.
            editingTarget: this.editingTarget ? this.editingTarget.id : null
        });
        if (triggerProjectChange) {
            this.runtime.emitProjectChanged();
        }
    }

    /**
     * Emit a Blockly/scratch-blocks compatible XML representation
     * of the current editing target's blocks.
     */
    emitWorkspaceUpdate (): void {
        const editingTarget = this.editingTarget;
        if (!editingTarget) {
            throw new Error('emitWorkspaceUpdate: no editing target, so no project is loaded to render');
        }
        // Create a list of broadcast message Ids according to the stage variables
        const stageVariables = this.runtime.getTargetForStage().variables;
        let messageIds: string[] = [];
        for (const varId in stageVariables) {
            if (stageVariables[varId].type === Variable.BROADCAST_MESSAGE_TYPE) {
                messageIds.push(varId);
            }
        }
        // Go through all blocks on all targets, removing referenced
        // broadcast ids from the list.
        for (const currTarget of this.runtime.targets) {
            const currBlocks = currTarget.blocks._blocks;
            for (const blockId in currBlocks) {
                if (currBlocks[blockId].fields.BROADCAST_OPTION) {
                    const id = currBlocks[blockId].fields.BROADCAST_OPTION.id;
                    const index = messageIds.indexOf(id);
                    if (index !== -1) {
                        messageIds = messageIds.slice(0, index)
                            .concat(messageIds.slice(index + 1));
                    }
                }
            }
        }
        // Anything left in messageIds is not referenced by a block, so delete it.
        for (const id of messageIds) {
            delete this.runtime.getTargetForStage().variables[id];
        }
        const globalVarMap = Object.assign({}, this.runtime.getTargetForStage().variables);
        const localVarMap = editingTarget.isStage ?
            Object.create(null) :
            Object.assign({}, editingTarget.variables);

        const globalVariables = Object.keys(globalVarMap).map(k => globalVarMap[k]);
        const localVariables = Object.keys(localVarMap).map(k => localVarMap[k]);
        const workspaceComments = Object.keys(editingTarget.comments)
            .map(k => editingTarget.comments[k])
            .filter(c => c.blockId === null);

        const xmlString = `<xml xmlns="http://www.w3.org/1999/xhtml">
                            <variables>
                                ${globalVariables.map(v => v.toXML()).join()}
                                ${localVariables.map(v => v.toXML(true)).join()}
                            </variables>
                            ${workspaceComments.map(c => c.toXML()).join()}
                            ${editingTarget.blocks.toXML(editingTarget.comments)}
                        </xml>`;

        this.emit(VMWorkspaceEvent.workspaceUpdate, {xml: xmlString});
    }
}
