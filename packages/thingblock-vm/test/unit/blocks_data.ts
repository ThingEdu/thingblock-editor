import {test} from 'tap';
import Data from '../../src/blocks/scratch3_data.ts';
import type BlockUtility from '../../src/engine/block-utility';

const LIST = {id: 'list', name: 'list'};

const newData = () => {
    const monitored: Array<[string, boolean]> = [];
    const data = new Data({setBlockMonitored: (id, isMonitored) => monitored.push([id, isMonitored])});
    return {data, monitored};
};

const utilWithList = (value: unknown[], updateMonitor = false) => {
    const list: {value: unknown[], _monitorUpToDate?: boolean} = {value};
    const util = {
        target: {lookupOrCreateList: () => list},
        thread: {updateMonitor}
    } as unknown as BlockUtility;
    return {list, util};
};

test('getItemNumOfList returns the index of an item (basic)', t => {
    const {util} = utilWithList(['apple', 'taco', 'burrito', 'extravaganza']);
    t.equal(newData().data.getItemNumOfList({ITEM: 'burrito', LIST}, util), 3);
    t.end();
});

test('getItemNumOfList returns 0 when an item is not found', t => {
    const {util} = utilWithList(['aaaaapple', 'burrito']);
    t.equal(newData().data.getItemNumOfList({ITEM: 'jump', LIST}, util), 0);
    t.end();
});

test('getItemNumOfList uses Scratch comparison', t => {
    const {data} = newData();
    const {util} = utilWithList(['jump', 'Jump', '123', 123, 800]);

    // Be case-insensitive:
    t.equal(data.getItemNumOfList({ITEM: 'Jump', LIST}, util), 1);

    // Be type-insensitive:
    t.equal(data.getItemNumOfList({ITEM: 123, LIST}, util), 3);
    t.equal(data.getItemNumOfList({ITEM: '800', LIST}, util), 5);
    t.end();
});

test('show and hide set the variable or list monitor block', t => {
    const {data, monitored} = newData();
    data.showVariable({VARIABLE: {id: 'var', name: 'var'}});
    data.hideVariable({VARIABLE: {id: 'var', name: 'var'}});
    data.showList({LIST});
    data.hideList({LIST});
    t.strictSame(monitored, [['var', true], ['var', false], ['list', true], ['list', false]]);
    t.end();
});

test('getListContents joins single letters without a separator', t => {
    const {data} = newData();
    t.equal(data.getListContents({LIST}, utilWithList(['a', 'b']).util), 'ab');
    t.equal(data.getListContents({LIST}, utilWithList(['a', 'bc', 1]).util), 'a bc 1');
    t.end();
});

test('getListContents gives monitors a new array only after a change', t => {
    const {data} = newData();
    const {list, util} = utilWithList(['a'], true);

    const first = data.getListContents({LIST}, util);
    t.not(first, list.value);
    t.strictSame(first, ['a']);
    t.equal(data.getListContents({LIST}, util), list.value, 'unchanged list reports the same array');

    data.addToList({LIST, ITEM: 'b'}, util);
    const changed = data.getListContents({LIST}, util);
    t.not(changed, list.value);
    t.strictSame(changed, ['a', 'b']);
    t.end();
});

test('deleteOfList handles "all" and invalid indexes', t => {
    const {data} = newData();
    const {list, util} = utilWithList(['a', 'b', 'c']);

    data.deleteOfList({LIST, INDEX: 2}, util);
    t.strictSame(list.value, ['a', 'c']);
    data.deleteOfList({LIST, INDEX: 5}, util);
    t.strictSame(list.value, ['a', 'c']);
    data.deleteOfList({LIST, INDEX: 'all'}, util);
    t.strictSame(list.value, []);
    t.end();
});

test('insertAtList keeps the list within the item limit', t => {
    const {data} = newData();
    const {list, util} = utilWithList(new Array(Data.LIST_ITEM_LIMIT).fill('x'));

    data.insertAtList({LIST, INDEX: 1, ITEM: 'first'}, util);
    t.equal(list.value.length, Data.LIST_ITEM_LIMIT);
    t.equal(list.value[0], 'first');
    t.end();
});
