import uid from '../util/uid';
import xmlEscape from '../util/xml-escape';

export type ScratchValue = string | number | boolean;

/** Scalar (`''`, for Blockly compatibility), list, or broadcast message. */
export type VariableType = '' | 'list' | 'broadcast_msg';

/** Explicit value type for code generation; `''` infers it from the variable's assignments. */
export type DataType = 'int' | 'float' | 'string' | '';

class Variable {
    static readonly SCALAR_TYPE = '';
    static readonly LIST_TYPE = 'list';
    static readonly BROADCAST_MESSAGE_TYPE = 'broadcast_msg';
    static readonly DATA_TYPES: readonly DataType[] = ['int', 'float', 'string'];

    id: string;
    name: string;
    type: VariableType;
    dataType: DataType;
    /** A list holds an array; a broadcast message holds its name. */
    value: ScratchValue | ScratchValue[];
    /** A list monitor already shows `value`; list blocks clear it when they change the list. */
    _monitorUpToDate?: boolean;

    constructor (id: string | null, name: string, type: VariableType, dataType?: unknown) {
        this.id = id || uid();
        this.name = name;
        this.type = type;
        this.dataType = Variable.normalizeDataType(dataType);
        switch (this.type) {
        case Variable.SCALAR_TYPE:
            this.value = 0;
            break;
        case Variable.LIST_TYPE:
            this.value = [];
            break;
        case Variable.BROADCAST_MESSAGE_TYPE:
            this.value = this.name;
            break;
        default:
            throw new Error(`Invalid variable type: ${this.type}`);
        }
    }

    toXML (isLocal?: boolean): string {
        return `<variable type="${this.type}" id="${this.id}" islocal="${isLocal === true
        }">${xmlEscape(this.name)}</variable>`;
    }

    /** Returns `dataType` if it is a known data type, else `''`; used where projects and callers supply one. */
    static normalizeDataType (dataType: unknown): DataType {
        return Variable.DATA_TYPES.includes(dataType as DataType) ? dataType as DataType : '';
    }
}

export default Variable;
