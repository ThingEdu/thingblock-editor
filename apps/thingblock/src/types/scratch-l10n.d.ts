declare module 'scratch-l10n' {
  export function isRtl(locale: string): boolean
}

declare module 'scratch-l10n/locales/editor-msgs' {
  const messages: Record<string, Record<string, string>>
  export default messages
}
