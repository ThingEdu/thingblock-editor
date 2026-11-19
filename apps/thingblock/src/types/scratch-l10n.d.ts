declare module 'scratch-l10n' {
  export function isRtl(locale: string): boolean
  /** Each supported locale's name, in its own language, by locale code. */
  const locales: Record<string, { name: string }>
  export default locales
}

declare module 'scratch-l10n/locales/editor-msgs' {
  const messages: Record<string, Record<string, string>>
  export default messages
}
