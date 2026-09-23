import Cast from '../util/cast';
import type BlockUtility from '../engine/block-utility';
import type {VariableArg} from '../engine/block-types';
import type Runtime from '../engine/runtime';
import type Variable from '../engine/variable';
import type {ScratchValue} from '../engine/variable';

type ListVariable = Variable & {value: ScratchValue[]};

type ListArgs = {LIST: VariableArg};

class Scratch3DataBlocks {
    static readonly LIST_ITEM_LIMIT = 200000;

    monitors: Pick<Runtime, 'setBlockMonitored'>;

    constructor (monitors: Pick<Runtime, 'setBlockMonitored'>) {
        this.monitors = monitors;
    }

    getPrimitives () {
        return {
            data_variable: this.getVariable,
            data_setvariableto: this.setVariableTo,
            data_changevariableby: this.changeVariableBy,
            data_hidevariable: this.hideVariable,
            data_showvariable: this.showVariable,
            data_listcontents: this.getListContents,
            data_addtolist: this.addToList,
            data_deleteoflist: this.deleteOfList,
            data_deletealloflist: this.deleteAllOfList,
            data_insertatlist: this.insertAtList,
            data_replaceitemoflist: this.replaceItemOfList,
            data_itemoflist: this.getItemOfList,
            data_itemnumoflist: this.getItemNumOfList,
            data_lengthoflist: this.lengthOfList,
            data_listcontainsitem: this.listContainsItem,
            data_hidelist: this.hideList,
            data_showlist: this.showList
        };
    }

    _list (args: ListArgs, util: BlockUtility): ListVariable {
        return util.target.lookupOrCreateList(args.LIST.id, args.LIST.name) as ListVariable;
    }

    getVariable (args: {VARIABLE: VariableArg}, util: BlockUtility) {
        return util.target.lookupOrCreateVariable(args.VARIABLE.id, args.VARIABLE.name).value;
    }

    setVariableTo (args: {VARIABLE: VariableArg, VALUE: ScratchValue}, util: BlockUtility) {
        util.target.lookupOrCreateVariable(args.VARIABLE.id, args.VARIABLE.name).value = args.VALUE;
    }

    changeVariableBy (args: {VARIABLE: VariableArg, VALUE: unknown}, util: BlockUtility) {
        const variable = util.target.lookupOrCreateVariable(args.VARIABLE.id, args.VARIABLE.name);
        variable.value = Cast.toNumber(variable.value) + Cast.toNumber(args.VALUE);
    }

    showVariable (args: {VARIABLE: VariableArg}) {
        // A variable's monitor block has the variable's ID
        this.monitors.setBlockMonitored(args.VARIABLE.id, true);
    }

    hideVariable (args: {VARIABLE: VariableArg}) {
        this.monitors.setBlockMonitored(args.VARIABLE.id, false);
    }

    showList (args: ListArgs) {
        this.monitors.setBlockMonitored(args.LIST.id, true);
    }

    hideList (args: ListArgs) {
        this.monitors.setBlockMonitored(args.LIST.id, false);
    }

    getListContents (args: ListArgs, util: BlockUtility) {
        const list = this._list(args, util);

        // Monitors hold Immutable data, so only a new array triggers an update
        if (util.thread.updateMonitor) {
            if (list._monitorUpToDate) return list.value;
            list._monitorUpToDate = true;
            return list.value.slice();
        }

        const allSingleLetters = list.value.every(item => typeof item === 'string' && item.length === 1);
        return list.value.join(allSingleLetters ? '' : ' ');
    }

    addToList (args: ListArgs & {ITEM: ScratchValue}, util: BlockUtility) {
        const list = this._list(args, util);
        if (list.value.length < Scratch3DataBlocks.LIST_ITEM_LIMIT) {
            list.value.push(args.ITEM);
            list._monitorUpToDate = false;
        }
    }

    deleteOfList (args: ListArgs & {INDEX: unknown}, util: BlockUtility) {
        const list = this._list(args, util);
        const index = Cast.toListIndex(args.INDEX, list.value.length, true);
        if (index === Cast.LIST_ALL) {
            list.value = [];
            return;
        }
        // The only other non-number is LIST_INVALID
        if (typeof index !== 'number') return;
        list.value.splice(index - 1, 1);
        list._monitorUpToDate = false;
    }

    deleteAllOfList (args: ListArgs, util: BlockUtility) {
        this._list(args, util).value = [];
    }

    insertAtList (args: ListArgs & {INDEX: unknown, ITEM: ScratchValue}, util: BlockUtility) {
        const list = this._list(args, util);
        const index = Cast.toListIndex(args.INDEX, list.value.length + 1, false);
        // Without acceptAll, the only non-number is LIST_INVALID
        if (typeof index !== 'number' || index > Scratch3DataBlocks.LIST_ITEM_LIMIT) return;
        list.value.splice(index - 1, 0, args.ITEM);
        // Inserting into a full list drops its last item
        if (list.value.length > Scratch3DataBlocks.LIST_ITEM_LIMIT) {
            list.value.pop();
        }
        list._monitorUpToDate = false;
    }

    replaceItemOfList (args: ListArgs & {INDEX: unknown, ITEM: ScratchValue}, util: BlockUtility) {
        const list = this._list(args, util);
        const index = Cast.toListIndex(args.INDEX, list.value.length, false);
        if (typeof index !== 'number') return;
        list.value[index - 1] = args.ITEM;
        list._monitorUpToDate = false;
    }

    getItemOfList (args: ListArgs & {INDEX: unknown}, util: BlockUtility) {
        const list = this._list(args, util);
        const index = Cast.toListIndex(args.INDEX, list.value.length, false);
        if (typeof index !== 'number') return '';
        return list.value[index - 1];
    }

    /** 1-based position of the first item equal by Scratch comparison, so 123 matches '123'; 0 when absent. */
    getItemNumOfList (args: ListArgs & {ITEM: unknown}, util: BlockUtility) {
        const list = this._list(args, util);
        return list.value.findIndex(item => Cast.compare(item, args.ITEM) === 0) + 1;
    }

    lengthOfList (args: ListArgs, util: BlockUtility) {
        return this._list(args, util).value.length;
    }

    listContainsItem (args: ListArgs & {ITEM: unknown}, util: BlockUtility) {
        const list = this._list(args, util);
        return list.value.includes(args.ITEM as ScratchValue) ||
            list.value.some(item => Cast.compare(item, args.ITEM) === 0);
    }
}

export default Scratch3DataBlocks;
