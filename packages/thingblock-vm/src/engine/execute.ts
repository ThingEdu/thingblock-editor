import {Map} from 'immutable';

import {getCached, type ExecuteCacheData} from './blocks-execute-cache';
import Thread from './thread';
import Cast from '../util/cast';
import log from '../util/log';
import type Blocks from './blocks';
import type {BlockField, BlockInput} from './block-types';
import type {Mutation} from './mutation-adapter';
import type Profiler from './profiler';
import type Runtime from './runtime';
import type {BlockFunction} from './runtime';
import type Sequencer from './sequencer';

const blockFunctionProfilerFrame = 'blockFunction';
let blockFunctionProfilerId = -1;

/** Argument values for one block; each block's argument object is reused for every run. */
type ArgValues = Record<string, any>;

const isPromise = (value: unknown): value is PromiseLike<unknown> =>
    value !== null && typeof value === 'object' && typeof (value as PromiseLike<unknown>).then === 'function';

/**
 * A block's execution data, derived once and kept until its container changes. `_ops` lists the block and the
 * reporters in its inputs in run order, so execute runs a flat loop instead of walking the input tree each time.
 */
export class BlockCached {
    id: string;
    opcode: string;
    fields: Record<string, BlockField>;
    inputs: Record<string, BlockInput>;
    mutation: Mutation | undefined;
    _profiler: Profiler | null = null;
    _profilerFrame: {count: number} | null = null;
    _isHat: boolean;
    _blockFunction: BlockFunction | undefined;
    _definedBlockFunction: boolean;
    /** A shadow block has no function and reports its single field's value. */
    _isShadowBlock: boolean;
    _shadowValue: unknown;
    /** Inputs still to evaluate at run time; custom_block and a shadow broadcast menu are resolved here. */
    _inputs: Record<string, BlockInput>;
    _argValues: ArgValues;
    /** The input name this block reports into, in its parent's `_argValues`. */
    _parentKey: string | null = null;
    _parentValues: ArgValues | null = null;
    _ops: BlockCached[] = [];

    constructor (runtime: Runtime, blockContainer: Blocks, cached: ExecuteCacheData) {
        this.id = cached.id;
        this.opcode = cached.opcode;
        this.fields = cached.fields;
        this.inputs = cached.inputs;
        this.mutation = cached.mutation;
        this._inputs = {...this.inputs};
        this._argValues = {mutation: this.mutation};

        const {opcode, fields, inputs} = this;
        this._isHat = runtime.getIsHat(opcode);
        this._blockFunction = runtime.getOpcodeFunction(opcode);
        this._definedBlockFunction = typeof this._blockFunction !== 'undefined';

        const fieldKeys = Object.keys(fields);
        this._isShadowBlock = !this._definedBlockFunction && fieldKeys.length === 1 && Object.keys(inputs).length === 0;
        this._shadowValue = this._isShadowBlock && fields[fieldKeys[0]].value;

        for (const fieldName in fields) {
            if (fieldName === 'VARIABLE' || fieldName === 'LIST' || fieldName === 'BROADCAST_OPTION') {
                this._argValues[fieldName] = {id: fields[fieldName].id, name: fields[fieldName].value};
            } else {
                this._argValues[fieldName] = fields[fieldName].value;
            }
        }

        // The procedure prototype is not executed
        delete this._inputs.custom_block;

        // Primitives read BROADCAST_INPUT as a BROADCAST_OPTION object that keeps its shape
        if ('BROADCAST_INPUT' in this._inputs) {
            this._argValues.BROADCAST_OPTION = {id: null, name: null};
            const broadcastInput = this._inputs.BROADCAST_INPUT;
            if (broadcastInput.block === broadcastInput.shadow) {
                // The menu shadow is static, so read it now instead of at every run
                const broadcastField = blockContainer.getBlock(broadcastInput.shadow).fields.BROADCAST_OPTION;
                this._argValues.BROADCAST_OPTION.id = broadcastField.id;
                this._argValues.BROADCAST_OPTION.name = broadcastField.value;
                delete this._inputs.BROADCAST_INPUT;
            }
        }

        for (const inputName in this._inputs) {
            const input = this._inputs[inputName];
            if (!input.block) continue;
            const inputCached = getCached(blockContainer, input.block,
                (blocks, data) => new BlockCached(runtime, blocks, data));
            if (inputCached._isHat) continue;

            this._ops.push(...inputCached._ops);
            inputCached._parentKey = inputName;
            inputCached._parentValues = this._argValues;
            if (inputCached._isShadowBlock) {
                this._argValues[inputName] = inputCached._shadowValue;
            }
        }

        // Last runs the block itself, when it is a command, hat or top-level reporter
        if (this._definedBlockFunction) {
            this._ops.push(this);
        }
    }
}

/** Stores a reporter's value in its parent's arguments; a broadcast input becomes the broadcast's name. */
const setParentValue = (opCached: BlockCached, value: unknown) => {
    const inputName = opCached._parentKey;
    const argValues = opCached._parentValues;
    if (inputName === 'BROADCAST_INPUT') {
        argValues.BROADCAST_OPTION.id = null;
        argValues.BROADCAST_OPTION.name = Cast.toString(value);
    } else {
        argValues[inputName] = value;
    }
};

/** Handles the value a block reported, directly or once its promise resolved. */
const handleReport = (
    resolvedValue: unknown,
    sequencer: Sequencer,
    thread: Thread,
    blockCached: BlockCached,
    lastOperation: boolean
) => {
    const {id: currentBlockId, opcode, _isHat: isHat} = blockCached;
    const runtime = sequencer.runtime;

    thread.pushReportedValue(resolvedValue);
    if (isHat) {
        if (runtime.getIsEdgeActivatedHat(opcode)) {
            // An edge-activated hat proceeds only when its value turns true, unless clicked
            if (!thread.stackClick) {
                const hasOldEdgeValue = thread.target.hasEdgeActivatedValue(currentBlockId);
                const oldEdgeValue = thread.target.updateEdgeActivatedValue(currentBlockId, resolvedValue);
                const edgeWasActivated = hasOldEdgeValue ? (!oldEdgeValue && resolvedValue) : resolvedValue;
                if (!edgeWasActivated) {
                    sequencer.retireThread(thread);
                }
            }
        } else if (!resolvedValue) {
            sequencer.retireThread(thread);
        }
        return;
    }

    // A top-level reporter shows its value in a bubble, or in its monitor
    if (lastOperation && typeof resolvedValue !== 'undefined' && thread.atStackTop()) {
        if (thread.stackClick) {
            runtime.visualReport(currentBlockId, resolvedValue);
        }
        if (thread.updateMonitor) {
            const monitorBlock = runtime.monitorBlocks.getBlock(currentBlockId);
            if (!monitorBlock) {
                throw new Error(`execute: monitor thread ${thread.topBlock} runs missing block ${currentBlockId}`);
            }
            const targetId = monitorBlock.targetId;
            // The monitor's target was deleted
            if (targetId && !runtime.getTargetById(targetId)) return;
            runtime.requestUpdateMonitor(Map({
                id: currentBlockId,
                spriteName: targetId ? runtime.getTargetById(targetId).getName() : null,
                value: resolvedValue
            }));
        }
    }
    thread.status = Thread.STATUS_RUNNING;
};

const handlePromise = (
    primitiveReportedValue: PromiseLike<unknown>,
    sequencer: Sequencer,
    thread: Thread,
    blockCached: BlockCached,
    lastOperation: boolean
) => {
    if (thread.status === Thread.STATUS_RUNNING) {
        thread.status = Thread.STATUS_PROMISE_WAIT;
    }
    primitiveReportedValue.then(resolvedValue => {
        handleReport(resolvedValue, sequencer, thread, blockCached, lastOperation);
        // A command block, or a top-level reporter on a clicked stack, moves the thread on
        if (!lastOperation) return;
        let stackFrame;
        let nextBlockId;
        do {
            // The promise may have ended its stack, so pop until a level has a next block or is a loop
            const popped = thread.popStack();
            if (popped === null) return;
            nextBlockId = thread.target.blocks.getNextBlock(popped);
            if (nextBlockId !== null) break;
            stackFrame = thread.peekStackFrame();
        } while (stackFrame !== null && !stackFrame.isLoop);

        thread.pushStack(nextBlockId);
    }, rejectionReason => {
        log.warn('Primitive rejected promise: ', rejectionReason);
        thread.status = Thread.STATUS_RUNNING;
        thread.popStack();
    });
};

/** Points each op of `blockCached` at a profiler counter for its opcode. */
const prepareBlockProfiling = (profiler: Profiler, blockCached: BlockCached) => {
    blockCached._profiler = profiler;
    if (blockFunctionProfilerId === -1) {
        blockFunctionProfilerId = profiler.idByName(blockFunctionProfilerFrame);
    }
    for (const op of blockCached._ops) {
        op._profilerFrame = profiler.frame(blockFunctionProfilerId, op.opcode);
    }
};

/** Runs the block on top of the thread's stack: its input reporters, then the block itself. */
const execute = (sequencer: Sequencer, thread: Thread) => {
    const runtime = sequencer.runtime;
    sequencer.util.thread = thread;

    const currentBlockId = thread.peekStack();
    const currentStackFrame = thread.peekStackFrame();

    let blockContainer = thread.blockContainer;
    let blockCached = getCached(blockContainer, currentBlockId, sequencer.buildBlockCached);
    if (blockCached === null) {
        blockContainer = runtime.flyoutBlocks;
        blockCached = getCached(blockContainer, currentBlockId, sequencer.buildBlockCached);
        // The script no longer exists
        if (blockCached === null) {
            sequencer.retireThread(thread);
            return;
        }
    }

    const ops = blockCached._ops;
    const length = ops.length;
    let i = 0;

    // Resuming after a promise: reinstate the values reported before it, then the one it resolved with
    if (currentStackFrame.reported !== null) {
        const reported = currentStackFrame.reported;
        for (; i < reported.length; i++) {
            const {opCached: oldOpCached, inputValue} = reported[i];
            const opCached = ops.find(op => op.id === oldOpCached);
            if (opCached) {
                setParentValue(opCached, inputValue);
            }
        }

        // Continue after the last reported op still in the block, since the script may have been edited
        if (reported.length > 0) {
            const lastExisting = reported.findLast(report => ops.some(op => op.id === report.opCached));
            i = lastExisting ? ops.findIndex(op => op.id === lastExisting.opCached) + 1 : 0;
        }

        // The op that was waiting must still exist and be next
        if (thread.justReported !== null && ops[i] && ops[i].id === currentStackFrame.reporting) {
            setParentValue(ops[i], thread.justReported);
            thread.justReported = null;
            i += 1;
        }

        currentStackFrame.reporting = null;
        currentStackFrame.reported = null;
    }

    const start = i;

    for (; i < length; i++) {
        const lastOperation = i === length - 1;
        const opCached = ops[i];

        // Glow as a script starts rather than after it ends (#1404); monitor and flyout containers never glow
        if (!blockContainer.forceNoGlow) {
            thread.requestScriptGlowInFrame = true;
        }

        const primitiveReportedValue = opCached._blockFunction(opCached._argValues, sequencer.util);

        if (isPromise(primitiveReportedValue)) {
            handlePromise(primitiveReportedValue, sequencer, thread, opCached, lastOperation);

            // Save the values reported so far; the resumed run reinstates them by block id
            thread.justReported = null;
            currentStackFrame.reporting = ops[i].id;
            currentStackFrame.reported = ops.slice(0, i).map(reportedCached => {
                const reportedValues = reportedCached._parentValues;
                const inputValue = reportedCached._parentKey === 'BROADCAST_INPUT' ?
                    reportedValues.BROADCAST_OPTION.name :
                    reportedValues[reportedCached._parentKey];
                return {opCached: reportedCached.id, inputValue};
            });
            break;
        } else if (thread.status === Thread.STATUS_RUNNING) {
            if (lastOperation) {
                handleReport(primitiveReportedValue, sequencer, thread, opCached, lastOperation);
            } else {
                // Every op but the last reports into a parent
                setParentValue(opCached, primitiveReportedValue);
            }
        }
    }

    if (runtime.profiler !== null) {
        if (blockCached._profiler !== runtime.profiler) {
            prepareBlockProfiling(runtime.profiler, blockCached);
        }
        // Count the ops that ran: from `start` through `i`, which is past the end when all of them ran
        const end = Math.min(i + 1, length);
        for (let p = start; p < end; p++) {
            ops[p]._profilerFrame.count += 1;
        }
    }
};

export default execute;
