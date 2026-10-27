import type {BlockFunction} from '../engine/runtime';

// Base extension interface for thingblock (scratch) extension.
export interface ExtensionInfo {
    id: string
    name?: string
    blockIconURI?: string
    /** Category menu icon; defaults to `blockIconURI`. */
    menuIconURI?: string
    color1?: string
    color2?: string
    color3?: string
    showStatusButton?: boolean
    blocks?: (BlockInfo | '---')[]
    menus?: Record<string, MenuInfo>
    customFieldTypes?: Record<string, CustomFieldType>
}

export interface BlockInfo {
    /** Absent on buttons. */
    opcode?: string
    blockType: string
    /** One line per block arm; `[NAME]` places argument NAME. */
    text: string | string[]
    arguments?: Record<string, ArgumentInfo>
    /** A button's callback key, or the implementation the extension manager binds for a block. */
    func?: string | BlockFunction
    blockIconURI?: string
    /** No blocks can attach below. */
    isTerminal?: boolean
    /** A hat that runs when its predicate turns true; defaults to true. */
    isEdgeActivated?: boolean
    shouldRestartExistingThreads?: boolean
    /** Substacks of a conditional or loop; defaults to 1. */
    branchCount?: number
    /** Target types (`TargetType`) whose palette shows the block. */
    filter?: string[]
    hideFromPalette?: boolean
    /** A reporter without a monitor checkbox. */
    disableMonitor?: boolean
    /** Saved with the block, so it can rebuild itself from its mutation. */
    isDynamic?: boolean
}

export interface ArgumentInfo {
    type: string
    defaultValue?: string | number | boolean
    menu?: string
    /** Image arguments only. */
    dataURI?: string
    flipRTL?: boolean
}

export type MenuItem = string | {text: string, value: string};

export interface MenuInfo {
    /** Items, or a function listing them when the menu opens; a string names that function on the extension. */
    items: MenuItem[] | string | (() => MenuItem[])
    acceptReporters?: boolean
}

export interface CustomFieldType {
    output: string
    outputShape: number
    implementation: unknown
}

export interface Extension {
    getInfo(): ExtensionInfo
}
