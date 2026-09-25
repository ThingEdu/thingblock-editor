import type {Mutation} from './mutation-adapter';

export interface BlockField {
    name: string
    /** Set on variable, list and broadcast fields. */
    id?: string
    value: string | number
    variableType?: string
}

export interface BlockInput {
    name: string
    /** The block plugged in, or the shadow when nothing covers it. */
    block: string | null
    shadow: string | null
}

export interface Block {
    id: string
    opcode: string
    inputs: Record<string, BlockInput>
    fields: Record<string, BlockField>
    next: string | null
    /** Starts a stack on the workspace. */
    topLevel: boolean
    parent: string | null
    /** A default-value slot rather than a real block. */
    shadow: boolean
    /** Workspace position of a top-level block; the XML adapter leaves them as strings. */
    x?: number | string
    y?: number | string
    /** ID of the attached comment. */
    comment?: string
    mutation?: Mutation
    /** Its monitor is shown; set on flyout and monitor blocks. */
    isMonitored?: boolean
    /** The target a sprite-specific monitor reads from; null for global monitors. */
    targetId?: string | null
}

/** How execute passes VARIABLE, LIST and BROADCAST_OPTION fields to primitives. */
export interface VariableArg {
    id: string
    name: string
}
