import type Blocks from './blocks';
import type {BlockField, BlockInput} from './block-types';
import type {Mutation} from './mutation-adapter';

export interface ExecuteCacheData {
    id: string
    opcode: string
    fields: Record<string, BlockField>
    inputs: Record<string, BlockInput>
    mutation: Mutation | undefined
}

/** Execute's per-block data, made by `build` on first use and dropped when the container changes. */
export const getCached = function <T> (
    blocks: Blocks,
    blockId: string,
    build: (blocks: Blocks, data: ExecuteCacheData) => T
): T | null {
    if (Object.hasOwn(blocks._cache._executeCached, blockId)) {
        return blocks._cache._executeCached[blockId] as T;
    }

    const block = blocks.getBlock(blockId);
    if (!block) return null;

    const cached = build(blocks, {
        id: blockId,
        opcode: blocks.getOpcode(block),
        fields: blocks.getFields(block),
        inputs: blocks.getInputs(block),
        mutation: blocks.getMutation(block)
    });
    blocks._cache._executeCached[blockId] = cached;
    return cached;
};
