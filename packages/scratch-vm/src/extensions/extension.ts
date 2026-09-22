// Base extension interface for thingblock (scratch) extension.
export interface ExtensionInfo {
    id: string
    name?: string
    blockIconURI?: string
    blocks?: (BlockInfo | '---')[]
    menus?: Record<string, MenuInfo>
}

export interface BlockInfo {
    opcode: string
    blockType: string
    text: string
    arguments?: Record<string, ArgumentInfo>
}

export interface ArgumentInfo {
    type: string
    defaultValue?: string | number | boolean
    menu?: string
}

export interface MenuInfo {
    items: {text: string, value: string}[] | string
    acceptReporters?: boolean
}

export interface Extension {
    getInfo(): ExtensionInfo
}
