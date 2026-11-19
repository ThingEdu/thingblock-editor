// Destructured, not `require(...).default`, so the emitted .d.ts stays valid TypeScript
const {default: VirtualMachine} = require('./virtual-machine');

const ArgumentType = require('./extension-support/argument-type');
const BlockType = require('./extension-support/block-type');

module.exports = VirtualMachine;

// TODO: ESM named exports will save us all
module.exports.ArgumentType = ArgumentType;
module.exports.BlockType = BlockType;
