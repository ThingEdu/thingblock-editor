import Clone from '../util/clone';
import log from '../util/log';
import xmlEscape from '../util/xml-escape';
import Variable, {type VariableType} from './variable';
import {RuntimeEventNames, type RuntimeEmitter} from './runtime/runtime-events';
import type {Block, BlockField, BlockInput} from './block-types';
import type {RuntimeScriptCache} from './blocks-runtime-cache';
import type Comment from './comment';
import type {Mutation} from './mutation-adapter';

/** A procedure's argument names, ids and default values, parsed from its prototype's mutation. */
export type ProcedureParams = [names: string[], ids: string[], defaults: unknown[]];

export interface MonitoredBlock {
    blockId: string
    /** The target a sprite-specific monitor reads from; null for global monitors. */
    targetId: string | null
}

export interface VariableReference {
    referencingField: BlockField
    type: VariableType
}

/** A Blockly move event: the block's old and new connection, and its new workspace position. */
export interface BlockMove {
    id: string
    oldParent?: string
    oldInput?: string
    newParent?: string
    newInput?: string
    newCoordinate?: {x: number, y: number}
}

/** Data derived from the blocks; cleared on every change. */
export interface BlocksCache {
    /** Non-branch inputs by block ID. */
    inputs: Record<string, Record<string, BlockInput>>
    procedureParamNames: Record<string, ProcedureParams | null>
    /** Outer define block ID by proccode. */
    procedureDefinitions: Record<string, string | null>
    /** Owned by blocks-execute-cache. */
    _executeCached: Record<string, unknown>
    _monitored: MonitoredBlock[] | null
    /** Hat scripts by opcode; owned by blocks-runtime-cache. */
    scripts: Record<string, RuntimeScriptCache[]>
}

const emptyCache = (): BlocksCache => ({
    inputs: {},
    procedureParamNames: {},
    procedureDefinitions: {},
    _executeCached: {},
    _monitored: null,
    scripts: {}
});

/** Stores the blocks of one workspace: a target's scripts, the flyout, or the monitors. */
class Blocks {
    /** Inputs whose names start with this hold statement branches. */
    static readonly BRANCH_INPUT_PREFIX = 'SUBSTACK';

    events: RuntimeEmitter;
    /** Set for the flyout and monitor containers: their blocks don't glow while running or change the project. */
    forceNoGlow: boolean;
    _blocks: Record<string, Block> = {};
    /** Top block IDs of the scripts. */
    _scripts: string[] = [];
    declare _cache: BlocksCache;

    constructor (events: RuntimeEmitter, forceNoGlow = false) {
        this.events = events;
        this.forceNoGlow = forceNoGlow;
        // Non-enumerable so cloning and comparing containers skip derived data.
        Object.defineProperty(this, '_cache', {writable: true, enumerable: false, value: emptyCache()});
    }

    getBlock (blockId: string): Block | undefined {
        return this._blocks[blockId];
    }

    getScripts (): string[] {
        return this._scripts;
    }

    getNextBlock (id: string): string | null {
        const block = this._blocks[id];
        return typeof block === 'undefined' ? null : block.next;
    }

    /** The first block in a C-block's branch; `branchNum` 2 is the else branch. */
    getBranch (id: string, branchNum?: number): string | null {
        const block = this._blocks[id];
        if (typeof block === 'undefined') return null;
        const inputName = branchNum > 1 ? `${Blocks.BRANCH_INPUT_PREFIX}${branchNum}` : Blocks.BRANCH_INPUT_PREFIX;
        return block.inputs[inputName]?.block ?? null;
    }

    getOpcode (block: Block | undefined): string | null {
        return typeof block === 'undefined' ? null : block.opcode;
    }

    getFields (block: Block | undefined): Record<string, BlockField> | null {
        return typeof block === 'undefined' ? null : block.fields;
    }

    /** The block's inputs other than statement branches. */
    getInputs (block: Block | undefined): Record<string, BlockInput> | null {
        if (typeof block === 'undefined') return null;
        this._cache.inputs[block.id] ??= Object.fromEntries(Object.entries(block.inputs)
            .filter(([name]) => !name.startsWith(Blocks.BRANCH_INPUT_PREFIX)));
        return this._cache.inputs[block.id];
    }

    getMutation (block: Block | undefined): Mutation | null {
        return typeof block === 'undefined' ? null : block.mutation;
    }

    getTopLevelScript (id: string): string | null {
        let block = this._blocks[id];
        if (typeof block === 'undefined') return null;
        while (block.parent !== null) {
            block = this._blocks[block.parent];
        }
        return block.id;
    }

    /** The ID of the outer define block for the procedure `name`. */
    getProcedureDefinition (name: string): string | null {
        if (Object.hasOwn(this._cache.procedureDefinitions, name)) {
            return this._cache.procedureDefinitions[name];
        }
        const definition = Object.values(this._blocks).find(block => block.opcode === 'procedures_definition' &&
            this._getCustomBlockInternal(block)?.mutation.proccode === name);
        this._cache.procedureDefinitions[name] = definition ? definition.id : null;
        return this._cache.procedureDefinitions[name];
    }

    getProcedureParamNamesAndIds (name: string): [names: string[], ids: string[]] {
        const params = this.getProcedureParamNamesIdsAndDefaults(name);
        if (!params) throw new Error(`Blocks.getProcedureParamNamesAndIds: no prototype for procedure ${name}`);
        return [params[0], params[1]];
    }

    getProcedureParamNamesIdsAndDefaults (name: string): ProcedureParams | null {
        if (Object.hasOwn(this._cache.procedureParamNames, name)) {
            return this._cache.procedureParamNames[name];
        }
        const prototype = Object.values(this._blocks).find(block => block.opcode === 'procedures_prototype' &&
            block.mutation.proccode === name);
        this._cache.procedureParamNames[name] = prototype ? [
            JSON.parse(prototype.mutation.argumentnames),
            JSON.parse(prototype.mutation.argumentids),
            JSON.parse(prototype.mutation.argumentdefaults)
        ] : null;
        return this._cache.procedureParamNames[name];
    }

    duplicate (): Blocks {
        const newBlocks = new Blocks(this.events, this.forceNoGlow);
        newBlocks._blocks = Clone.simple(this._blocks);
        newBlocks._scripts = Clone.simple(this._scripts);
        return newBlocks;
    }

    resetCache () {
        this._cache = emptyCache();
    }

    emitProjectChanged () {
        if (!this.forceNoGlow) {
            this.events.emit(RuntimeEventNames.PROJECT_CHANGED);
        }
    }

    /** Adds a block; one that already exists, such as an unobscured shadow, is ignored. */
    createBlock (block: Block) {
        if (Object.hasOwn(this._blocks, block.id)) return;
        this._blocks[block.id] = block;
        if (block.topLevel && !block.shadow) {
            this._addScript(block.id);
        }
        this.resetCache();
        this.emitProjectChanged();
    }

    /** Sets a field's value; variable, list and broadcast fields also take the referenced ID. */
    changeField (blockId: string, name: string, value: string | number, fieldId?: string) {
        const field = this._blocks[blockId]?.fields[name];
        if (!field) return;
        field.value = value;
        if (typeof fieldId !== 'undefined') {
            field.id = fieldId;
        }
        this.emitProjectChanged();
        this.resetCache();
    }

    /** Sets a field while it is being typed in, so running scripts see it; skips the project-changed event. */
    changeFieldWhileEditing (blockId: string, name: string, value: string | number) {
        const field = this._blocks[blockId]?.fields[name];
        if (!field) return;
        field.value = value;
        this._cache._executeCached = {};
    }

    changeMutation (blockId: string, mutation: Mutation) {
        const block = this._blocks[blockId];
        if (!block) return;
        block.mutation = mutation;
        this.emitProjectChanged();
        this.resetCache();
    }

    /** Applies a Blockly move: detaches the block from its old parent and attaches it to the new one. */
    moveBlock (e: BlockMove) {
        if (!Object.hasOwn(this._blocks, e.id)) return;

        const block = this._blocks[e.id];
        // Only real changes count, not routine repositioning while a workspace loads.
        let didChange = false;

        if (e.newCoordinate) {
            didChange = (block.x !== e.newCoordinate.x) || (block.y !== e.newCoordinate.y);
            block.x = e.newCoordinate.x;
            block.y = e.newCoordinate.y;
        }

        if (typeof e.oldParent !== 'undefined') {
            const oldParent = this._blocks[e.oldParent];
            if (typeof e.oldInput !== 'undefined' && oldParent.inputs[e.oldInput].block === e.id) {
                // Restore the shadow the block covered, or empty the input.
                const oldInput = oldParent.inputs[e.oldInput];
                const shadow = oldInput.shadow;
                if (shadow && e.id !== shadow) {
                    if (this._blocks[shadow]) {
                        oldInput.block = shadow;
                        this._blocks[shadow].parent = oldParent.id;
                    } else {
                        // Clear a reference to a missing shadow rather than crash on it.
                        oldInput.block = null;
                        oldInput.shadow = null;
                    }
                    block.parent = null;
                } else {
                    oldInput.block = null;
                    if (e.id !== shadow) {
                        block.parent = null;
                    }
                }
            } else if (oldParent.next === e.id) {
                oldParent.next = null;
                block.parent = null;
            }
            didChange = true;
        }

        if (typeof e.newParent === 'undefined') {
            if (!block.shadow) {
                this._addScript(e.id);
            }
        } else {
            this._deleteScript(e.id);
            const newParent = this._blocks[e.newParent];
            if (typeof e.newInput === 'undefined') {
                newParent.next = e.id;
            } else {
                // Keep the input's shadow; a shadow being attached, as when adding procedure arguments, is its own.
                let oldShadow = Object.hasOwn(newParent.inputs, e.newInput) ?
                    newParent.inputs[e.newInput].shadow : null;
                if (block.shadow) oldShadow = e.id;
                newParent.inputs[e.newInput] = {
                    name: e.newInput,
                    block: e.id,
                    shadow: oldShadow
                };
            }
            block.parent = e.newParent;
            didChange = true;
        }
        this.resetCache();

        if (didChange) this.emitProjectChanged();
    }

    /** Blocks whose monitors are shown; the runtime starts a monitor script for each every step. */
    getMonitoredBlocks (): MonitoredBlock[] {
        this._cache._monitored ??= Object.keys(this._blocks)
            .filter(blockId => this._blocks[blockId].isMonitored)
            .map(blockId => ({blockId, targetId: this._blocks[blockId].targetId || null}));
        return this._cache._monitored;
    }

    /** Deletes a block with everything attached below and inside it; a missing ID does nothing. */
    deleteBlock (blockId: string) {
        const block = this._blocks[blockId];
        if (!block) return;

        if (block.next !== null) {
            this.deleteBlock(block.next);
        }
        for (const input of Object.values(block.inputs)) {
            // A null block means the input's block was moved away.
            if (input.block !== null) {
                this.deleteBlock(input.block);
            }
            if (input.shadow !== null && input.shadow !== input.block) {
                this.deleteBlock(input.shadow);
            }
        }

        this._deleteScript(blockId);
        delete this._blocks[blockId];

        this.resetCache();
        this.emitProjectChanged();
    }

    deleteAllBlocks () {
        Object.keys(this._blocks).forEach(blockId => this.deleteBlock(blockId));
    }

    /**
     * The fields referencing each variable or list, keyed by variable ID.
     * `optBlocks` limits the search, e.g. to a stack shared to another target.
     */
    getAllVariableAndListReferences (
        optBlocks?: Record<string, Block> | Block[] | null,
        optIncludeBroadcast?: boolean
    ): Record<string, VariableReference[]> {
        const blocks = optBlocks ?? this._blocks;
        const allReferences: Record<string, VariableReference[]> = Object.create(null);
        for (const block of Object.values(blocks)) {
            let reference: VariableReference | null = null;
            if (block.fields.VARIABLE) {
                reference = {referencingField: block.fields.VARIABLE, type: Variable.SCALAR_TYPE};
            } else if (block.fields.LIST) {
                reference = {referencingField: block.fields.LIST, type: Variable.LIST_TYPE};
            } else if (optIncludeBroadcast && block.fields.BROADCAST_OPTION) {
                reference = {referencingField: block.fields.BROADCAST_OPTION, type: Variable.BROADCAST_MESSAGE_TYPE};
            }
            if (reference) {
                (allReferences[reference.referencingField.id] ??= []).push(reference);
            }
        }
        return allReferences;
    }

    updateBlocksAfterVarRename (varId: string, newName: string) {
        for (const block of Object.values(this._blocks)) {
            const field = block.fields.VARIABLE ?? block.fields.LIST;
            if (field && field.id === varId) {
                field.value = newName;
            }
        }
    }

    /** Points sound menus using the old name at the renamed sound. */
    updateSoundName (oldName: string, newName: string) {
        for (const block of Object.values(this._blocks)) {
            const field = block.fields.SOUND_MENU;
            if (field && field.value === oldName) {
                field.value = newName;
            }
        }
    }

    /** Serializes the scripts as scratch-blocks workspace XML; `comments` supplies the attached comments. */
    toXML (comments?: Record<string, Comment>): string {
        return this._scripts.map(script => this.blockToXML(script, comments)).join();
    }

    /** Serializes a block and everything attached below and inside it. */
    blockToXML (blockId: string, comments?: Record<string, Comment>): string | undefined {
        const block = this._blocks[blockId];
        // Some saved blocks point `next` at a missing block; skipping it lets the project load.
        if (!block) return;
        const tagName = block.shadow ? 'shadow' : 'block';
        let xmlString =
            `<${tagName}
                id="${block.id}"
                type="${block.opcode}"
                ${block.topLevel ? `x="${block.x}" y="${block.y}"` : ''}
            >`;
        const commentId = block.comment;
        if (commentId) {
            if (!comments) {
                log.warn(`Cannot serialize comment with id: ${commentId}; no comment descriptions provided.`);
            } else if (Object.hasOwn(comments, commentId)) {
                xmlString += comments[commentId].toXML();
            } else {
                log.warn(`Could not find comment with id: ${commentId} in provided comment descriptions.`);
            }
        }
        // The mutation must come before the inputs.
        if (block.mutation) {
            xmlString += this.mutationToXML(block.mutation);
        }
        for (const blockInput of Object.values(block.inputs)) {
            if (!blockInput.block && !blockInput.shadow) continue;
            xmlString += `<value name="${blockInput.name}">`;
            if (blockInput.block) {
                xmlString += this.blockToXML(blockInput.block, comments);
            }
            if (blockInput.shadow && blockInput.shadow !== blockInput.block) {
                // Obscured shadow.
                xmlString += this.blockToXML(blockInput.shadow, comments);
            }
            xmlString += '</value>';
        }
        for (const blockField of Object.values(block.fields)) {
            xmlString += `<field name="${blockField.name}"`;
            if (blockField.id) {
                xmlString += ` id="${blockField.id}"`;
            }
            if (typeof blockField.variableType === 'string') {
                xmlString += ` variabletype="${blockField.variableType}"`;
            }
            const value = typeof blockField.value === 'string' ? xmlEscape(blockField.value) : blockField.value;
            xmlString += `>${value}</field>`;
        }
        if (block.next) {
            xmlString += `<next>${this.blockToXML(block.next, comments)}</next>`;
        }
        xmlString += `</${tagName}>`;
        return xmlString;
    }

    mutationToXML (mutation: Mutation): string {
        let mutationString = `<${mutation.tagName}`;
        for (const prop in mutation) {
            if (prop === 'children' || prop === 'tagName') continue;
            const value = mutation[prop];
            // Extension blocks carry their block info as JSON.
            const mutationValue = prop === 'blockInfo' ? xmlEscape(JSON.stringify(value)) :
                (typeof value === 'string' ? xmlEscape(value) : value);
            mutationString += ` ${prop}="${mutationValue}"`;
        }
        mutationString += '>';
        for (const child of mutation.children) {
            mutationString += this.mutationToXML(child);
        }
        mutationString += `</${mutation.tagName}>`;
        return mutationString;
    }

    /** The field values of a block and of its input blocks, as reported to a new monitor. */
    getBlockParams (block: Block): Record<string, string | number> {
        const params: Record<string, string | number> = {};
        for (const key in block.fields) {
            params[key] = block.fields[key].value;
        }
        for (const input of Object.values(block.inputs)) {
            const inputBlock = this._blocks[input.block];
            for (const key in inputBlock.fields) {
                params[key] = inputBlock.fields[key].value;
            }
        }
        return params;
    }

    /** The prototype block inside a define block, which holds the procedure's mutation. */
    _getCustomBlockInternal (defineBlock: Block): Block | undefined {
        const customBlock = defineBlock.inputs?.custom_block;
        return customBlock && this._blocks[customBlock.block];
    }

    _addScript (topBlockId: string) {
        if (this._scripts.includes(topBlockId)) return;
        this._scripts.push(topBlockId);
        this._blocks[topBlockId].topLevel = true;
    }

    _deleteScript (topBlockId: string) {
        const i = this._scripts.indexOf(topBlockId);
        if (i > -1) this._scripts.splice(i, 1);
        if (this._blocks[topBlockId]) this._blocks[topBlockId].topLevel = false;
    }
}

export default Blocks;
