import {test} from 'tap';
import Procedures from '../../src/blocks/scratch3_procedures.ts';
import type BlockUtility from '../../src/engine/block-utility';

const blocks = new Procedures();

test('getPrimitives', t => {
    t.type(blocks.getPrimitives(), 'object');
    t.end();
});

// Originally inspired by https://github.com/scratchfoundation/scratch-gui/issues/809
test('calling a custom block with no definition does not throw', t => {
    const args = {
        mutation: {
            proccode: 'undefined proc'
        }
    };
    const util = {
        getProcedureParamNamesIdsAndDefaults: () => null,
        stackFrame: {
            executed: false
        }
    };
    t.doesNotThrow(() => {
        blocks.call(args, util as unknown as BlockUtility);
    });
    t.end();
});
