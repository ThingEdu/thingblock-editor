import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom has no matchMedia, which the color mode setting reads on import and the editor follows; this system has no
// media preferences
vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches: false }))

// Testing Library unmounts what a test rendered only when `afterEach` is a global, and Vitest's globals are off
afterEach(cleanup)
