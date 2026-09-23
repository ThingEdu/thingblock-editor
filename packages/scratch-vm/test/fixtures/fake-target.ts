import {EventEmitter} from 'events';
import Blocks from '../../src/engine/blocks.ts';
import type Target from '../../src/engine/target';
import type {Block} from '../../src/engine/block-types.ts';
import type {RuntimeEvents} from '../../src/engine/runtime/runtime-events.ts';

/** A block with the properties execution reads; `rest` overrides them. */
export const block = (id: string, opcode: string, rest: Partial<Block> = {}): Block => ({
    id, opcode, fields: {}, inputs: {}, next: null, parent: null, shadow: false, topLevel: true, ...rest
});

/** Stands in for the JS Target, which builds its Blocks from the runtime: blocks and edge-activated hat values. */
export const fakeTarget = (id: string, blocks: Block[] = []) => {
    const container = new Blocks(new EventEmitter<RuntimeEvents>());
    blocks.forEach(b => container.createBlock(b));
    let edgeValues: Record<string, unknown> = {};
    return {
        id,
        blocks: container,
        isOriginal: true,
        variables: {},
        getName: () => id,
        hasEdgeActivatedValue: (blockId: string) => Object.hasOwn(edgeValues, blockId),
        updateEdgeActivatedValue: (blockId: string, value: unknown) => {
            const old = edgeValues[blockId];
            edgeValues[blockId] = value;
            return old;
        },
        clearEdgeActivatedValues: () => {
            edgeValues = {};
        },
        onGreenFlag: () => {},
        onStopAll: () => {}
    } as unknown as Target;
};
