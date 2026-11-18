export const PLATFORM = {
  DESKTOP: 'DESKTOP',
  WEB: 'WEB',
  ANDROID: 'ANDROID',
} as const

export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM]
