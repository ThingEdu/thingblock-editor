import '../fixtures/prefer-ts';
import {test} from 'tap';
import Runtime from '../../src/engine/runtime.ts';
import type Target from '../../src/engine/target';
import type {Block} from '../../src/engine/block-types.ts';

const monitorBlock = (id: string, opcode: string, fields: Block['fields'] = {}) => ({
    id, opcode, fields, inputs: {}, next: null, parent: null, shadow: false, topLevel: true
});

const setup = () => {
    const rt = new Runtime();
    const stage = {id: 'stage', isStage: true, variables: {global: {}}, getName: () => 'Stage'};
    const sprite = {id: 'sprite', isStage: false, variables: {local: {}}, getName: () => 'Device'};
    rt.targets.push(stage as unknown as Target, sprite as unknown as Target);
    rt._editingTarget = sprite as unknown as Target;
    return rt;
};

const monitor = (rt: Runtime, id: string) => rt.monitors.getState().get(id)?.toJS();

test('a global variable monitor is added, hidden and shown again', t => {
    const rt = setup();
    rt.monitorBlocks.createBlock(monitorBlock('global', 'data_variable', {
        VARIABLE: {name: 'VARIABLE', id: 'global', value: 'my var'}
    }));

    rt.setBlockMonitored('global', true);
    t.match(monitor(rt, 'global'), {id: 'global', targetId: null, spriteName: null, visible: true, mode: 'default'});
    t.strictSame(rt.monitorBlocks.getMonitoredBlocks(), [{blockId: 'global', targetId: null}]);

    rt.setBlockMonitored('global', false);
    t.match(monitor(rt, 'global'), {visible: false});
    t.strictSame(rt.monitorBlocks.getMonitoredBlocks(), []);

    rt.setBlockMonitored('global', true);
    t.match(monitor(rt, 'global'), {visible: true});
    t.end();
});

test('a local list monitor belongs to the editing target', t => {
    const rt = setup();
    rt.monitorBlocks.createBlock(monitorBlock('local', 'data_listcontents', {
        LIST: {name: 'LIST', id: 'local', value: 'my list'}
    }));

    rt.setBlockMonitored('local', true);
    t.match(monitor(rt, 'local'), {targetId: 'sprite', spriteName: 'Device', mode: 'list'});
    t.end();
});

test('a reporter with arguments gets a monitor block per argument', t => {
    const rt = setup();
    rt.monitorBlocks.createBlock(monitorBlock('current', 'sensing_current', {
        CURRENTMENU: {name: 'CURRENTMENU', value: 'YEAR'}
    }));

    rt.setBlockMonitored('current', true);
    t.equal(rt.monitorBlocks.getBlock('current').isMonitored, undefined, 'the flyout-id block is untouched');
    t.equal(rt.monitorBlocks.getBlock('current_year').isMonitored, true);
    t.match(monitor(rt, 'current_year'), {opcode: 'sensing_current', params: {CURRENTMENU: 'YEAR'}});
    t.end();
});

test('an unknown block changes nothing', t => {
    const rt = setup();
    rt.setBlockMonitored('missing', true);
    t.equal(rt.monitors.getState().size, 0);
    t.end();
});
