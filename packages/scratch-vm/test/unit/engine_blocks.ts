import {test} from 'tap';
import {EventEmitter} from 'events';
import Blocks from '../../src/engine/blocks.ts';
import Variable from '../../src/engine/variable.ts';
import adapter from '../../src/engine/adapter.ts';
import {getScripts} from '../../src/engine/blocks-runtime-cache.ts';
import {getCached} from '../../src/engine/blocks-execute-cache.ts';
import type {Block} from '../../src/engine/block-types.ts';
import type {RuntimeEvents} from '../../src/engine/runtime/runtime-events.ts';
import events from '../fixtures/events.json';

const newBlocks = () => new Blocks(new EventEmitter<RuntimeEvents>());

/** Test blocks leave out the properties a case doesn't read. */
const createBlock = (b: Blocks, block: object) => b.createBlock(block as Block);

test('getBlock', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    const block = b.getBlock('foo');
    t.type(block, 'object');
    const notBlock = b.getBlock('?');
    t.type(notBlock, 'undefined');
    t.end();
});

test('getScripts', t => {
    const b = newBlocks();
    let scripts = b.getScripts();
    t.type(scripts, 'object');
    t.equal(scripts.length, 0);
    // Create two top-level blocks and one not.
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    createBlock(b, {
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    createBlock(b, {
        id: 'foo3',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });

    scripts = b.getScripts();
    t.type(scripts, 'object');
    t.equal(scripts.length, 2);
    t.ok(scripts.indexOf('foo') > -1);
    t.ok(scripts.indexOf('foo2') > -1);
    t.equal(scripts.indexOf('foo3'), -1);
    t.end();

});

test('getNextBlock', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });

    let next = b.getNextBlock('foo');
    t.equal(next, null);

    // Add a block with "foo" as its next.
    createBlock(b, {
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: 'foo',
        fields: {},
        inputs: {},
        topLevel: true
    });

    next = b.getNextBlock('foo2');
    t.equal(next, 'foo');

    // Block that doesn't exist.
    const noBlock = b.getNextBlock('?');
    t.equal(noBlock, null);

    t.end();
});

test('getBranch', t => {
    const b = newBlocks();
    // Single branch
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            SUBSTACK: {
                name: 'SUBSTACK',
                block: 'foo2',
                shadow: null
            }
        },
        topLevel: true
    });
    createBlock(b, {
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });

    const branch = b.getBranch('foo');
    t.equal(branch, 'foo2');

    const notBranch = b.getBranch('?');
    t.equal(notBranch, null);

    t.end();
});

test('getBranch2', t => {
    const b = newBlocks();
    // Second branch
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            SUBSTACK: {
                name: 'SUBSTACK',
                block: 'foo2',
                shadow: null
            },
            SUBSTACK2: {
                name: 'SUBSTACK2',
                block: 'foo3',
                shadow: null
            }
        },
        topLevel: true
    });
    createBlock(b, {
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });
    createBlock(b, {
        id: 'foo3',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });

    const branch1 = b.getBranch('foo', 1);
    const branch2 = b.getBranch('foo', 2);
    t.equal(branch1, 'foo2');
    t.equal(branch2, 'foo3');

    t.end();
});

test('getBranch with none', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    const noBranch = b.getBranch('foo');
    t.equal(noBranch, null);
    t.end();
});

test('getOpcode', t => {
    const b = newBlocks();
    const block = {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    };
    createBlock(b, block);
    const opcode = b.getOpcode(block as Block);
    t.equal(opcode, 'TEST_BLOCK');
    const undefinedBlock = b.getBlock('?');
    const undefinedOpcode = b.getOpcode(undefinedBlock);
    t.equal(undefinedOpcode, null);
    t.end();
});

test('mutationToXML', t => {
    const b = newBlocks();
    const testStringRaw = '"arbitrary" & \'complicated\' test string';
    const testStringEscaped = '\\&quot;arbitrary\\&quot; &amp; &apos;complicated&apos; test string';
    const mutation = {
        tagName: 'mutation',
        children: [],
        blockInfo: {
            text: testStringRaw
        }
    };
    const xml = b.mutationToXML(mutation);
    t.equal(
        xml,
        `<mutation blockInfo="{&quot;text&quot;:&quot;${testStringEscaped}&quot;}"></mutation>`
    );
    t.end();
});

// Block events tests

test('create', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });

    t.type(b._blocks.foo, 'object');
    t.equal(b._blocks.foo.opcode, 'TEST_BLOCK');
    t.not(b._scripts.indexOf('foo'), -1);
    t.end();
});

test('move', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    createBlock(b, {
        id: 'bar',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });

    // Attach 'bar' to the end of 'foo'
    b.moveBlock({
        id: 'bar',
        newParent: 'foo'
    });
    t.equal(b._scripts.length, 1);
    t.equal(Object.keys(b._blocks).length, 2);
    t.equal(b._blocks.foo.next, 'bar');

    // Detach 'bar' from 'foo'
    b.moveBlock({
        id: 'bar',
        oldParent: 'foo'
    });
    t.equal(b._scripts.length, 2);
    t.equal(Object.keys(b._blocks).length, 2);
    t.equal(b._blocks.foo.next, null);

    t.end();
});

test('move into empty', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    createBlock(b, {
        id: 'bar',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.moveBlock({
        id: 'bar',
        newInput: 'fooInput',
        newParent: 'foo'
    });
    t.equal(b._blocks.foo.inputs.fooInput.block, 'bar');
    t.end();
});

test('move no obscure shadow', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            fooInput: {
                name: 'fooInput',
                block: 'x',
                shadow: 'y'
            }
        },
        topLevel: true
    });
    createBlock(b, {
        id: 'bar',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.moveBlock({
        id: 'bar',
        newInput: 'fooInput',
        newParent: 'foo'
    });
    t.equal(b._blocks.foo.inputs.fooInput.block, 'bar');
    t.equal(b._blocks.foo.inputs.fooInput.shadow, 'y');
    t.end();
});

test('move - attaching new shadow', t => {
    const b = newBlocks();
    // Block/shadow are null to mimic state right after a procedure_call block
    // is mutated by adding an input. The "move" will attach the new shadow.
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            fooInput: {
                name: 'fooInput',
                block: null,
                shadow: null
            }
        },
        topLevel: true
    });
    createBlock(b, {
        id: 'bar',
        opcode: 'TEST_BLOCK',
        shadow: true,
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.moveBlock({
        id: 'bar',
        newInput: 'fooInput',
        newParent: 'foo'
    });
    t.equal(b._blocks.foo.inputs.fooInput.block, 'bar');
    t.equal(b._blocks.foo.inputs.fooInput.shadow, 'bar');
    t.end();
});

test('move out of input with shadow clears parent', t => {
    const b = newBlocks();
    // Create a stack block with an input that has a shadow
    createBlock(b, {
        id: 'stack',
        opcode: 'TEST_BLOCK',
        next: null,
        parent: null,
        fields: {},
        inputs: {
            myInput: {
                name: 'myInput',
                block: 'myShadow',
                shadow: 'myShadow'
            }
        },
        topLevel: true
    });
    createBlock(b, {
        id: 'myShadow',
        opcode: 'TEST_SHADOW',
        next: null,
        parent: 'stack',
        fields: {},
        inputs: {},
        shadow: true
    });
    createBlock(b, {
        id: 'reporter',
        opcode: 'TEST_REPORTER',
        next: null,
        parent: null,
        fields: {},
        inputs: {},
        topLevel: true
    });

    // Move the reporter into the stack's input (covering the shadow)
    b.moveBlock({
        id: 'reporter',
        newParent: 'stack',
        newInput: 'myInput'
    });
    t.equal(b._blocks.reporter.parent, 'stack');
    t.equal(b.getTopLevelScript('reporter'), 'stack');

    // Detach the reporter from the stack's input
    b.moveBlock({
        id: 'reporter',
        oldParent: 'stack',
        oldInput: 'myInput',
        newCoordinate: {x: 100, y: 100}
    });

    // The shadow should be restored
    t.equal(b._blocks.stack.inputs.myInput.block, 'myShadow');

    // The reporter's parent must be cleared so it is its own top-level script
    t.equal(b._blocks.reporter.parent, null,
        'reporter parent should be null after disconnect');
    t.equal(b.getTopLevelScript('reporter'), 'reporter',
        'reporter should be its own top-level script after disconnect');

    t.end();
});

test('changeField and changeMutation', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {
            someField: {
                name: 'someField',
                value: 'initial-value'
            },
            VARIABLE: {
                name: 'VARIABLE',
                id: 'oldVarId',
                value: 'old name'
            }
        },
        inputs: {},
        topLevel: true
    });

    b.changeField('foo', 'someField', 'final-value');
    t.equal(b._blocks.foo.fields.someField.value, 'final-value');

    b.changeField('foo', 'VARIABLE', 'new name', 'newVarId');
    t.strictSame(b._blocks.foo.fields.VARIABLE, {name: 'VARIABLE', id: 'newVarId', value: 'new name'});

    // Missing blocks and fields are ignored
    b.changeField('nope', 'someField', 'invalid-value');
    b.changeField('foo', 'someWrongField', 'invalid-value');
    t.equal(b._blocks.foo.fields.someField.value, 'final-value');
    t.notOk(Object.hasOwn(b._blocks.foo.fields, 'someWrongField'));

    const mutation = {tagName: 'mutation', children: [], proccode: 'a %s'};
    b.changeMutation('foo', mutation);
    t.equal(b._blocks.foo.mutation, mutation);
    t.end();
});

test('changeFieldWhileEditing updates the field without a project change', t => {
    const events = new EventEmitter<RuntimeEvents>();
    const b = new Blocks(events);
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {
            TEXT: {
                name: 'TEXT',
                value: 'Hello!'
            }
        },
        inputs: {},
        topLevel: true
    });
    let changes = 0;
    events.on('PROJECT_CHANGED', () => changes++);
    b._cache._executeCached.foo = {};

    b.changeFieldWhileEditing('foo', 'TEXT', 'Hello world');
    t.equal(b._blocks.foo.fields.TEXT.value, 'Hello world');
    t.equal(changes, 0);
    t.strictSame(b._cache._executeCached, {});
    t.end();
});

test('delete', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: true
    });
    b.deleteBlock('foo');

    t.type(b._blocks.foo, 'undefined');
    t.equal(b._scripts.indexOf('foo'), -1);
    t.end();
});

test('delete chain', t => {
    // Create a chain of connected blocks and delete the top one.
    // All of them should be deleted.
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: 'foo2',
        fields: {},
        inputs: {},
        topLevel: true
    });
    createBlock(b, {
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: 'foo3',
        fields: {},
        inputs: {},
        topLevel: false
    });
    createBlock(b, {
        id: 'foo3',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });
    b.deleteBlock('foo');
    t.type(b._blocks.foo, 'undefined');
    t.type(b._blocks.foo2, 'undefined');
    t.type(b._blocks.foo3, 'undefined');
    t.equal(b._scripts.indexOf('foo'), -1);
    t.equal(Object.keys(b._blocks).length, 0);
    t.equal(b._scripts.length, 0);
    t.end();
});

test('delete inputs', t => {
    // Create a block with two inputs, one of which has its own input.
    // Delete the block - all of them should be deleted.
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            input1: {
                name: 'input1',
                block: 'foo2',
                shadow: 'foo2'
            },
            SUBSTACK: {
                name: 'SUBSTACK',
                block: 'foo3',
                shadow: null
            }
        },
        topLevel: true
    });
    createBlock(b, {
        id: 'foo2',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });
    createBlock(b, {
        id: 'foo5',
        opcode: 'TEST_OBSCURED_SHADOW',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });
    createBlock(b, {
        id: 'foo3',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {
            subinput: {
                name: 'subinput',
                block: 'foo4',
                shadow: 'foo5'
            }
        },
        topLevel: false
    });
    createBlock(b, {
        id: 'foo4',
        opcode: 'TEST_BLOCK',
        next: null,
        fields: {},
        inputs: {},
        topLevel: false
    });
    b.deleteBlock('foo');
    t.type(b._blocks.foo, 'undefined');
    t.type(b._blocks.foo2, 'undefined');
    t.type(b._blocks.foo3, 'undefined');
    t.type(b._blocks.foo4, 'undefined');
    t.type(b._blocks.foo5, 'undefined');
    t.equal(b._scripts.indexOf('foo'), -1);
    t.equal(Object.keys(b._blocks).length, 0);
    t.equal(b._scripts.length, 0);
    t.end();
});

test('updateSoundName updates sound menus', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'foo',
        fields: {
            SOUND_MENU: {
                name: 'SOUND_MENU',
                value: 'name1'
            }
        }
    });
    t.equal(b.getBlock('foo').fields.SOUND_MENU.value, 'name1');
    b.updateSoundName('name1', 'name2');
    t.equal(b.getBlock('foo').fields.SOUND_MENU.value, 'name2');
    t.end();
});

test('updateSoundName leaves other fields', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'id1',
        fields: {
            SOUND_MENU: {
                name: 'SOUND_MENU',
                value: 'name1'
            }
        }
    });
    createBlock(b, {
        id: 'id2',
        fields: {
            COSTUME: {
                name: 'COSTUME',
                value: 'name1'
            }
        }
    });
    t.equal(b.getBlock('id1').fields.SOUND_MENU.value, 'name1');
    t.equal(b.getBlock('id2').fields.COSTUME.value, 'name1');
    b.updateSoundName('name1', 'name2');
    t.equal(b.getBlock('id1').fields.SOUND_MENU.value, 'name2');
    t.equal(b.getBlock('id2').fields.COSTUME.value, 'name1');
    t.end();
});

test('updateSoundName only updates the given name', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'id1',
        fields: {
            SOUND_MENU: {
                name: 'SOUND_MENU',
                value: 'name1'
            }
        }
    });
    createBlock(b, {
        id: 'id2',
        fields: {
            SOUND_MENU: {
                name: 'SOUND_MENU',
                value: 'foo'
            }
        }
    });
    t.equal(b.getBlock('id1').fields.SOUND_MENU.value, 'name1');
    t.equal(b.getBlock('id2').fields.SOUND_MENU.value, 'foo');
    b.updateSoundName('name1', 'name2');
    t.equal(b.getBlock('id1').fields.SOUND_MENU.value, 'name2');
    t.equal(b.getBlock('id2').fields.SOUND_MENU.value, 'foo');
    t.end();
});

test('updateSoundName ignores unused names', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'id1',
        fields: {
            SOUND_MENU: {
                name: 'SOUND_MENU',
                value: 'foo'
            }
        }
    });
    t.equal(b.getBlock('id1').fields.SOUND_MENU.value, 'foo');
    b.updateSoundName('name1', 'name2');
    t.equal(b.getBlock('id1').fields.SOUND_MENU.value, 'foo');
    t.end();
});

test('getAllVariableAndListReferences returns an empty map references when variable blocks do not exist', t => {
    const b = newBlocks();
    t.equal(Object.keys(b.getAllVariableAndListReferences()).length, 0);
    t.end();
});

test('getAllVariableAndListReferences returns references when variable blocks exist', t => {
    const b = newBlocks();

    let varListRefs = b.getAllVariableAndListReferences();
    t.equal(Object.keys(varListRefs).length, 0);

    createBlock(b, adapter(events.mockVariableBlock)[0]);
    createBlock(b, adapter(events.mockListBlock)[0]);

    varListRefs = b.getAllVariableAndListReferences();
    t.equal(Object.keys(varListRefs).length, 2);
    t.equal(Array.isArray(varListRefs['mock var id']), true);
    t.equal(varListRefs['mock var id'].length, 1);
    t.equal(varListRefs['mock var id'][0].type, Variable.SCALAR_TYPE);
    t.equal(varListRefs['mock var id'][0].referencingField.value, 'a mock variable');
    t.equal(Array.isArray(varListRefs['mock list id']), true);
    t.equal(varListRefs['mock list id'].length, 1);
    t.equal(varListRefs['mock list id'][0].type, Variable.LIST_TYPE);
    t.equal(varListRefs['mock list id'][0].referencingField.value, 'a mock list');

    t.end();
});

test('getAllVariableAndListReferences does not return broadcast blocks if the flag is left out', t => {
    const b = newBlocks();
    createBlock(b, adapter(events.mockBroadcastBlock)[0]);
    createBlock(b, adapter(events.mockBroadcastBlock)[1]);

    t.equal(Object.keys(b.getAllVariableAndListReferences()).length, 0);
    t.end();
});

test('getAllVariableAndListReferences returns broadcast when we tell it to', t => {
    const b = newBlocks();

    createBlock(b, adapter(events.mockVariableBlock)[0]);
    // Make the broadcast block and its shadow (which includes the actual broadcast field).
    createBlock(b, adapter(events.mockBroadcastBlock)[0]);
    createBlock(b, adapter(events.mockBroadcastBlock)[1]);

    const varListRefs = b.getAllVariableAndListReferences(null, true);

    t.equal(Object.keys(varListRefs).length, 2);
    t.equal(Array.isArray(varListRefs['mock var id']), true);
    t.equal(varListRefs['mock var id'].length, 1);
    t.equal(varListRefs['mock var id'][0].type, Variable.SCALAR_TYPE);
    t.equal(varListRefs['mock var id'][0].referencingField.value, 'a mock variable');
    t.equal(Array.isArray(varListRefs['mock broadcast message id']), true);
    t.equal(varListRefs['mock broadcast message id'].length, 1);
    t.equal(varListRefs['mock broadcast message id'][0].type, Variable.BROADCAST_MESSAGE_TYPE);
    t.equal(varListRefs['mock broadcast message id'][0].referencingField.value, 'my message');

    t.end();
});

// Regression test for bug 878291: moveBlock should not crash when a
// shadow reference points to a block that does not exist.

test('moveBlock tolerates missing shadow block', t => {
    const b = newBlocks();

    // Create a parent block with an input whose shadow reference is stale
    createBlock(b, {
        id: 'parent',
        opcode: 'data_setvariableto',
        next: null,
        parent: null,
        shadow: false,
        topLevel: true,
        inputs: {
            VALUE: {
                name: 'VALUE',
                block: 'reporter',
                shadow: 'nonexistent_shadow' // references a block that does not exist
            }
        },
        fields: {}
    });
    createBlock(b, {
        id: 'reporter',
        opcode: 'sensing_answer',
        next: null,
        parent: 'parent',
        shadow: false,
        topLevel: false,
        inputs: {},
        fields: {}
    });

    // Detaching the reporter should not throw even though the shadow is missing
    t.doesNotThrow(() => {
        b.moveBlock({
            id: 'reporter',
            oldParent: 'parent',
            oldInput: 'VALUE',
            newCoordinate: {x: 0, y: 0}
        });
    });

    // The stale shadow reference should be cleared
    t.equal(b.getBlock('parent').inputs.VALUE.shadow, null);
    t.equal(b.getBlock('parent').inputs.VALUE.block, null);

    t.end();
});

// Regression test: when Blockly respawns a shadow block (e.g. after
// uncovering a duplicated input), the create event arrives with
// topLevel:true because appendInternal creates the block before
// connecting it. Shadow blocks must never be added to _scripts —
// a top-level shadow in _scripts causes "Workspace Update Error"
// on sprite switch because toXML serializes it as a root <shadow>
// element that Blockly cannot load.

test('createBlock does not add shadow blocks to _scripts', t => {
    const b = newBlocks();
    createBlock(b, {
        id: 'shadow_1',
        opcode: 'math_number',
        next: null,
        fields: {NUM: {name: 'NUM', value: '0'}},
        inputs: {},
        topLevel: true,
        shadow: true
    });
    t.equal(b._scripts.indexOf('shadow_1'), -1,
        'shadow block should not be in _scripts even with topLevel:true');
    t.ok(Object.prototype.hasOwnProperty.call(b._blocks, 'shadow_1'),
        'shadow block should still be in _blocks');
    t.end();
});

test('changes emit PROJECT_CHANGED except in no-glow containers', t => {
    const events = new EventEmitter<RuntimeEvents>();
    let changes = 0;
    events.on('PROJECT_CHANGED', () => changes++);

    createBlock(new Blocks(events), {id: 'foo', opcode: 'TEST_BLOCK', next: null, fields: {}, inputs: {}});
    t.equal(changes, 1);
    createBlock(new Blocks(events, true), {id: 'foo', opcode: 'TEST_BLOCK', next: null, fields: {}, inputs: {}});
    t.equal(changes, 1);
    t.end();
});

test('getMonitoredBlocks is cached until blocks change', t => {
    const b = newBlocks();
    createBlock(b, {id: 'global', opcode: 'data_variable', next: null, fields: {}, inputs: {}, isMonitored: true});
    createBlock(b, {id: 'local', opcode: 'data_variable', next: null, fields: {}, inputs: {}, isMonitored: true,
        targetId: 'sprite'});
    createBlock(b, {id: 'hidden', opcode: 'data_variable', next: null, fields: {}, inputs: {}, isMonitored: false});

    const monitored = b.getMonitoredBlocks();
    t.strictSame(monitored, [{blockId: 'global', targetId: null}, {blockId: 'local', targetId: 'sprite'}]);
    t.equal(b.getMonitoredBlocks(), monitored);

    b.deleteBlock('local');
    t.strictSame(b.getMonitoredBlocks(), [{blockId: 'global', targetId: null}]);
    t.end();
});

test('getProcedureParamNamesAndIds throws for an unknown procedure', t => {
    t.throws(() => newBlocks().getProcedureParamNamesAndIds('missing %s'), /no prototype for procedure missing %s/);
    t.end();
});

test('getScripts caches uppercased hat fields until blocks change', t => {
    const b = newBlocks();
    createBlock(b, {id: 'hat', opcode: 'event_whenkeypressed', next: null, inputs: {}, topLevel: true,
        fields: {KEY_OPTION: {name: 'KEY_OPTION', value: 'space'}}});
    createBlock(b, {id: 'other', opcode: 'event_whenflagclicked', next: null, inputs: {}, fields: {}, topLevel: true});

    const scripts = getScripts(b, 'event_whenkeypressed');
    t.strictSame(scripts.map(script => script.blockId), ['hat']);
    t.equal(scripts[0].fieldsOfInputs.KEY_OPTION.value, 'SPACE');
    t.equal(b.getBlock('hat').fields.KEY_OPTION.value, 'space');
    t.equal(getScripts(b, 'event_whenkeypressed'), scripts);

    b.deleteBlock('hat');
    t.strictSame(getScripts(b, 'event_whenkeypressed'), []);
    t.end();
});

test('getScripts reads input block fields for hats without fields', t => {
    const b = newBlocks();
    createBlock(b, {id: 'hat', opcode: 'event_whenbroadcastreceived', next: null, fields: {}, topLevel: true,
        inputs: {MENU: {name: 'MENU', block: 'menu', shadow: 'menu'}}});
    createBlock(b, {id: 'menu', opcode: 'menu', next: null, inputs: {}, parent: 'hat', shadow: true,
        fields: {OPTION: {name: 'OPTION', value: 'go'}}});

    t.equal(getScripts(b, 'event_whenbroadcastreceived')[0].fieldsOfInputs.OPTION.value, 'GO');
    t.end();
});

test('getCached builds once, and again after blocks change', t => {
    const b = newBlocks();
    createBlock(b, {id: 'foo', opcode: 'TEST_BLOCK', next: null, fields: {}, inputs: {}, topLevel: true});
    const build = (_blocks: Blocks, data: {opcode: string}) => ({opcode: data.opcode});

    const cached = getCached(b, 'foo', build);
    t.equal(cached.opcode, 'TEST_BLOCK');
    t.equal(getCached(b, 'foo', build), cached);
    t.equal(getCached(b, 'missing', build), null);

    b.changeMutation('foo', {tagName: 'mutation', children: []});
    t.not(getCached(b, 'foo', build), cached);
    t.end();
});
