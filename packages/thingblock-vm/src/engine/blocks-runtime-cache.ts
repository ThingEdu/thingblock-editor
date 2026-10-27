import type Blocks from './blocks';
import type {BlockField} from './block-types';

/** A script's top block with its field values uppercased, so hats match fields without re-casing each time. */
export class RuntimeScriptCache {
    blockId: string;
    /** Copies of the hat's fields, or of its input blocks' fields when it has none. */
    fieldsOfInputs: Record<string, BlockField>;

    constructor (container: Blocks, blockId: string) {
        this.blockId = blockId;

        const block = container.getBlock(blockId);
        const fields = container.getFields(block);
        this.fieldsOfInputs = {...fields};
        if (Object.keys(fields).length === 0) {
            for (const input of Object.values(container.getInputs(block))) {
                Object.assign(this.fieldsOfInputs, container.getFields(container.getBlock(input.block)));
            }
        }
        for (const key in this.fieldsOfInputs) {
            const field = this.fieldsOfInputs[key] = {...this.fieldsOfInputs[key]};
            if (typeof field.value === 'string') {
                field.value = field.value.toUpperCase();
            }
        }
    }
}

/** The scripts in `blocks` whose top block is `opcode`; cached until the container changes. */
export const getScripts = function (blocks: Blocks, opcode: string): RuntimeScriptCache[] {
    blocks._cache.scripts[opcode] ??= blocks.getScripts()
        .filter(topBlockId => blocks.getBlock(topBlockId).opcode === opcode)
        .map(topBlockId => new RuntimeScriptCache(blocks, topBlockId));
    return blocks._cache.scripts[opcode];
};
