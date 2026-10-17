import Target from '../../src/engine/target.ts';
import type Runtime from '../../src/engine/runtime.ts';
import type {Block} from '../../src/engine/block-types.ts';

/** A block with the properties execution reads; `rest` overrides them. */
export const block = (id: string, opcode: string, rest: Partial<Block> = {}): Block => ({
    id, opcode, fields: {}, inputs: {}, next: null, parent: null, shadow: false, topLevel: true, ...rest
});

/** A target with a fixed ID, holding `blocks`. */
export const newTarget = (runtime: Runtime, id: string, blocks: Block[] = []) => {
    const target = new Target(runtime);
    target.id = id;
    target.name = id;
    blocks.forEach(b => target.blocks.createBlock(b));
    return target;
};
