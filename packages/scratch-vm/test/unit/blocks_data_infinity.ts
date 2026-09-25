import {test} from 'tap';
import Data from '../../src/blocks/scratch3_data.ts';
import type BlockUtility from '../../src/engine/block-utility';

const blocks = new Data({setBlockMonitored: () => {}});

const lists: Record<string, {value: unknown[]}> = {};
const util = {
    target: {
        lookupOrCreateList (id: string, name: string) {
            if (!(name in lists)) {
                lists[name] = {value: []};
            }
            return lists[name];
        }
    }
} as unknown as BlockUtility;

test('List with postive infinity primitive contains postive infinity', t => {
    lists.list = {value: [Infinity]};
    let args: {ITEM: unknown, LIST: {id: string, name: string}} = {ITEM: Infinity, LIST: {id: 'list', name: 'list'}};
    let contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '[Infinity] contains Infinity');

    lists.list = {value: [Infinity]};
    args = {ITEM: 'Infinity', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '[Infinity] contains "Infinity"');

    lists.list = {value: [Infinity]};
    args = {ITEM: 'INFINITY', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '[Infinity] contains "INFINITY"');

    lists.list = {value: ['Infinity']};
    args = {ITEM: Infinity, LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["Infinity"] contains Infinity');

    lists.list = {value: ['Infinity']};
    args = {ITEM: 'Infinity', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["Infinity"] contains "Infinity"');

    lists.list = {value: ['Infinity']};
    args = {ITEM: 'INFINITY', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["Infinity"] contains "INFINITY"');

    lists.list = {value: ['INFINITY']};
    args = {ITEM: Infinity, LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["INFINITY"] contains Infinity');

    lists.list = {value: ['INFINITY']};
    args = {ITEM: 'Infinity', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["INFINITY"] contains "Infinity"');

    lists.list = {value: ['INFINITY']};
    args = {ITEM: 'INFINITY', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["INFINITY"] contains "INFINITY"');

    t.end();
});

test('List with negative infinity primitive contains negative infinity', t => {
    lists.list = {value: [-Infinity]};
    let args: {ITEM: unknown, LIST: {id: string, name: string}} = {ITEM: -Infinity, LIST: {id: 'list', name: 'list'}};
    let contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '[-Infinity] contains -Infinity');

    lists.list = {value: [-Infinity]};
    args = {ITEM: '-Infinity', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '[-Infinity] contains "-Infinity"');

    lists.list = {value: [-Infinity]};
    args = {ITEM: '-INFINITY', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '[-Infinity] contains "-INFINITY"');

    lists.list = {value: ['-Infinity']};
    args = {ITEM: -Infinity, LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["-Infinity"] contains -Infinity');

    lists.list = {value: ['-Infinity']};
    args = {ITEM: '-Infinity', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["-Infinity"] contains "-Infinity"');

    lists.list = {value: ['-Infinity']};
    args = {ITEM: '-INFINITY', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["-Infinity"] contains "-INFINITY"');

    lists.list = {value: ['-INFINITY']};
    args = {ITEM: -Infinity, LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["-INFINITY"] contains -Infinity');

    lists.list = {value: ['-INFINITY']};
    args = {ITEM: '-Infinity', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["-INFINITY"] contains "-Infinity"');

    lists.list = {value: ['-INFINITY']};
    args = {ITEM: '-INFINITY', LIST: {id: 'list', name: 'list'}};
    contains = blocks.listContainsItem(args, util);
    t.equal(contains, true, '["-INFINITY"] contains "-INFINITY"');

    t.end();
});
