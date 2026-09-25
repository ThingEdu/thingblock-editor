import {Map} from 'immutable';

import adapter, {type BlocklyXmlEvent} from '../adapter';
import log from '../../util/log';
import mutationAdapter from '../mutation-adapter';
import type Blocks from '../blocks';
import type Runtime from '../runtime';
import type Target from '../target';
import type {VariableType} from '../variable';

type ChangeEvent = {type: 'change', blockId: string} & (
    {element: 'field', name: string, newValue: string | number} |
    {element: 'mutation', newValue: string} |
    {element: 'checkbox', newValue: boolean} |
    {element: 'comment' | 'collapsed' | 'disabled' | 'inline', newValue: unknown}
);

interface MoveEvent {
    type: 'move'
    blockId: string
    oldParentId?: string
    oldInputName?: string
    newParentId?: string
    newInputName?: string
    newCoordinate?: {x: number, y: number}
}

type BlockEvent =
    ({type: 'create', blockId: string} & BlocklyXmlEvent) |
    ChangeEvent |
    {type: 'block_field_intermediate_change', blockId: string, name: string, newValue: string | number} |
    MoveEvent |
    {type: 'delete', blockId: string} |
    {type: 'dragOutside', isOutside: boolean} |
    ({type: 'endDrag', blockId: string, isOutside: boolean} & BlocklyXmlEvent) |
    {type: 'click', blockId?: string, targetType: string};

interface VariableCreateEvent {
    type: 'var_create'
    varId: string
    varName: string
    varType: VariableType
    isLocal?: boolean
    dataType?: string
}

type VariableEvent =
    VariableCreateEvent |
    {type: 'var_rename', varId: string, newName: string} |
    {type: 'var_delete', varId: string};

type CommentEvent = {commentId: string, blockId?: string | null} & (
    {type: 'comment_create' | 'block_comment_create', json: {x: number, y: number, width: number, height: number}} |
    {type: 'comment_change' | 'block_comment_change', newContents_: string} |
    {type: 'comment_move' | 'block_comment_move', newCoordinate_: {x: number, y: number}} |
    {type: 'comment_collapse' | 'block_comment_collapse', newCollapsed: boolean} |
    {type: 'comment_resize' | 'block_comment_resize', newSize: {width: number, height: number}} |
    {type: 'comment_delete' | 'block_comment_delete'}
);

/** The Blockly events the VM reads, with only the fields it reads; other events are ignored. */
export type WorkspaceEvent = BlockEvent | VariableEvent | CommentEvent;

/** Fields holding a variable, list or broadcast ID, whose value the VM shows as the variable's name. */
const VARIABLE_FIELDS = ['VARIABLE', 'LIST', 'BROADCAST_OPTION'];

const isVariableEvent = (e: WorkspaceEvent): e is VariableEvent =>
    e.type === 'var_create' || e.type === 'var_rename' || e.type === 'var_delete';

const isCommentEvent = (e: WorkspaceEvent): e is CommentEvent =>
    e.type.startsWith('comment_') || e.type.startsWith('block_comment_');

/** Applies the editor's Blockly events to the runtime: one listener per workspace the GUI attaches. */
class WorkspaceListener {
    runtime: Runtime;

    constructor (runtime: Runtime) {
        this.runtime = runtime;
    }

    /** Events of the main workspace, which shows the editing target. */
    blockListener (e: WorkspaceEvent) {
        const target = this.runtime.getEditingTarget();
        // The workspace fires events before a project gives it a target
        if (!target) return;
        if (isVariableEvent(e)) {
            this._variableEvent(e);
        } else if (isCommentEvent(e)) {
            this._commentEvent(target, e);
        } else {
            this._blockEvent(target.blocks, e);
        }
    }

    flyoutBlockListener (e: WorkspaceEvent) {
        if (isVariableEvent(e) || isCommentEvent(e)) return;
        this._blockEvent(this.runtime.flyoutBlocks, e);
    }

    /** Flyout events for the monitor blocks, which only follow creation and changes, and own the checkboxes. */
    monitorBlockListener (e: WorkspaceEvent) {
        const blocks = this.runtime.monitorBlocks;
        if (e.type === 'create') {
            this._blockEvent(blocks, e);
        } else if (e.type === 'change') {
            if (e.element === 'checkbox') {
                this.runtime.setBlockMonitored(e.blockId, e.newValue);
                return;
            }
            this._blockEvent(blocks, e);
            if (e.element === 'field' && !VARIABLE_FIELDS.includes(e.name)) {
                this._updateMonitorParams(blocks, e.blockId);
            }
        }
    }

    /** Events of the workspace variable map, whose variables live on the stage. */
    variableListener (e: WorkspaceEvent) {
        if (isVariableEvent(e)) {
            this._variableEvent(e);
        }
    }

    private _blockEvent (blocks: Blocks, e: BlockEvent) {
        switch (e.type) {
        case 'create':
            // One event creates a whole stack
            for (const block of adapter(e)) {
                blocks.createBlock(block);
            }
            break;
        case 'change':
            this._changeEvent(blocks, e);
            break;
        case 'block_field_intermediate_change':
            // Fires on every keystroke, so it skips the project-changed event
            blocks.changeFieldWhileEditing(e.blockId, e.name, e.newValue);
            break;
        case 'move':
            blocks.moveBlock({
                id: e.blockId,
                oldParent: e.oldParentId,
                oldInput: e.oldInputName,
                newParent: e.newParentId,
                newInput: e.newInputName,
                newCoordinate: e.newCoordinate
            });
            break;
        case 'delete': {
            const block = blocks.getBlock(e.blockId);
            // A shadow is only obscured, not deleted
            if (!block || block.shadow) return;
            if (block.topLevel) {
                this.runtime.quietGlow(e.blockId);
            }
            blocks.deleteBlock(e.blockId);
            break;
        }
        case 'dragOutside':
            this.runtime.emitBlockDragUpdate(e.isOutside);
            break;
        case 'endDrag':
            this.runtime.emitBlockDragUpdate(false);
            // Blocks dropped on the GUI, e.g. onto the backpack
            if (e.isOutside) {
                this.runtime.emitBlockEndDrag(adapter(e), e.blockId);
            }
            break;
        case 'click':
            if (e.targetType === 'block') {
                this.runtime.toggleScript(blocks.getTopLevelScript(e.blockId), {stackClick: true});
            }
            break;
        }
    }

    private _changeEvent (blocks: Blocks, e: ChangeEvent) {
        switch (e.element) {
        case 'field':
            if (VARIABLE_FIELDS.includes(e.name)) {
                // The field's value is the variable ID; the block shows its name
                const variableId = String(e.newValue);
                const variable = this._editingTarget('field change').lookupVariableById(variableId);
                if (variable) {
                    blocks.changeField(e.blockId, e.name, variable.name, variableId);
                }
            } else {
                blocks.changeField(e.blockId, e.name, e.newValue);
            }
            break;
        case 'mutation':
            blocks.changeMutation(e.blockId, mutationAdapter(e.newValue));
            break;
        // Checkboxes are handled once, by monitorBlockListener
        }
    }

    /** A monitor's label shows its block's arguments, so a changed menu, maybe in a shadow, updates it. */
    private _updateMonitorParams (blocks: Blocks, blockId: string) {
        const block = blocks.getBlock(blockId);
        if (!block) return;
        const monitored = block.shadow && block.parent ? blocks.getBlock(block.parent) : block;
        if (monitored?.isMonitored) {
            this.runtime.requestUpdateMonitor(Map({
                id: monitored.id,
                params: blocks.getBlockParams(monitored)
            }));
        }
    }

    private _variableEvent (e: VariableEvent) {
        const runtime = this.runtime;
        const editingTarget = runtime.getEditingTarget();
        switch (e.type) {
        case 'var_create':
            // A local variable on the stage, or with no editing target, is created global
            if (e.isLocal && editingTarget && !editingTarget.isStage) {
                if (editingTarget.lookupVariableById(e.varId)) return;
                editingTarget.createVariable(e.varId, e.varName, e.varType, e.dataType);
            } else {
                const stage = this._stage(e.type);
                if (stage.lookupVariableById(e.varId)) return;
                // A global can't share a name with any target's variable
                if (runtime.targets.some(target => target.lookupVariableByNameAndType(e.varName, e.varType, true))) {
                    return;
                }
                stage.createVariable(e.varId, e.varName, e.varType, e.dataType);
            }
            break;
        case 'var_rename':
            if (editingTarget && Object.hasOwn(editingTarget.variables, e.varId)) {
                editingTarget.renameVariable(e.varId, e.newName);
                editingTarget.blocks.updateBlocksAfterVarRename(e.varId, e.newName);
            } else {
                this._stage(e.type).renameVariable(e.varId, e.newName);
                // Any target's blocks can use a global
                for (const target of runtime.targets) {
                    target.blocks.updateBlocksAfterVarRename(e.varId, e.newName);
                }
            }
            break;
        case 'var_delete': {
            const isLocal = editingTarget && Object.hasOwn(editingTarget.variables, e.varId);
            (isLocal ? editingTarget : this._stage(e.type)).deleteVariable(e.varId);
            break;
        }
        }
        runtime.emitProjectChanged();
    }

    private _commentEvent (target: Target, e: CommentEvent) {
        const comment = target.comments[e.commentId];
        const action = e.type.replace('block_', '').replace('comment_', '');
        if (!comment && action !== 'create') {
            // Events can arrive from the workspace of a target just switched away from
            if (action !== 'delete') {
                log.warn(`Cannot ${action} comment with id ${e.commentId} because it does not exist.`);
            }
            return;
        }
        switch (e.type) {
        case 'comment_create':
        case 'block_comment_create':
            target.createComment(e.commentId, e.blockId, '', e.json.x, e.json.y, e.json.width, e.json.height, false);
            break;
        case 'comment_change':
        case 'block_comment_change':
            comment.text = e.newContents_;
            break;
        case 'comment_move':
        case 'block_comment_move':
            comment.x = e.newCoordinate_.x;
            comment.y = e.newCoordinate_.y;
            break;
        case 'comment_collapse':
        case 'block_comment_collapse':
            comment.minimized = e.newCollapsed;
            break;
        case 'comment_resize':
        case 'block_comment_resize':
            comment.width = e.newSize.width;
            comment.height = e.newSize.height;
            break;
        case 'comment_delete':
        case 'block_comment_delete':
            delete target.comments[e.commentId];
            if (e.blockId) {
                const block = target.blocks.getBlock(e.blockId);
                if (block) {
                    delete block.comment;
                } else {
                    log.warn(`Could not find block referenced by comment with id: ${e.commentId}`);
                }
            }
            break;
        }
        this.runtime.emitProjectChanged();
    }

    private _editingTarget (caller: string): Target {
        const target = this.runtime.getEditingTarget();
        if (!target) {
            throw new Error(`WorkspaceListener: ${caller} needs the editing target, but there is none`);
        }
        return target;
    }

    private _stage (caller: string): Target {
        const stage = this.runtime.getTargetForStage();
        if (!stage) {
            throw new Error(`WorkspaceListener: ${caller} needs the stage, but the runtime has none`);
        }
        return stage;
    }
}

export default WorkspaceListener;
