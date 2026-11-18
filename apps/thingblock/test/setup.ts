import { vi } from 'vitest'

// jsdom has no matchMedia, which the color mode setting reads on import; this system has no media preferences
vi.stubGlobal('matchMedia', () => ({ matches: false }))
