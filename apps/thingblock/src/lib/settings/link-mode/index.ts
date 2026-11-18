// Device-link backend the VM routes board discovery, connection, and upload through.
// 'link' is the native helper (thingblock-link); 'cloud' is the web/Web Serial backend.
export const LINK_MODE = 'link'
export const CLOUD_MODE = 'cloud'

export type LinkMode = typeof LINK_MODE | typeof CLOUD_MODE

export const DEFAULT_LINK_MODE: LinkMode = LINK_MODE

export const isValidLinkMode = (mode: unknown): mode is LinkMode => mode === LINK_MODE || mode === CLOUD_MODE
