/** Output shapes, copied from scratch-blocks' constants: importing that package would pull Blockly into the VM. */
const ScratchBlocksConstants = {
    /** Booleans and predicates. */
    OUTPUT_SHAPE_HEXAGONAL: 1,
    /** Numbers. */
    OUTPUT_SHAPE_ROUND: 2,
    /** Strings and any-typed values. */
    OUTPUT_SHAPE_SQUARE: 3
} as const;

export default ScratchBlocksConstants;
