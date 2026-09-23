import {Map} from 'immutable';

import Blocks, {type VariableReference} from './blocks';
import Comment from './comment';
import Variable, {type VariableType} from './variable';
import log from '../util/log';
import StringUtil from '../util/string-util';
import uid from '../util/uid';
import VariableUtil from '../util/variable-util';
import type Runtime from './runtime';

/** A code-running object, the stage or a device: owns blocks, variables and comments, and hat and extension state. */
class Target {
    runtime: Runtime;
    id = uid();
    name = '';
    blocks: Blocks;
    variables: Record<string, Variable> = {};
    comments: Record<string, Comment> = {};
    isStage = false;
    /** Per-extension state, keyed by the extension's state key. */
    _customState: Record<string, unknown> = {};
    /** Last known value of each edge-activated hat, keyed by hat block ID. */
    _edgeActivatedHatValues: Record<string, unknown> = {};

    constructor (runtime: Runtime, blocks?: Blocks | null) {
        this.runtime = runtime;
        this.blocks = blocks ?? new Blocks(runtime.events);
    }

    onGreenFlag () {}

    onStopAll () {}

    getName (): string {
        return this.name;
    }

    /** Stores a new edge-activated hat value and returns the previous one. */
    updateEdgeActivatedValue (blockId: string, newValue: unknown): unknown {
        const oldValue = this._edgeActivatedHatValues[blockId];
        this._edgeActivatedHatValues[blockId] = newValue;
        return oldValue;
    }

    hasEdgeActivatedValue (blockId: string): boolean {
        return Object.hasOwn(this._edgeActivatedHatValues, blockId);
    }

    clearEdgeActivatedValues () {
        this._edgeActivatedHatValues = {};
    }

    /** Finds a variable by ID, then by name, creating a local one if neither matches. */
    lookupOrCreateVariable (id: string, name: string): Variable {
        return this.lookupVariableById(id) ??
            this.lookupVariableByNameAndType(name, Variable.SCALAR_TYPE) ??
            (this.variables[id] = new Variable(id, name, Variable.SCALAR_TYPE));
    }

    /** Finds a broadcast message by ID, or by name when there is no ID; logs a mismatched name or type. */
    lookupBroadcastMsg (id: string | null, name?: string): Variable | undefined {
        let broadcastMsg: Variable | undefined;
        if (id) {
            broadcastMsg = this.lookupVariableById(id);
        } else if (name) {
            broadcastMsg = this.lookupBroadcastByInputValue(name);
        } else {
            log.error('Cannot find broadcast message if neither id nor name are provided.');
        }
        if (broadcastMsg) {
            if (name && (broadcastMsg.name.toLowerCase() !== name.toLowerCase())) {
                log.error(`Found broadcast message with id: ${id}, but` +
                    `its name, ${broadcastMsg.name} did not match expected name ${name}.`);
            }
            if (broadcastMsg.type !== Variable.BROADCAST_MESSAGE_TYPE) {
                log.error(`Found variable with id: ${id}, but its type ${broadcastMsg.type}` +
                    `did not match expected type ${Variable.BROADCAST_MESSAGE_TYPE}`);
            }
            return broadcastMsg;
        }
    }

    /** Finds a broadcast message by name, case-insensitively; never creates one. */
    lookupBroadcastByInputValue (name: string): Variable | undefined {
        return Object.values(this.variables).find(variable =>
            variable.type === Variable.BROADCAST_MESSAGE_TYPE &&
            variable.name.toLowerCase() === name.toLowerCase());
    }

    /** Finds a local variable, then a global one. */
    lookupVariableById (id: string): Variable | undefined {
        if (Object.hasOwn(this.variables, id)) {
            return this.variables[id];
        }
        if (!this.isStage) {
            const stage = this.runtime.getTargetForStage();
            if (stage && Object.hasOwn(stage.variables, id)) {
                return stage.variables[id];
            }
        }
    }

    /** Finds a local variable by name and type, then a global one unless `skipStage`. */
    lookupVariableByNameAndType (
        name: string, type: VariableType = Variable.SCALAR_TYPE, skipStage = false
    ): Variable | null {
        // JS callers pass unchecked field values
        if (typeof name !== 'string') return null;
        const matches = (variable: Variable) => variable.name === name && variable.type === type;

        const local = Object.values(this.variables).find(matches);
        if (local) return local;

        if (!skipStage && !this.isStage) {
            const stage = this.runtime.getTargetForStage();
            if (stage) {
                return Object.values(stage.variables).find(matches) ?? null;
            }
        }
        return null;
    }

    /** Finds a list by ID, then by name, creating a local one if neither matches. */
    lookupOrCreateList (id: string, name: string): Variable {
        return this.lookupVariableById(id) ??
            this.lookupVariableByNameAndType(name, Variable.LIST_TYPE) ??
            (this.variables[id] = new Variable(id, name, Variable.LIST_TYPE));
    }

    /** Adds a local variable unless one with this ID exists; `dataType` is its generated-code type. */
    createVariable (id: string, name: string, type: VariableType, dataType?: unknown) {
        if (!Object.hasOwn(this.variables, id)) {
            this.variables[id] = new Variable(id, name, type, dataType);
        }
    }

    /** Adds a comment unless one with this ID exists; a `blockId` attaches it to that block. */
    createComment (id: string, blockId: string | null, text: string, x: number, y: number,
        width: number, height: number, minimized?: boolean) {
        if (Object.hasOwn(this.comments, id)) return;
        const newComment = new Comment(id, text, x, y, width, height, minimized);
        if (blockId) {
            newComment.blockId = blockId;
            const blockWithComment = this.blocks.getBlock(blockId);
            if (blockWithComment) {
                blockWithComment.comment = id;
            } else {
                log.warn(`Could not find block with id ${blockId} associated with commentId: ${id}`);
            }
        }
        this.comments[id] = newComment;
    }

    /** Renames a local variable and its monitor, whose label shows the name. */
    renameVariable (id: string, newName: string) {
        if (!Object.hasOwn(this.variables, id)) return;
        const variable = this.variables[id];
        if (variable.id !== id) return;
        variable.name = newName;

        const monitorBlocks = this.runtime.monitorBlocks;
        monitorBlocks.changeField(id, variable.type === Variable.LIST_TYPE ? 'LIST' : 'VARIABLE', newName, id);
        const monitorBlock = monitorBlocks.getBlock(id);
        if (monitorBlock) {
            this.runtime.requestUpdateMonitor(Map({
                id,
                params: monitorBlocks.getBlockParams(monitorBlock)
            }));
        }
    }

    /** Deletes a local variable and its monitor. */
    deleteVariable (id: string) {
        if (!Object.hasOwn(this.variables, id)) return;
        delete this.variables[id];
        this.runtime.monitorBlocks.deleteBlock(id);
        this.runtime.requestRemoveMonitor(id);
    }

    /**
     * Removes this target's monitors and monitor blocks: its sprite-specific ones, or for the stage its
     * global variables. Other stage monitors stay.
     */
    deleteMonitors () {
        this.runtime.requestRemoveMonitorByTargetId(this.id);
        const monitorBlocks = this.runtime.monitorBlocks;
        const monitorBlockIds = this.isStage ?
            Object.keys(this.variables) :
            Object.keys(monitorBlocks._blocks).filter(key => monitorBlocks._blocks[key].targetId === this.id);
        for (const blockId of monitorBlockIds) {
            monitorBlocks.deleteBlock(blockId);
        }
    }

    getCustomState (stateId: string): unknown {
        return this._customState[stateId];
    }

    setCustomState (stateId: string, newValue: unknown) {
        this._customState[stateId] = newValue;
    }

    /** Stops the target's threads and takes it out of execution. */
    dispose () {
        this.runtime.stopForTarget(this);
        this.runtime.removeExecutable(this);
        this.runtime.fireTargetWasRemoved(this);
        this._customState = {};
    }

    /** The target as a plain object, for events about it. */
    toJSON () {
        return {
            id: this.id,
            name: this.getName(),
            isStage: this.isStage,
            comments: this.comments,
            blocks: this.blocks._blocks,
            variables: this.variables
        };
    }

    /** Names of the variables of `type` this target can use: its own, plus the stage's unless `skipStage`. */
    getAllVariableNamesInScopeByType (type: VariableType = Variable.SCALAR_TYPE, skipStage = false): string[] {
        const targetVariables = Object.values(this.variables)
            .filter(variable => variable.type === type)
            .map(variable => variable.name);
        if (skipStage || this.isStage) {
            return targetVariables;
        }
        return targetVariables.concat(this._stage('getAllVariableNamesInScopeByType')
            .getAllVariableNamesInScopeByType(type));
    }

    /**
     * Points variable references at another variable, optionally renaming them.
     * `optReferencesToUpdate` defaults to every reference to `idToBeMerged` in this target's blocks.
     */
    mergeVariables (idToBeMerged: string, idToMergeWith: string, optReferencesToUpdate?: VariableReference[],
        optNewName?: string) {
        const referencesToChange = optReferencesToUpdate ||
            this.blocks.getAllVariableAndListReferences()[idToBeMerged];
        VariableUtil.updateVariableIdentifiers(referencesToChange, idToMergeWith, optNewName);
    }

    /**
     * Gives every variable, list and broadcast this target's blocks reference a definition, without renaming
     * existing variables. A reference to an ID defined nowhere moves to a same-name, same-type global, or to
     * a new global with an unused name. Project load runs this to repair dangling references; sprite import
     * and backpack paste run it through `fixUpVariableReferences`.
     */
    reconcileVariableReferences () {
        const stage = this.runtime.getTargetForStage();
        if (!stage) return;

        const allReferences = this.blocks.getAllVariableAndListReferences(null, true);
        const conflictIdsToReplace: Record<string, string> = Object.create(null);
        const conflictNamesToReplace: Record<string, string> = Object.create(null);
        // Dangling references sharing an original name and type almost always mean one variable, so later
        // ones reuse the global the first one created, even when its name was bumped
        const createdForOriginalName: Record<string, {id: string, freshName: string}> = Object.create(null);
        const originalNameKey = (name: string, type: VariableType) => `${type}\u0000${name}`;

        const varNamesByType: Partial<Record<VariableType, string[]>> = {};
        const allVarNames = (type: VariableType) => (varNamesByType[type] ??= this.runtime.getAllVarNamesOfType(type));

        for (const varId of Object.keys(allReferences)) {
            const existing = this.lookupVariableById(varId);
            if (existing) {
                // An earlier target's pass may have bumped the name, so every reference must show the current one
                if (!conflictNamesToReplace[varId]) {
                    const staleRef = allReferences[varId].find(ref => ref.referencingField.value !== existing.name);
                    if (staleRef) {
                        conflictNamesToReplace[varId] = existing.name;
                        log.warn(
                            `Reconciled stale displayed name on '${this.getName()}': updated to ` +
                            `'${existing.name}' for id '${varId}' ` +
                            `(was '${staleRef.referencingField.value}').`
                        );
                    }
                }
                continue;
            }
            // Defined nowhere: a global from another project, or lost by a backpack paste or sprite import
            const varRef = allReferences[varId][0];
            const varName = varRef.referencingField.value as string;
            const varType = varRef.type;
            const existingVar = stage.lookupVariableByNameAndType(varName, varType);
            if (existingVar) {
                if (!conflictIdsToReplace[varId]) {
                    conflictIdsToReplace[varId] = existingVar.id;
                    log.warn(
                        `Reconciled dangling reference on '${this.getName()}': remapped id '${varId}' ` +
                        `(name '${varName}', type '${varType}') to existing stage variable '${existingVar.id}'.`
                    );
                }
                continue;
            }
            const coalesceKey = originalNameKey(varName, varType);
            const earlierCreated = createdForOriginalName[coalesceKey];
            if (earlierCreated) {
                // Show the bumped name too, so both blocks display the variable alike
                if (!conflictIdsToReplace[varId]) {
                    conflictIdsToReplace[varId] = earlierCreated.id;
                    conflictNamesToReplace[varId] = earlierCreated.freshName;
                    log.warn(
                        `Reconciled dangling reference on '${this.getName()}': coalesced id '${varId}' ` +
                        `(name '${varName}', type '${varType}') with earlier-created stage variable ` +
                        `'${earlierCreated.id}' (name '${earlierCreated.freshName}').`
                    );
                }
                continue;
            }
            const allNames = allVarNames(varType);
            const freshName = StringUtil.unusedName(varName, allNames);
            stage.createVariable(varId, freshName, varType);
            // Later unusedName calls in this pass must see the new name
            allNames.push(freshName);
            createdForOriginalName[coalesceKey] = {id: varId, freshName};
            if (!conflictNamesToReplace[varId]) {
                conflictNamesToReplace[varId] = freshName;
                log.warn(
                    `Reconciled dangling reference on '${this.getName()}': created stage variable ` +
                    `'${varId}' (name '${freshName}', type '${varType}').`
                );
            }
        }

        for (const [conflictId, existingId] of Object.entries(conflictIdsToReplace)) {
            this.mergeVariables(conflictId, existingId, allReferences[conflictId]);
        }
        for (const [conflictId, newName] of Object.entries(conflictNamesToReplace)) {
            for (const ref of allReferences[conflictId]) {
                ref.referencingField.value = newName;
            }
        }
    }

    /**
     * Reconciles missing definitions, then renames sprite-local variables that share a name with a global
     * so both stay distinguishable. For sprite import and backpack paste; project load only reconciles, since
     * a saved local may legitimately share a global's name.
     */
    fixUpVariableReferences () {
        const stage = this.runtime.getTargetForStage();
        if (!stage) return;

        this.reconcileVariableReferences();
        // The stage's variables are the globals, so nothing can collide
        if (this.isStage) return;

        const renameConflictingLocalVar = (id: string, name: string, type: VariableType): string | null => {
            if (!stage.lookupVariableByNameAndType(name, type)) return null;
            const newName = StringUtil.unusedName(
                `${this.getName()}: ${name}`,
                this.getAllVariableNamesInScopeByType(type));
            this.renameVariable(id, newName);
            return newName;
        };

        const allReferences = this.blocks.getAllVariableAndListReferences(null, true);
        for (const [varId, refs] of Object.entries(allReferences)) {
            if (!Object.hasOwn(this.variables, varId)) continue;
            const newVarName = renameConflictingLocalVar(varId, refs[0].referencingField.value as string, refs[0].type);
            if (newVarName) {
                for (const ref of refs) {
                    ref.referencingField.value = newVarName;
                }
            }
        }

        // Unreferenced locals too, so the sprite stays consistent
        for (const [localVarId, variable] of Object.entries(this.variables)) {
            if (allReferences[localVarId]) continue;
            renameConflictingLocalVar(localVarId, variable.name, variable.type);
        }
    }

    /** The stage, which callers that read globals require. */
    private _stage (caller: string): Target {
        const stage = this.runtime.getTargetForStage();
        if (!stage) {
            throw new Error(`Target.${caller}: target ${this.id} needs the stage, but the runtime has none`);
        }
        return stage;
    }
}

export default Target;
