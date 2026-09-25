import {test} from 'tap';
import {Map} from 'immutable';
import BlockType from '../../src/extension-support/block-type';
import Runtime from '../../src/engine/runtime.ts';
import MonitorRecord from '../../src/engine/monitor-record.ts';
import {newTarget} from '../fixtures/target.ts';
import type {ScratchStorage} from '@scratch/scratch-storage';
import type {ExtensionInfo} from '../../src/extensions/extension.ts';

const fakeExtension: ExtensionInfo = {
    id: 'fake',
    name: 'Fake Extension',
    blockIconURI: 'block icon',
    showStatusButton: true,
    blocks: [
        {opcode: 'foo', blockType: BlockType.COMMAND, text: 'Foo', func: () => 'foo'},
        {opcode: 'hidden', blockType: BlockType.COMMAND, text: 'Hidden', hideFromPalette: true},
        '---',
        {opcode: 'stageOnly', blockType: BlockType.REPORTER, text: 'Stage', filter: ['stage']},
        {opcode: 'hat', blockType: BlockType.HAT, text: 'Hat'},
        {opcode: 'event', blockType: BlockType.EVENT, text: 'Event', func: () => 'event'}
    ]
};

test('spec', t => {
    t.ok(new Runtime() instanceof Runtime);
    t.end();
});

test('an update merges into the monitor state, keeping the record when nothing changes', t => {
    const rt = new Runtime();
    const id = 'xklj4#!';
    const added = MonitorRecord({id, opcode: 'turtle whereabouts', value: '25'});
    rt.requestAddMonitor(added);

    rt.requestUpdateMonitor(Map({id, value: '25'}));
    t.equal(rt.getMonitorState().get(id), added);

    const params = {seven: 7};
    rt.requestUpdateMonitor(Map({id, value: '24'}));
    rt.requestUpdateMonitor(Map({id, params}));
    t.not(rt.getMonitorState().get(id), added);
    t.equal(rt.getMonitorState().get(id).get('value'), '24');
    t.equal(rt.getMonitorState().get(id).get('params'), params);
    t.end();
});

test('makeMessageContextForTarget gives the target type of the target, editing target or stage', t => {
    const rt = new Runtime();
    t.strictSame(rt.makeMessageContextForTarget(), {}, 'no target gives an empty context');

    const stage = newTarget(rt, 'stage');
    stage.isStage = true;
    rt.addTarget(stage);
    t.strictSame(rt.makeMessageContextForTarget(), {targetType: 'stage'});

    const device = newTarget(rt, 'device');
    rt._editingTarget = device;
    t.strictSame(rt.makeMessageContextForTarget(), {targetType: 'sprite'});
    t.strictSame(rt.makeMessageContextForTarget(stage), {targetType: 'stage'});
    t.end();
});

test('registering an extension adds its category, primitives and hats', t => {
    const rt = new Runtime();
    const added: string[] = [];
    rt.events.on('EXTENSION_ADDED', categoryInfo => added.push(categoryInfo.id));
    rt._registerExtensionPrimitives(fakeExtension);

    t.strictSame(added, ['fake']);
    t.match(rt._blockInfo, [{id: 'fake', name: 'Fake Extension', color1: '#0FBD8C'}], 'default colours');
    t.equal(rt.getOpcodeFunction('fake_foo')(null, null), 'foo');
    t.strictSame(rt._hats.fake_hat, {edgeActivated: true, restartExistingThreads: undefined});
    t.ok(rt.getIsHat('fake_event'));
    t.equal(rt.getOpcodeFunction('fake_event'), undefined, 'an event hat has no predicate');
    t.end();
});

test('refreshing an extension rebuilds its category', t => {
    const rt = new Runtime();
    rt._registerExtensionPrimitives(fakeExtension);
    const updates: string[] = [];
    rt.events.on('BLOCKSINFO_UPDATE', categoryInfo => updates.push(categoryInfo.name));

    rt._refreshExtensionPrimitives({...fakeExtension, name: 'Renamed', blocks: [fakeExtension.blocks[0]]});
    t.strictSame(updates, ['Renamed']);
    t.equal(rt._blockInfo[0].blocks.length, 1);

    rt._refreshExtensionPrimitives({id: 'unknown', blocks: []});
    t.equal(updates.length, 1, 'an unregistered extension is ignored');
    t.end();
});

test('getBlocksXML hides palette-hidden blocks and those filtered out for the target', t => {
    const rt = new Runtime();
    rt._registerExtensionPrimitives(fakeExtension);
    const device = newTarget(rt, 'device');
    const stage = newTarget(rt, 'stage');
    stage.isStage = true;

    const [{id, xml}] = rt.getBlocksXML(device);
    t.equal(id, 'fake');
    t.match(xml, /^<category name="Fake Extension" toolboxitemid="fake" showStatusButton="true" /);
    t.match(xml, /iconURI="block icon"/);
    t.match(xml, /fake_foo/);
    t.notMatch(xml, /fake_hidden|fake_stageOnly/);
    t.match(xml, /<sep gap="36"\/>/);
    t.match(rt.getBlocksXML(stage)[0].xml, /fake_stageOnly/);
    t.match(rt.getBlocksXML()[0].xml, /fake_stageOnly/, 'without a target the filter is ignored');
    t.end();
});

test('getBlocksJSON lists each palette entry, undefined for separators', t => {
    const rt = new Runtime();
    rt._registerExtensionPrimitives(fakeExtension);
    const json = rt.getBlocksJSON();
    t.equal(json.length, fakeExtension.blocks.length);
    t.equal(json[0].type, 'fake_foo');
    t.equal(json[2], undefined);
    t.end();
});

test('getLabelForOpcode labels an extension opcode with its category and text', t => {
    const rt = new Runtime();
    rt._registerExtensionPrimitives(fakeExtension);
    t.strictSame(rt.getLabelForOpcode('fake_foo'), {category: 'extension', label: 'Fake Extension: Foo'});
    t.equal(rt.getLabelForOpcode('fake_missing'), undefined);
    t.equal(rt.getLabelForOpcode('other_foo'), undefined);
    t.equal(rt.getLabelForOpcode('nounderscore'), undefined);
    t.end();
});

test('peripheral calls go to the registered extension', t => {
    const rt = new Runtime();
    const calls: string[] = [];
    rt.registerPeripheralExtension('ext', {
        scan: () => calls.push('scan'),
        connect: id => calls.push(`connect ${id}`),
        disconnect: () => calls.push('disconnect'),
        isConnected: () => true
    });
    rt.scanForPeripheral('ext');
    rt.connectPeripheral('ext', 'p1');
    rt.disconnectPeripheral('ext');
    t.strictSame(calls, ['scan', 'connect p1', 'disconnect']);
    t.ok(rt.getPeripheralIsConnected('ext'));
    t.end();
});

test('mic and extension-loading emits', t => {
    const rt = new Runtime();
    const emitted: string[] = [];
    rt.events.on('MIC_LISTENING', listening => emitted.push(`mic ${listening}`));
    rt.events.on('EXTENSION_DATA_LOADING', loading => emitted.push(`loading ${loading}`));
    rt.emitMicListening(true);
    rt.emitExtensionLoading(false);
    t.strictSame(emitted, ['mic true', 'loading false']);
    t.end();
});

test('attachStorage keeps the storage and tags its requests with a run id', t => {
    const rt = new Runtime();
    const metadata: unknown[] = [];
    const storage = {
        scratchFetch: {
            scratchFetch: () => Promise.resolve(),
            setMetadata: (name: string, value: string) => metadata.push([name, typeof value]),
            RequestMetadata: {RunId: 'X-RunId'}
        }
    } as unknown as ScratchStorage;
    rt.attachStorage(storage);
    t.equal(rt.storage, storage);
    t.strictSame(metadata, [['X-RunId', 'string']]);

    const audioEngine = {};
    rt.attachAudioEngine(audioEngine);
    t.equal(rt.audioEngine, audioEngine);
    t.end();
});
